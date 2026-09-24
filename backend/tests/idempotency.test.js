import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockSheetsService = {
  getAllRows: jest.fn(),
  appendRow: jest.fn().mockResolvedValue(undefined),
  deleteRow: jest.fn().mockResolvedValue(undefined),
  invalidateCache: jest.fn(),
  SHEET_NAMES: { IDEMPOTENCY: 'Idempotency' },
};

jest.unstable_mockModule('../src/services/sheets.service.js', () => mockSheetsService);
const { checkIdempotency, storeIdempotency, cleanupExpiredKeys, withIdempotencyLock } = await import('../src/services/idempotency.service.js');

describe('Idempotency Behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns existing response for valid key', async () => {
    mockSheetsService.getAllRows.mockResolvedValue([{
      rowIndex: 2,
      row: { Key: 'test-key-123', Response: JSON.stringify({ success: true, data: { orderId: 'ORD-123' } }), ExpiresAt: new Date(Date.now() + 3600000).toISOString() },
    }]);
    const result = await checkIdempotency('test-key-123');
    expect(result.exists).toBe(true);
    expect(result.response.data.orderId).toBe('ORD-123');
  });

  test('removes expired key and returns false', async () => {
    mockSheetsService.getAllRows.mockResolvedValue([{
      rowIndex: 7,
      row: { Key: 'expired-key', Response: JSON.stringify({ success: true }), ExpiresAt: new Date(Date.now() - 3600000).toISOString() },
    }]);
    const result = await checkIdempotency('expired-key');
    expect(result.exists).toBe(false);
    expect(mockSheetsService.deleteRow).toHaveBeenCalledWith('Idempotency', 7);
  });

  test('returns false for non-existent key', async () => {
    mockSheetsService.getAllRows.mockResolvedValue([]);
    expect((await checkIdempotency('non-existent-key')).exists).toBe(false);
  });

  test('stores key with expiration', async () => {
    await storeIdempotency('new-key-123', { success: true, data: { orderId: 'ORD-123' } });
    expect(mockSheetsService.appendRow).toHaveBeenCalledWith('Idempotency', expect.arrayContaining([
      'new-key-123', expect.any(String), expect.any(String), expect.any(String),
    ]));
  });

  test('validates key format', async () => {
    await expect(checkIdempotency('')).rejects.toThrow('Idempotency key is required');
    await expect(checkIdempotency('a'.repeat(300))).rejects.toThrow('Idempotency key must not exceed 256 characters');
    await expect(checkIdempotency('invalid@key!')).rejects.toThrow('Idempotency key contains invalid characters');
  });

  test('cleanupExpiredKeys removes expired entries using real row indices', async () => {
    mockSheetsService.getAllRows.mockResolvedValue([
      { rowIndex: 2, row: { Key: 'valid', ExpiresAt: new Date(Date.now() + 3600000).toISOString() } },
      { rowIndex: 3, row: { Key: 'expired-1', ExpiresAt: new Date(Date.now() - 3600000).toISOString() } },
      { rowIndex: 4, row: { Key: 'expired-2', ExpiresAt: new Date(Date.now() - 7200000).toISOString() } },
    ]);
    await cleanupExpiredKeys();
    expect(mockSheetsService.deleteRow).toHaveBeenCalledTimes(2);
    expect(mockSheetsService.deleteRow).toHaveBeenCalledWith('Idempotency', 3);
    expect(mockSheetsService.deleteRow).toHaveBeenCalledWith('Idempotency', 4);
  });

  test('process-local lock serializes concurrent work for the same key', async () => {
    const events = [];
    const first = withIdempotencyLock('same-key', async () => {
      events.push('first-start');
      await new Promise(r => setTimeout(r, 25));
      events.push('first-end');
    });
    const second = withIdempotencyLock('same-key', async () => events.push('second'));
    await Promise.all([first, second]);
    expect(events).toEqual(['first-start', 'first-end', 'second']);
  });
});
