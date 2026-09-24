import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockDrive = {
  files: {
    create: jest.fn().mockResolvedValue({ data: { id: 'file-123' } }),
    get: jest.fn().mockResolvedValue({ data: { id: 'file-123', webViewLink: 'https://drive.google.com/file/d/file-123/view' } }),
    list: jest.fn().mockResolvedValue({ data: { files: [{ id: 'folder-123', name: 'Products' }] } }),
  },
  permissions: { create: jest.fn().mockResolvedValue({}) },
};

jest.unstable_mockModule('../src/config/google.js', () => ({ getDriveClient: () => mockDrive }));
jest.unstable_mockModule('../src/config/env.js', () => ({ env: { google: { driveFolderId: 'root-folder' } } }));
jest.unstable_mockModule('../src/config/constants.js', () => ({
  DRIVE_FOLDERS: { PRODUCTS: 'Products', PAYMENT_PROOFS: 'Payment_Proofs', FUND_TRANSACTIONS: 'Fund_Transactions', REVIEWS: 'Reviews', OTHER: 'Other' },
}));

const { uploadFile, validateUpload } = await import('../src/services/drive.service.js');

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const gif = Buffer.from('GIF89a');
const webp = Buffer.from('RIFFxxxxWEBP');

function dataUrl(mime, buffer) { return `data:${mime};base64,${buffer.toString('base64')}`; }

describe('Upload Security Validation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('accepts valid JPEG image signature', () => expect(validateUpload('test.jpg', 'image/jpeg', jpeg)).toBe('test.jpg'));
  test('accepts valid PNG image signature', () => expect(validateUpload('test.png', 'image/png', png)).toBe('test.png'));
  test('accepts valid WebP image signature', () => expect(validateUpload('test.webp', 'image/webp', webp)).toBe('test.webp'));
  test('accepts valid GIF image signature', () => expect(validateUpload('test.gif', 'image/gif', gif)).toBe('test.gif'));
  test('rejects unsupported MIME type', () => expect(() => validateUpload('test.pdf', 'application/pdf', jpeg)).toThrow('Invalid file type: application/pdf'));
  test('rejects unsupported extension', () => expect(() => validateUpload('test.exe', 'image/jpeg', jpeg)).toThrow('Invalid file extension: exe'));
  test('rejects MIME/content mismatch', () => expect(() => validateUpload('test.jpg', 'image/jpeg', png)).toThrow('File content does not match MIME type'));
  test('rejects oversized files', () => expect(() => validateUpload('test.jpg', 'image/jpeg', Buffer.concat([jpeg, Buffer.alloc(11 * 1024 * 1024)]))).toThrow('File size exceeds maximum allowed size of 10 MB'));
  test('sanitizes suspicious filenames', () => expect(validateUpload('../../../etc/passwd.jpg', 'image/jpeg', jpeg)).toBe('______etc_passwd.jpg'));
  test('rejects files without extension', () => expect(() => validateUpload('test', 'image/jpeg', jpeg)).toThrow('Invalid file extension: test'));

  test('uploads valid image to public folder', async () => {
    const result = await uploadFile(dataUrl('image/jpeg', jpeg), 'test.jpg', 'PRODUCTS');
    expect(result).toContain('https://drive.google.com');
    expect(mockDrive.files.create).toHaveBeenCalledWith(expect.objectContaining({ media: expect.objectContaining({ mimeType: 'image/jpeg' }) }));
    expect(mockDrive.permissions.create).toHaveBeenCalledWith(expect.objectContaining({ requestBody: { role: 'reader', type: 'anyone' } }));
  });

  test('uploads valid image to private folder without public permission', async () => {
    mockDrive.files.list.mockResolvedValue({ data: { files: [{ id: 'private-folder', name: 'Payment_Proofs' }] } });
    const result = await uploadFile(dataUrl('image/png', png), 'test.png', 'PAYMENT_PROOFS');
    expect(result).toBe('drive://file-123');
    expect(mockDrive.permissions.create).not.toHaveBeenCalled();
  });

  test('rejects invalid base64 data', async () => await expect(uploadFile('invalid-data', 'test.jpg', 'PRODUCTS')).rejects.toThrow('Invalid base64 data'));
  test('rejects unsupported file type', async () => await expect(uploadFile(dataUrl('application/pdf', Buffer.from('%PDF-1.4')), 'test.pdf', 'PRODUCTS')).rejects.toThrow('Invalid file type: application/pdf'));
  test('rejects oversized files', async () => {
    const large = Buffer.concat([jpeg, Buffer.alloc(11 * 1024 * 1024)]);
    await expect(uploadFile(dataUrl('image/jpeg', large), 'test.jpg', 'PRODUCTS')).rejects.toThrow('File size exceeds maximum allowed size of 10 MB');
  });
});
