import { describe, test, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule('argon2', () => ({
  default: {
    argon2id: 2,
    hash: jest.fn(async (p) => `mock-hash:${p}`),
    verify: jest.fn(async (h, p) => h === `mock-hash:${p}`)
  },
  argon2id: 2
}));

// Mock the dependencies
const mockProductService = {
  getProductById: jest.fn(),
};

jest.unstable_mockModule(
  '../src/services/product.service.js',
  () => mockProductService
);

jest.unstable_mockModule('../src/services/shipping.service.js', () => ({
  getShippingRate: jest.fn().mockResolvedValue(50),
}));

jest.unstable_mockModule('../src/services/gmail.service.js', () => ({
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendFinancialTransactionEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule('../src/services/settings.service.js', () => ({
  getSetting: jest.fn().mockResolvedValue('https://instapay.example.com'),
}));

const mockSheetsService = {
  appendRow: jest.fn().mockResolvedValue(undefined),
  getNextId: jest.fn().mockResolvedValue('ORD-TEST123'),
  invalidateCache: jest.fn(),
  findRowById: jest.fn(),
  findRows: jest.fn(),
  updateRow: jest.fn().mockResolvedValue(undefined),
  getAllRows: jest.fn(),
  deleteRow: jest.fn().mockResolvedValue(undefined),

  SHEET_NAMES: {
    PENDING_ORDERS: 'Pending_Orders',
    ORDER_ITEMS: 'Order_Items',
    SHIPPING_RATES: 'Shipping_Rates',
  },
};

jest.unstable_mockModule(
  '../src/services/sheets.service.js',
  () => mockSheetsService
);

// Import after mocks
const { createOrder } = await import('../src/services/order.service.js');
const { getProductById } = await import(
  '../src/services/product.service.js'
);

describe('Order Security - Price Tampering Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSheetsService.getNextId.mockResolvedValue('ORD-TEST123');
    mockSheetsService.appendRow.mockResolvedValue(undefined);
  });

  test(
    'createOrder ignores client-supplied unitPrice and uses server-side product price',
    async () => {
      mockProductService.getProductById.mockResolvedValue({
        id: 'PRD-123',
        name: 'Test Product',
        sellingPrice: 5000,
        manufacturingCost: 2000,
        active: true,
      });

      mockSheetsService.getAllRows.mockResolvedValue([
        {
          row: {
            Governorate: 'القاهرة',
            ShippingFee: '50',
            Active: 'true',
          },
        },
      ]);

      const orderData = {
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          gender: 'male',
          phone: '01234567890',
          governorate: 'القاهرة',
          address: 'Test Address',
          locationUrl: 'https://maps.google.com/test',
        },
        paymentMethod: 'cash_on_delivery',
        notes: '',
        platform: 'website',
        items: [
          {
            productId: 'PRD-123',
            quantity: 2,

            // Malicious client-supplied values
            // These must be ignored by the server.
            unitPrice: 0.01,
            sellingPrice: 0.01,
            manufacturingCost: 0,
            lineTotal: 0.02,
          },
        ],
        language: 'ar',
      };

      const result = await createOrder(orderData);

      expect(result.subtotal).toBe(10000);
      expect(result.shipping).toBe(50);
      expect(result.total).toBe(10050);

      expect(getProductById).toHaveBeenCalledWith('PRD-123');
    }
  );

  test(
    'createOrder ignores client-supplied manufacturingCost',
    async () => {
      mockProductService.getProductById.mockResolvedValue({
        id: 'PRD-456',
        name: 'Test Product 2',
        sellingPrice: 3000,
        manufacturingCost: 1500,
        active: true,
      });

      mockSheetsService.getAllRows.mockResolvedValue([
        {
          row: {
            Governorate: 'الجيزة',
            ShippingFee: '50',
            Active: 'true',
          },
        },
      ]);

      const orderData = {
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          gender: 'female',
          phone: '01234567891',
          governorate: 'الجيزة',
          address: 'Test Address 2',
          locationUrl: '',
        },
        paymentMethod: 'instapay',
        notes: '',
        platform: 'website',
        items: [
          {
            productId: 'PRD-456',
            quantity: 1,

            // Malicious client-supplied values
            manufacturingCost: 0,
            unitPrice: 0.01,
            lineTotal: 0.01,
          },
        ],
        language: 'en',
      };

      const result = await createOrder(orderData);

      // Shipping must come from the server.
      expect(result.shipping).toBe(50);

      // The order must be created successfully.
      expect(result.orderId).toBe('ORD-TEST123');

      // Verify the real product was used.
      expect(getProductById).toHaveBeenCalledWith('PRD-456');

      // Verify the server-side product price/cost are used.
      expect(mockSheetsService.appendRow).toHaveBeenCalled();
    }
  );

  test('createOrder rejects invalid product IDs', async () => {
    mockProductService.getProductById.mockResolvedValue(null);

    const orderData = {
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        gender: 'male',
        phone: '01234567890',
        governorate: 'القاهرة',
        address: 'Test Address',
        locationUrl: '',
      },
      paymentMethod: 'cash_on_delivery',
      notes: '',
      platform: 'website',
      items: [
        {
          productId: 'INVALID-ID',
          quantity: 1,
        },
      ],
      language: 'ar',
    };

    await expect(createOrder(orderData)).rejects.toThrow(
      'Product not found: INVALID-ID'
    );
  });

  test('createOrder rejects inactive products', async () => {
    mockProductService.getProductById.mockResolvedValue({
      id: 'PRD-789',
      name: 'Inactive Product',
      sellingPrice: 1000,
      manufacturingCost: 500,
      active: false,
    });

    mockSheetsService.getAllRows.mockResolvedValue([
      {
        row: {
          Governorate: 'القاهرة',
          ShippingFee: '50',
          Active: 'true',
        },
      },
    ]);

    const orderData = {
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        gender: 'male',
        phone: '01234567890',
        governorate: 'القاهرة',
        address: 'Test Address',
        locationUrl: '',
      },
      paymentMethod: 'cash_on_delivery',
      notes: '',
      platform: 'website',
      items: [
        {
          productId: 'PRD-789',
          quantity: 1,
        },
      ],
      language: 'ar',
    };

    await expect(createOrder(orderData)).rejects.toThrow(
      'Product not available: Inactive Product'
    );
  });
});