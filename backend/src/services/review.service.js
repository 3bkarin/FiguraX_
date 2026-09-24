import crypto from 'crypto';
import { getAllRows, appendRow, updateRow, findRowById, invalidateCache, getNextId, SHEET_NAMES } from './sheets.service.js';
import { uploadFile } from './drive.service.js';
import { env } from '../config/env.js';

const REVIEW_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signReviewPayload(payload) {
  return crypto
    .createHmac('sha256', env.sessionSecret)
    .update(payload)
    .digest('base64url');
}

export function createReviewToken(orderId, customerEmail, expiresAt = Date.now() + REVIEW_TOKEN_TTL_MS) {
  const payload = JSON.stringify({
    orderId: String(orderId || '').trim(),
    email: String(customerEmail || '').trim().toLowerCase(),
    exp: Number(expiresAt),
  });

  const encoded = base64UrlEncode(payload);
  return `${encoded}.${signReviewPayload(encoded)}`;
}

export function buildReviewUrl(orderId, customerEmail) {
  const configuredOrigin = env.reviewFrontendOrigin || (env.nodeEnv === 'production' ? env.productionFrontendOrigin : env.frontendOrigin) || 'http://127.0.0.1:8080';
  const base = String(configuredOrigin).replace(/\/$/, '');
  const token = createReviewToken(orderId, customerEmail);
  return `${base}/review.html?token=${encodeURIComponent(token)}`;
}

function verifyReviewToken(token) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) throw new Error('Invalid review link');

  const expected = signReviewPayload(encoded);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error('Invalid review link');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    throw new Error('Invalid review link');
  }

  if (!payload.orderId || !payload.email || !Number.isFinite(Number(payload.exp)) || Date.now() > Number(payload.exp)) {
    throw new Error('Review link has expired');
  }

  return payload;
}

async function getReviewRows(forceRefresh = false) {
  const records = await getAllRows(SHEET_NAMES.REVIEWS, forceRefresh);
  return Array.isArray(records) ? records : [];
}

