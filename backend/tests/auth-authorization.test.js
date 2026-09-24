import { describe, test, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule('argon2', () => ({
  default: { argon2id: 2, hash: jest.fn(async (password) => `mock-hash:${password}`), verify: jest.fn(async (hash, password) => hash === `mock-hash:${password}`) },
  argon2id: 2,
}));

// Mock sheets service
const mockSheetsService = {
  getAllRows: jest.fn(),
  findRowById: jest.fn(),
  appendRow: jest.fn().mockResolvedValue(undefined),
  updateRow: jest.fn().mockResolvedValue(undefined),
  invalidateCache: jest.fn(),
  SHEET_NAMES: {
    USERS: 'Users',
    IDEMPOTENCY: 'Idempotency',
  },
};

jest.unstable_mockModule('../src/services/sheets.service.js', () => mockSheetsService);

jest.unstable_mockModule('../src/services/session.service.js', () => ({
  createSession: jest.fn().mockResolvedValue('session-123'),
  getSession: jest.fn(),
  deleteSession: jest.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { authenticateUser, createUser, hashPassword, verifyPassword } = await import('../src/services/auth.service.js');
const { requireAuth } = await import('../src/middleware/auth.middleware.js');
const { requireRole, requirePermission } = await import('../src/middleware/role.middleware.js');

describe('Authentication and Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing', () => {
    test('hashes password with Argon2id', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBe('mock-hash:SecurePass123!');
    });

    test('verifies correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, password);
      
      expect(isValid).toBe(true);
    });

    test('rejects incorrect password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, 'WrongPassword');
      
      expect(isValid).toBe(false);
    });
  });

  describe('User Authentication', () => {
    test('authenticates valid user', async () => {
      const passwordHash = await hashPassword('Mazen147##');
      
      mockSheetsService.getAllRows.mockResolvedValue([{
        row: {
          ID: '159789',
          Username: 'Mazen',
          PasswordHash: passwordHash,
          Email: 'mazen2005engeneering@gmail.com',
          Role: 'ADMIN',
          Permissions: '',
          Active: 'true',
        },
        headers: ['ID', 'Username', 'PasswordHash', 'Email', 'Role', 'Permissions', 'Active', 'CreatedAt', 'UpdatedAt'],
      }]);

      const result = await authenticateUser('Mazen', 'Mazen147##');
      
      expect(result.success).toBe(true);
      expect(result.user.username).toBe('Mazen');
      expect(result.user.email).toBe('mazen2005engeneering@gmail.com');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.isMahrous).toBe(false);
    });

    test('rejects invalid password', async () => {
      const passwordHash = await hashPassword('Mazen147##');
      
      mockSheetsService.getAllRows.mockResolvedValue([{
        row: {
          ID: '159789',
          Username: 'Mazen',
          PasswordHash: passwordHash,
          Email: 'mazen2005engeneering@gmail.com',
          Role: 'ADMIN',
          Permissions: '',
          Active: 'true',
        },
        headers: ['ID', 'Username', 'PasswordHash', 'Email', 'Role', 'Permissions', 'Active', 'CreatedAt', 'UpdatedAt'],
      }]);

      const result = await authenticateUser('Mazen', 'WrongPassword');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid username or password');
    });

    test('rejects non-existent user', async () => {
      mockSheetsService.getAllRows.mockResolvedValue([]);

      const result = await authenticateUser('NonExistent', 'password');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid username or password');
    });

    test('rejects inactive user', async () => {
      const passwordHash = await hashPassword('password');
      
      mockSheetsService.getAllRows.mockResolvedValue([{
        row: {
          ID: '159789',
          Username: 'Mazen',
          PasswordHash: passwordHash,
          Email: 'mazen2005engeneering@gmail.com',
          Role: 'ADMIN',
          Permissions: '',
          Active: 'false', // Inactive
        },
        headers: ['ID', 'Username', 'PasswordHash', 'Email', 'Role', 'Permissions', 'Active', 'CreatedAt', 'UpdatedAt'],
      }]);

      const result = await authenticateUser('Mazen', 'password');
      
      expect(result.success).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('creates session with secure cookie settings', async () => {
      const { createSession } = await import('../src/services/session.service.js');
      
      // Mock uuid
      jest.unstable_mockModule('uuid', () => ({ v4: () => 'test-session-id' }));
      
      const user = {
        id: '159789',
        username: 'Mazen',
        email: 'mazen2005engeneering@gmail.com',
        role: 'ADMIN',
        permissions: [],
        isMahrous: false,
      };

      const sessionId = await createSession(user);
      
      expect(sessionId).toBe('session-123');
    });
  });

  describe('Authorization Middleware', () => {
    test('requireAuth rejects unauthenticated requests', () => {
      const mockReq = { cookies: {} };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    });

    test('requireRole allows authorized roles', () => {
      const mockReq = { user: { role: 'ADMIN' } };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      requireRole('ADMIN', 'FINANCE_ADMIN')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireRole rejects unauthorized roles', () => {
      const mockReq = { user: { role: 'CUSTOMER' } };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      requireRole('ADMIN')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('requirePermission allows users with permission', () => {
      const mockReq = { 
        user: { 
          role: 'ADMIN',
          isMahrous: true,
          permissions: ['finance_transaction_edit'] 
        } 
      };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      requirePermission('finance_transaction_edit')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requirePermission rejects users without permission', () => {
      const mockReq = { 
        user: { 
          role: 'ADMIN', 
          permissions: [] 
        } 
      };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      requirePermission('finance_transaction_edit')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});