import { describe, test, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('argon2', () => ({
  default: { argon2id: 2, hash: jest.fn(async (password) => `mock-hash:${password}`), verify: jest.fn(async (hash, password) => hash === `mock-hash:${password}`) },
  argon2id: 2,
}));

const mockSheetsService = {
  getAllRows: jest.fn().mockResolvedValue([]),
  appendRow: jest.fn().mockResolvedValue(undefined),
  findRowById: jest.fn(),
  getNextId: jest.fn().mockResolvedValue('FND-TEST'),
  updateRow: jest.fn().mockResolvedValue(undefined),
  invalidateCache: jest.fn(),
  SHEET_NAMES: { FUND: 'Fund' },
};

jest.unstable_mockModule('../src/services/sheets.service.js', () => mockSheetsService);
jest.unstable_mockModule('../src/services/gmail.service.js', () => ({
  sendFinancialTransactionEmail: jest.fn().mockResolvedValue({ success: true }),
}));
const { isFinanceAdmin } = await import('../src/services/auth.service.js');
const { requireFinanceAdmin } = await import('../src/middleware/role.middleware.js');
const { updateFundTransaction } = await import('../src/services/fund.service.js');

describe('Mahrous-Only Financial Editing', () => {
  beforeEach(() => jest.clearAllMocks());

  test('isFinanceAdmin returns true only for Mahrous', () => {
    expect(isFinanceAdmin({ isMahrous: true, role: 'ADMIN' })).toBe(true);
    expect(isFinanceAdmin({ isMahrous: false, role: 'ADMIN' })).toBe(false);
    expect(isFinanceAdmin({ isMahrous: false, role: 'FINANCE_ADMIN', permissions: ['finance_transaction_edit'] })).toBe(false);
  });

  test('updateFundTransaction allows Mahrous', async () => {
    mockSheetsService.findRowById.mockResolvedValue({
      row: {
        ID: 'FND-123', Name: 'Mahrous', Type: 'تمويل رأس مال', Amount: '1000',
        Details: 'Test', PaymentMethod: 'كاش', ImageURL: '', AddedBy: 'Mahrous',
        CreatedAt: '2026-01-01', UpdatedAt: '2026-01-01',
      },
      headers: ['ID', 'Name', 'Type', 'Amount', 'Details', 'PaymentMethod', 'ImageURL', 'AddedBy', 'CreatedAt', 'UpdatedAt'],
      rowIndex: 2,
    });

    await expect(updateFundTransaction('FND-123', {
      type: 'مصروف خامات', amount: 500, details: 'Updated', paymentMethod: 'أنستا باي',
    }, { isMahrous: true, username: 'Mahrous' })).resolves.toEqual({ success: true });

    expect(mockSheetsService.updateRow).toHaveBeenCalled();
  });

  test.each([
    [{ isMahrous: false, role: 'ADMIN' }, 'normal admin'],
    [{ isMahrous: false, role: 'FINANCE_ADMIN', permissions: ['finance_transaction_edit'] }, 'finance role without Mahrous identity'],
  ])('updateFundTransaction rejects %s', async (user) => {
    await expect(updateFundTransaction('FND-123', { amount: 500 }, user))
      .rejects.toThrow('Only Mahrous can edit financial transactions');
  });

  test('requireFinanceAdmin rejects non-Mahrous', () => {
    const req = { user: { isMahrous: false, role: 'ADMIN' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireFinanceAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('requireFinanceAdmin allows Mahrous', () => {
    const req = { user: { isMahrous: true, role: 'ADMIN' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireFinanceAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