export async function getReviews(approvedOnly = true) {
  const records = await getReviewRows();
  let reviews = records.map(record => record.row)
    .filter(r => r.ID)
    .map(r => ({
      id: r.ID,
      date: r.Date,
      customerName: r.CustomerName,
      customerEmail: r.CustomerEmail || '',
      orderId: r.OrderID || '',
      productNames: r.ProductNames || '',
      rating: parseInt(r.Rating, 10) || 5,
      contentType: r.ContentType || 'text',
      content: r.Content,
      addedBy: r.AddedBy,
      source: r.Source || 'admin',
      approved: r.Approved !== 'false',
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    }));

  if (approvedOnly) reviews = reviews.filter(r => r.approved);
  return reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function addReview(reviewData, adminUser) {
  const {
    customerName,
    customerEmail = '',
    orderId = '',
    productNames = '',
    rating,
    contentType = 'text',
    textContent = '',
    base64Image,
    fileName,
    source = 'admin',
  } = reviewData;

  let content = textContent;
  if (contentType === 'image' && base64Image) {
    content = await uploadFile(base64Image, fileName, 'REVIEWS');
  }

  const id = await getNextId('REV');
  const now = new Date().toISOString();

  await appendRow(SHEET_NAMES.REVIEWS, [
    id,
    now,
    customerName,
    rating,
    contentType,
    content,
    adminUser?.username || 'admin',
    'true',
    now,
    now,
    customerEmail,
    orderId,
    productNames,
    source,
  ]);

  invalidateCache(SHEET_NAMES.REVIEWS);
  return { success: true, id };
}

export async function updateReview(reviewId, updates) {
  const review = await findRowById(SHEET_NAMES.REVIEWS, 'ID', reviewId);
  if (!review) throw new Error('Review not found');

  const headers = review.headers;
  const newRow = [...Object.values(review.row)];
  const set = (key, value) => {
    const index = headers.indexOf(key);
    if (index >= 0) newRow[index] = value;
  };

  if (updates.customerName !== undefined) set('CustomerName', updates.customerName);
  if (updates.customerEmail !== undefined) set('CustomerEmail', updates.customerEmail);
  if (updates.orderId !== undefined) set('OrderID', updates.orderId);
  if (updates.productNames !== undefined) set('ProductNames', updates.productNames);
  if (updates.rating !== undefined) set('Rating', updates.rating);
  if (updates.contentType !== undefined) set('ContentType', updates.contentType);
  if (updates.content !== undefined) set('Content', updates.content);
  if (updates.source !== undefined) set('Source', updates.source);
  if (updates.approved !== undefined) set('Approved', updates.approved ? 'true' : 'false');
  set('UpdatedAt', new Date().toISOString());

  await updateRow(SHEET_NAMES.REVIEWS, review.rowIndex, newRow);
  invalidateCache(SHEET_NAMES.REVIEWS);
  return { success: true };
}

export async function deleteReview(reviewId) {
  const review = await findRowById(SHEET_NAMES.REVIEWS, 'ID', reviewId);
  if (!review) throw new Error('Review not found');

  const headers = review.headers;
  const newRow = [...Object.values(review.row)];
  const approvedIndex = headers.indexOf('Approved');
  const updatedIndex = headers.indexOf('UpdatedAt');
  if (approvedIndex >= 0) newRow[approvedIndex] = 'false';
  if (updatedIndex >= 0) newRow[updatedIndex] = new Date().toISOString();

  await updateRow(SHEET_NAMES.REVIEWS, review.rowIndex, newRow);
  invalidateCache(SHEET_NAMES.REVIEWS);
  return { success: true };
}

export async function getReviewRequest(token) {
  const payload = verifyReviewToken(token);
  const order = await findRowById(SHEET_NAMES.PENDING_ORDERS, 'OrderID', payload.orderId);

  if (!order) throw new Error('Order not found');
  if (String(order.row.Status || '').toLowerCase() !== 'delivered') {
    throw new Error('This review link is available after delivery');
  }
  if (String(order.row.CustomerEmail || '').trim().toLowerCase() !== payload.email) {
    throw new Error('Invalid review link');
  }

  const itemRecords = await getAllRows(SHEET_NAMES.ORDER_ITEMS, true);
  const items = (Array.isArray(itemRecords) ? itemRecords : [])
    .map(entry => entry.row)
    .filter(row => String(row.OrderID || '').trim() === payload.orderId)
    .map(row => ({
      productId: row.ProductID,
      name: row.ProductNameSnapshot,
      quantity: Number(row.Quantity) || 1,
    }));

  const reviews = await getReviewRows(true);
  const existing = reviews.some(record =>
    String(record.row?.OrderID || '').trim() === payload.orderId &&
    String(record.row?.CustomerEmail || '').trim().toLowerCase() === payload.email
  );

  return {
    orderId: payload.orderId,
    customerName: order.row.CustomerName || '',
    customerEmail: order.row.CustomerEmail || '',
    items,
    alreadySubmitted: existing,
  };
}

export async function submitCustomerReview(token, reviewData) {
  const request = await getReviewRequest(token);
  if (request.alreadySubmitted) throw new Error('Review already submitted');

  const rating = Number(reviewData.rating);
  const content = String(reviewData.content || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
  if (content.length < 3 || content.length > 2000) throw new Error('Review text must be between 3 and 2000 characters');

  const id = await getNextId('REV');
  const now = new Date().toISOString();
  const productNames = request.items.map(item => item.name).filter(Boolean).join(', ');

  await appendRow(SHEET_NAMES.REVIEWS, [
    id,
    now,
    request.customerName,
    rating,
    'text',
    content,
    'customer',
    'true',
    now,
    now,
    request.customerEmail,
    request.orderId,
    productNames,
    'customer',
  ]);

  invalidateCache(SHEET_NAMES.REVIEWS);
  return { success: true, id, orderId: request.orderId };
}
