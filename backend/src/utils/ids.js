import { ID_PREFIXES } from '../config/constants.js';
import { randomUUID } from 'crypto';

export function generateId(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const uuidPart = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `${prefix}-${timestamp}-${uuidPart}`;
}

export function generateOrderId() {
  return generateId(ID_PREFIXES.ORDER);
}

export function generateProductId() {
  return generateId(ID_PREFIXES.PRODUCT);
}

export function generateCategoryId() {
  return generateId(ID_PREFIXES.CATEGORY);
}

export function generateFundId() {
  return generateId(ID_PREFIXES.FUND);
}

export function generateReviewId() {
  return generateId(ID_PREFIXES.REVIEW);
}

export function generateUserId() {
  return generateId(ID_PREFIXES.USER);
}