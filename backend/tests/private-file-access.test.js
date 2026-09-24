import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockDrive = {
  files: {
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
  },
  permissions: {
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../src/config/google.js', () => ({
  getDriveClient: () => mockDrive,
}));

jest.unstable_mockModule('../src/config/env.js', () => ({
  env: {
    google: {
      driveFolderId: 'root-folder',
    },
  },
}));

jest.unstable_mockModule('../src/config/constants.js', () => ({
  DRIVE_FOLDERS: {
    PRODUCTS: 'Products',
    PAYMENT_PROOFS: 'Payment_Proofs',
    FUND_TRANSACTIONS: 'Fund_Transactions',
    REVIEWS: 'Reviews',
    OTHER: 'Other',
  },
}));

const { downloadPrivateFile } = await import(
  '../src/services/drive.service.js'
);

describe('Private Drive File Access Authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects unauthenticated user', async () => {
    await expect(
      downloadPrivateFile('file-123', null)
    ).rejects.toThrow('Authentication required');
  });

  test('rejects customer/normal public user', async () => {
    await expect(
      downloadPrivateFile('file-123', {
        role: 'CUSTOMER',
      })
    ).rejects.toThrow('Forbidden');
  });

  test('rejects malformed file ID', async () => {
    await expect(
      downloadPrivateFile('bad/id', {
        role: 'ADMIN',
        permissions: ['private_file_access'],
      })
    ).rejects.toThrow('Invalid file ID');

    await expect(
      downloadPrivateFile('', {
        role: 'ADMIN',
        permissions: ['private_file_access'],
      })
    ).rejects.toThrow('Invalid file ID');
  });

  test('allows authorized admin only when file belongs to a private folder', async () => {
    mockDrive.files.list.mockResolvedValue({
      data: {
        files: [
          {
            id: 'private-folder',
            name: 'Payment_Proofs',
          },
        ],
      },
    });

    mockDrive.files.get
      .mockResolvedValueOnce({
        data: {
          id: 'file-123',
          name: 'test.png',
          mimeType: 'image/png',
          size: '10',
          parents: ['private-folder'],
        },
      })
      .mockResolvedValueOnce({
        data: Buffer.from('file-content'),
      });

    await expect(
      downloadPrivateFile('file-123', {
        role: 'ADMIN',
        permissions: ['private_file_access'],
      })
    ).resolves.toEqual({
      data: Buffer.from('file-content'),
      mimeType: 'image/png',
      fileName: 'test.png',
    });
  });

  test('rejects authenticated admin for a public/non-private file', async () => {
    mockDrive.files.list.mockResolvedValue({
      data: {
        files: [],
      },
    });

    mockDrive.files.get.mockResolvedValueOnce({
      data: {
        id: 'file-123',
        name: 'public.png',
        mimeType: 'image/png',
        parents: ['public-folder'],
      },
    });

    await expect(
      downloadPrivateFile('file-123', {
        role: 'ADMIN',
        permissions: ['private_file_access'],
      })
    ).rejects.toThrow('Forbidden');
  });

  test('handles file not found', async () => {
    mockDrive.files.get.mockRejectedValueOnce(
      new Error('File not found')
    );

    await expect(
      downloadPrivateFile('file-123', {
        role: 'ADMIN',
        permissions: ['private_file_access'],
      })
    ).rejects.toThrow('File not found');
  });
});