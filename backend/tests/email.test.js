import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockProductService = { getProductById: jest.fn() };
const mockGmailService = {
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendFinancialTransactionEmail: jest.fn().mockResolvedValue({ success: true }),
};
const mockSettingsService = { getSetting: jest.fn().mockResolvedValue('https://instapay.example.com') };
const mockSheetsService = {
  appendRow: jest.fn().mockResolvedValue(undefined),
  getNextId: jest.fn().mockResolvedValue('ORD-TEST123'),
  invalidateCache: jest.fn(),
  findRowById: jest.fn(),
  updateRow: jest.fn().mockResolvedValue(undefined),
  deleteRow: jest.fn().mockResolvedValue(undefined),
  getAllRows: jest.fn().mockResolvedValue([]),
  findRows: jest.fn(),
  SHEET_NAMES: {
    PENDING_ORDERS: 'Pending_Orders', ORDER_ITEMS: 'Order_Items', FUND: 'Fund',
    SHIPPING_RATES: 'Shipping_Rates',
  },
};
const mockAuthService = { getUserByUsername: jest.fn(), isFinanceAdmin: jest.fn((user) => user?.isMahrous === true) };
const mockDrive = {
  files: {
    list: jest.fn().mockResolvedValue({ data: { files: [{ id: 'folder-1', name: 'Fund_Transactions' }] } }),
    create: jest.fn().mockResolvedValue({ data: { id: 'file-123' } }),
    get: jest.fn().mockResolvedValue({ data: { id: 'file-123', webViewLink: 'https://drive.google.com/file/d/file-123/view' } }),
  },
  permissions: { create: jest.fn().mockResolvedValue({}) },
};

jest.unstable_mockModule('../src/services/product.service.js', () => mockProductService);
jest.unstable_mockModule('../src/services/shipping.service.js', () => ({ getShippingRate: jest.fn().mockResolvedValue(50) }));
jest.unstable_mockModule('../src/services/gmail.service.js', () => mockGmailService);
jest.unstable_mockModule('../src/services/settings.service.js', () => mockSettingsService);
jest.unstable_mockModule('../src/services/sheets.service.js', () => mockSheetsService);
jest.unstable_mockModule('../src/services/auth.service.js', () => mockAuthService);
jest.unstable_mockModule('argon2', () => ({ default: { argon2id: 2, hash: jest.fn(async (p) => `mock-hash:${p}`), verify: jest.fn(async (h, p) => h === `mock-hash:${p}`) }, argon2id: 2 }));
jest.unstable_mockModule('../src/config/google.js', () => ({ getDriveClient: () => mockDrive }));
jest.unstable_mockModule('../src/config/env.js', () => ({
  env: { google: { driveFolderId: 'root-folder' } },
}));
jest.unstable_mockModule('../src/config/constants.js', () => ({
  DRIVE_FOLDERS: { PRODUCTS: 'Products', PAYMENT_PROOFS: 'Payment_Proofs', FUND_TRANSACTIONS: 'Fund_Transactions', REVIEWS: 'Reviews', OTHER: 'Other' },
  FUND_TYPES: { CAPITAL_FUNDING: 'تمويل رأس مال', RAW_MATERIAL_EXPENSE: 'مصروف خامات' },
  PAYMENT_METHODS: { INSTAPAY: 'أنستا باي', VODAFONE_CASH: 'فودافون كاش', CASH: 'كاش' },
  ORDER_STATUSES: { PENDING: 'Pending' },
  GENDERS: { MALE: 'ذكر', FEMALE: 'أنثى' },
}));

const { createOrder } = await import('../src/services/order.service.js');
const { addFundTransaction } = await import('../src/services/fund.service.js');

describe('Email behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sends exactly one customer confirmation in the selected language', async () => {
    mockProductService.getProductById.mockResolvedValue({
      id: 'PRD-123', name: 'Test Product', sellingPrice: 5000, manufacturingCost: 2000, active: true,
    });
    mockSheetsService.getAllRows.mockImplementation(async (sheet) => {
      if (sheet === 'Shipping_Rates') return [{ row: { Governorate: 'القاهرة', ShippingFee: '50', Active: 'true' } }];
      return [];
    });

    await createOrder({
      customer: { name: 'Test', email: 'customer@example.com', gender: 'male', phone: '01234567890', governorate: 'القاهرة', address: 'Address', locationUrl: '' },
      paymentMethod: 'cash_on_delivery', notes: '', platform: 'website', language: 'en',
      items: [{ productId: 'PRD-123', quantity: 2 }],
    });

    expect(mockGmailService.sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(mockGmailService.sendOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'ORD-TEST123' }), 'customer@example.com', 'en'
    );
  });

  test('defaults missing language to Arabic', async () => {
    mockProductService.getProductById.mockResolvedValue({ id: 'PRD-789', name: 'Test', sellingPrice: 1000, manufacturingCost: 500, active: true });
    mockSheetsService.getAllRows.mockImplementation(async (sheet) => {
      if (sheet === 'Shipping_Rates') return [{ row: { Governorate: 'القاهرة', ShippingFee: '50', Active: 'true' } }];
      return [];
    });

    await createOrder({
      customer: { name: 'Test', email: 'customer@example.com', gender: 'male', phone: '01234567890', governorate: 'القاهرة', address: 'Address', locationUrl: '' },
      paymentMethod: 'cash_on_delivery', notes: '', platform: 'website', items: [{ productId: 'PRD-789', quantity: 1 }],
    });

    expect(mockGmailService.sendOrderConfirmationEmail).toHaveBeenCalledWith(expect.any(Object), 'customer@example.com', 'ar');
  });

  test('looks up financial email recipient from Users by username', async () => {
    mockAuthService.getUserByUsername.mockResolvedValue({ row: { Username: 'Mazen', Email: 'mazen@example.com' } });
    mockSheetsService.getAllRows.mockResolvedValue([]);
    mockSheetsService.getNextId.mockResolvedValue('FND-1');

    await addFundTransaction({
      name: 'Mazen', type: 'تمويل رأس مال', amount: 1000, details: 'Test funding', paymentMethod: 'كاش',
    }, { username: 'Mahrous', isMahrous: true });

    expect(mockAuthService.getUserByUsername).toHaveBeenCalledWith('Mazen');
    expect(mockGmailService.sendFinancialTransactionEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'FND-1', name: 'Mazen' }), 'mazen@example.com', 'ar'
    );
  });

  test('keeps the transaction when the email fails', async () => {
    mockAuthService.getUserByUsername.mockResolvedValue({ row: { Email: 'mazen@example.com' } });
    mockGmailService.sendFinancialTransactionEmail.mockRejectedValueOnce(new Error('Email failed'));

    await expect(addFundTransaction({
      name: 'Mazen', type: 'تمويل رأس مال', amount: 1000, details: 'Test funding', paymentMethod: 'كاش',
    }, { username: 'Mahrous', isMahrous: true })).resolves.toEqual({ success: true, id: expect.any(String) });

    expect(mockSheetsService.appendRow).toHaveBeenCalledWith('Fund', expect.any(Array));
  });
});
