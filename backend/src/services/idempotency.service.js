import { getAllRows, appendRow, invalidateCache, deleteRow, SHEET_NAMES } from './sheets.service.js';

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 256;
const KEY_REGEX = /^[a-zA-Z0-9\-_]{1,256}$/;
const inFlightKeys = new Map();

function validateIdempotencyKey(key) {
  if (!key || typeof key !== 'string') throw new Error('Idempotency key is required and must be a string');
  if (key.length > MAX_KEY_LENGTH) throw new Error(`Idempotency key must not exceed ${MAX_KEY_LENGTH} characters`);
  if (!KEY_REGEX.test(key)) throw new Error('Idempotency key contains invalid characters. Use only alphanumeric, hyphen, underscore.');
}

async function readIdempotencyRecords() {
  const records = await getAllRows(SHEET_NAMES.IDEMPOTENCY);
  return Array.isArray(records) ? records : [];
}

export async function checkIdempotency(key) {
  validateIdempotencyKey(key);
  const records = await readIdempotencyRecords();
  const record = records.find(item => item.row?.Key === key);

  if (record) {
    const expiresAt = new Date(record.row.ExpiresAt).getTime();
    if (Number.isFinite(expiresAt) && Date.now() < expiresAt) {
      try {
        return { exists: true, response: JSON.parse(record.row.Response) };
      } catch {
        return { exists: true, response: null };
      }
    }
    await deleteRow(SHEET_NAMES.IDEMPOTENCY, record.rowIndex);
    invalidateCache(SHEET_NAMES.IDEMPOTENCY);
  }

  return { exists: false, response: null };
}

export async function storeIdempotency(key, response) {
  validateIdempotencyKey(key);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL);
  await appendRow(SHEET_NAMES.IDEMPOTENCY, [
    key,
    JSON.stringify(response),
    now.toISOString(),
    expiresAt.toISOString(),
  ]);
  invalidateCache(SHEET_NAMES.IDEMPOTENCY);
}

export async function cleanupExpiredKeys() {
  const records = await readIdempotencyRecords();
  const now = Date.now();
  for (const record of records) {
    const expiresAt = new Date(record.row.ExpiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt < now) {
      await deleteRow(SHEET_NAMES.IDEMPOTENCY, record.rowIndex);
    }
  }
  invalidateCache(SHEET_NAMES.IDEMPOTENCY);
}

/**
 * Google Sheets cannot provide a cross-instance atomic compare-and-swap.
 * This process-local lock closes the common same-instance race window.
 * A multi-instance deployment still needs a shared lock/database for strict
 * distributed idempotency guarantees.
 */
export async function withIdempotencyLock(key, handler) {
  validateIdempotencyKey(key);

  while (inFlightKeys.has(key)) {
    await inFlightKeys.get(key);
  }

  let release;
  const lock = new Promise(resolve => { release = resolve; });
  inFlightKeys.set(key, lock);

  try {
    return await handler();
  } finally {
    if (inFlightKeys.get(key) === lock) inFlightKeys.delete(key);
    release();
  }
}
