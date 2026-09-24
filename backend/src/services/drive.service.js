import { getDriveClient } from '../config/google.js';
import { Readable } from 'node:stream';
import { env } from '../config/env.js';
import { DRIVE_FOLDERS } from '../config/constants.js';

const ROOT_FOLDER_ID = env.google.driveFolderId;

const drive = getDriveClient();

const folderCache = new Map();

const PUBLIC_FOLDER_TYPES = new Set([
  'PRODUCTS',
  'REVIEWS',
]);

const PRIVATE_FOLDERS = new Set([
  DRIVE_FOLDERS.PAYMENT_PROOFS,
  DRIVE_FOLDERS.FUND_TRANSACTIONS,
]);


// =====================================================
// HELPERS
// =====================================================

function isPublicFolder(folderType) {
  return PUBLIC_FOLDER_TYPES.has(folderType);
}


function parseDataUrl(base64Data) {
  if (
    typeof base64Data !== 'string' ||
    !base64Data.trim()
  ) {
    throw new Error('Invalid image data');
  }

  const match = base64Data.match(
    /^data:([^;]+);base64,(.+)$/s
  );

  if (!match) {
    throw new Error(
      'Invalid base64 data URL'
    );
  }

  const mimeType = match[1];
  const base64 = match[2];

  let buffer;

  try {
    buffer = Buffer.from(
      base64,
      'base64'
    );
  } catch {
    throw new Error(
      'Invalid base64 image'
    );
  }

  if (!buffer.length) {
    throw new Error(
      'Empty image data'
    );
  }

  return {
    mimeType,
    buffer,
  };
}


function sanitizeFileName(fileName) {
  const original =
    String(fileName || '').trim();

  if (!original) {
    throw new Error(
      'File name is required'
    );
  }

  return original
    .replace(/\.\.+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 180);
}


function getExtension(fileName) {
  const match =
    String(fileName || '')
      .toLowerCase()
      .match(/\.([a-z0-9]+)$/);

  return match
    ? match[1]
    : '';
}


function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      mimeType: 'image/jpeg',
      extension: 'jpg',
    };
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      mimeType: 'image/png',
      extension: 'png',
    };
  }

  // GIF
  if (
    buffer.length >= 6 &&
    (
      buffer.subarray(0, 6).toString() === 'GIF87a' ||
      buffer.subarray(0, 6).toString() === 'GIF89a'
    )
  ) {
    return {
      mimeType: 'image/gif',
      extension: 'gif',
    };
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  ) {
    return {
      mimeType: 'image/webp',
      extension: 'webp',
    };
  }

  return null;
}


export function validateUpload(
  fileName,
  mimeType,
  buffer
) {
  const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

  const allowedExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
  ]);

  const maxSize =
    10 * 1024 * 1024;

  if (
    !allowedMimeTypes.has(mimeType)
  ) {
    throw new Error(
      `Invalid file type: ${mimeType}`
    );
  }

  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.length
  ) {
    throw new Error(
      'Invalid image buffer'
    );
  }

  if (buffer.length > maxSize) {
    throw new Error(
      'File size exceeds maximum allowed size of 10 MB'
    );
  }

  const safeFileName =
    sanitizeFileName(fileName);

  const extension =
    getExtension(safeFileName);

  if (
    !allowedExtensions.has(extension)
  ) {
    throw new Error(
      `Invalid file extension: ${extension || safeFileName}`
    );
  }

  const detected =
    detectImageType(buffer);

  if (!detected) {
    throw new Error(
      'Invalid or unsupported image file'
    );
  }

  if (
    detected.mimeType !== mimeType
  ) {
    throw new Error(
      'File content does not match MIME type'
    );
  }

  return safeFileName;
}


// =====================================================
// FIND / CREATE DRIVE FOLDER
// =====================================================

async function findOrCreateFolder(
  folderName
) {
  if (!folderName) {
    throw new Error(
      'Drive folder name is required'
    );
  }

  if (
    folderCache.has(folderName)
  ) {
    return folderCache.get(
      folderName
    );
  }

  try {
    const escapedFolderName =
      String(folderName).replace(
        /'/g,
        "\\'"
      );

    const response =
      await drive.files.list({
        q: [
          `'${ROOT_FOLDER_ID}' in parents`,
          `name = '${escapedFolderName}'`,
          `mimeType = 'application/vnd.google-apps.folder'`,
          'trashed = false',
        ].join(' and '),

        fields: 'files(id,name)',

        spaces: 'drive',

        pageSize: 10,
      });

    const existing =
      response.data.files?.[0];

    if (existing?.id) {
      folderCache.set(
        folderName,
        existing.id
      );

      return existing.id;
    }

    const created =
      await drive.files.create({
        requestBody: {
          name: folderName,

          mimeType:
            'application/vnd.google-apps.folder',

          parents: [
            ROOT_FOLDER_ID,
          ],
        },

        fields: 'id',
      });

    const folderId =
      created.data.id;

    if (!folderId) {
      throw new Error(
        `Failed to create Drive folder: ${folderName}`
      );
    }

    folderCache.set(
      folderName,
      folderId
    );

    return folderId;

  } catch (error) {
    console.error(
      `Error finding/creating Drive folder "${folderName}":`,
      error.message
    );

    throw error;
  }
}


// =====================================================
// INITIALIZE DRIVE FOLDERS
// =====================================================

export async function initializeDriveFolders() {
  try {
    if (!ROOT_FOLDER_ID) {
      throw new Error(
        'Google Drive root folder ID is not configured'
      );
    }

    const folderEntries =
      Object.entries(
        DRIVE_FOLDERS
      );

    for (
      const [
        folderType,
        folderName,
      ] of folderEntries
    ) {
      if (!folderName) {
        continue;
      }

      await findOrCreateFolder(
        folderName
      );

      console.log(
        `✅ Drive folder ready: ${folderType} -> ${folderName}`
      );
    }

    console.log(
      '✅ Google Drive folders initialized'
    );

    return true;

  } catch (error) {
    console.error(
      '❌ Failed to initialize Drive folders:',
      error.message
    );

    throw error;
  }
}


// =====================================================
// UPLOAD FILE
// =====================================================

export async function uploadFile(
  base64Data,
  fileName,
  folderType = 'OTHER'
) {
  const {
    mimeType,
    buffer,
  } = parseDataUrl(
    base64Data
  );

  const folderName =
    DRIVE_FOLDERS[folderType] ||
    DRIVE_FOLDERS.OTHER;

  const folderId =
    await findOrCreateFolder(
      folderName
    );

  const makePublic =
    isPublicFolder(
      folderType
    );

  const sanitizedFileName =
    validateUpload(
      fileName,
      mimeType,
      buffer
    );

  try {
    const response =
      await drive.files.create({
        requestBody: {
          name:
            sanitizedFileName,

          parents: [
            folderId,
          ],
        },

        media: {
          mimeType,

          body:
            Readable.from(
              buffer
            ),
        },

        fields: 'id',
      });

    const fileId =
      response.data.id;

    if (!fileId) {
      throw new Error(
        'Google Drive did not return file ID'
      );
    }

    // -----------------------------------------------
    // Public files
    // -----------------------------------------------

    if (makePublic) {
      await drive.permissions.create({
        fileId,

        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const directUrl =
        `https://drive.google.com/uc?export=view&id=${fileId}`;

      console.log(
        '✅ Public Drive file uploaded:',
        directUrl
      );

      return directUrl;
    }

    // -----------------------------------------------
    // Private files
    // -----------------------------------------------

    return `drive://${fileId}`;

  } catch (error) {
    console.error(
      '❌ Error uploading file:',
      error.message
    );

    throw error;
  }
}


// =====================================================
// UPLOAD BUFFER
// =====================================================

export async function uploadBuffer(
  buffer,
  fileName,
  mimeType,
  folderType = 'OTHER'
) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      'Invalid file buffer'
    );
  }

  const folderName =
    DRIVE_FOLDERS[folderType] ||
    DRIVE_FOLDERS.OTHER;

  const folderId =
    await findOrCreateFolder(
      folderName
    );

  const makePublic =
    isPublicFolder(
      folderType
    );

  const sanitizedFileName =
    validateUpload(
      fileName,
      mimeType,
      buffer
    );

  try {
    const response =
      await drive.files.create({
        requestBody: {
          name:
            sanitizedFileName,

          parents: [
            folderId,
          ],
        },

        media: {
          mimeType,

          body:
            Readable.from(
              buffer
            ),
        },

        fields: 'id',
      });

    const fileId =
      response.data.id;

    if (!fileId) {
      throw new Error(
        'Google Drive did not return file ID'
      );
    }

    // -----------------------------------------------
    // Public files
    // -----------------------------------------------

    if (makePublic) {
      await drive.permissions.create({
        fileId,

        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const directUrl =
        `https://drive.google.com/uc?export=view&id=${fileId}`;

      console.log(
        '✅ Public Drive buffer uploaded:',
        directUrl
      );

      return directUrl;
    }

    // -----------------------------------------------
    // Private files
    // -----------------------------------------------

    return `drive://${fileId}`;

  } catch (error) {
    console.error(
      '❌ Error uploading buffer:',
      error.message
    );

    throw error;
  }
}


// =====================================================
// EXTRACT FILE ID
// =====================================================

export function extractFileId(
  value
) {
  const input =
    String(value || '').trim();

  if (!input) {
    return null;
  }

  // drive://FILE_ID
  if (
    input.startsWith(
      'drive://'
    )
  ) {
    return input.slice(
      'drive://'.length
    );
  }

  // Google Drive /d/FILE_ID
  const matchD =
    input.match(
      /\/d\/([a-zA-Z0-9_-]+)/
    );

  if (matchD) {
    return matchD[1];
  }

  // ?id=FILE_ID
  // ?fileId=FILE_ID
  const matchId =
    input.match(
      /[?&](?:id|fileId)=([a-zA-Z0-9_-]+)/
    );

  if (matchId) {
    return matchId[1];
  }

  // Raw file ID
  if (
    /^[a-zA-Z0-9_-]{5,}$/.test(
      input
    )
  ) {
    return input;
  }

  return null;
}


// =====================================================
// FILE INFO
// =====================================================

export async function getFileInfo(
  fileValue
) {
  const fileId =
    extractFileId(
      fileValue
    );

  if (!fileId) {
    throw new Error(
      'Invalid file ID'
    );
  }

  try {
    const response =
      await drive.files.get({
        fileId,

        fields:
          'id,name,mimeType,size,webViewLink,webContentLink',
      });

    return response.data;

  } catch (error) {
    if (
      error.code === 404 ||
      error.response?.status === 404
    ) {
      throw new Error(
        'File not found'
      );
    }

    throw error;
  }
}


// =====================================================
// PRIVATE DOWNLOAD
// =====================================================

export async function downloadPrivateFile(fileValue, user) {
  if (!user) {
    throw new Error('Authentication required');
  }

  const permissions = user.permissions || [];
  if (!permissions.includes('private_file_access')) {
    throw new Error('Forbidden');
  }

  const fileId = extractFileId(fileValue);
  if (!fileId) {
    throw new Error('Invalid file ID');
  }

  try {
    const metadataResponse = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,parents',
    });

    const metadata = metadataResponse.data;
    if (!metadata) {
      throw new Error('File not found');
    }

    const privateFolderIds = [];
    for (const folderName of PRIVATE_FOLDERS) {
      const escapedFolderName = String(folderName).replace(/'/g, "\\'");
      const response = await drive.files.list({
        q: [
          `'${ROOT_FOLDER_ID}' in parents`,
          `name = '${escapedFolderName}'`,
          `mimeType = 'application/vnd.google-apps.folder'`,
          'trashed = false',
        ].join(' and '),
        fields: 'files(id,name)',
        spaces: 'drive',
        pageSize: 10,
      });

      for (const folder of response.data.files || []) {
        if (folder.id) privateFolderIds.push(folder.id);
      }
    }

    const parents = Array.isArray(metadata.parents) ? metadata.parents : [];
    if (!parents.some(parent => privateFolderIds.includes(parent))) {
      throw new Error('Forbidden');
    }

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return {
      data: response.data,
      fileName: metadata.name,
      mimeType: metadata.mimeType || 'application/octet-stream',
    };
  } catch (error) {
    if (error.message === 'Forbidden' || error.message === 'File not found') {
      throw error;
    }

    if (error.code === 404 || error.response?.status === 404) {
      throw new Error('File not found');
    }

    throw error;
  }
}

export async function downloadPublicFile(fileValue) {
  const fileId = extractFileId(fileValue);

  if (!fileId) {
    throw new Error('Invalid Google Drive file ID');
  }

  const metadataResponse = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,parents',
  });

  const metadata = metadataResponse.data;
  if (!metadata) {
    throw new Error('Google Drive file not found');
  }

  const publicFolderIds = [];
  for (const folderName of ['Products', 'Reviews']) {
    const escapedFolderName = String(folderName).replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: [
        `'${ROOT_FOLDER_ID}' in parents`,
        `name = '${escapedFolderName}'`,
        `mimeType = 'application/vnd.google-apps.folder'`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id,name)',
      spaces: 'drive',
      pageSize: 10,
    });

    for (const folder of response.data.files || []) {
      if (folder.id) publicFolderIds.push(folder.id);
    }
  }

  const parents = Array.isArray(metadata.parents) ? metadata.parents : [];
  if (!parents.some(parent => publicFolderIds.includes(parent))) {
    throw new Error('Google Drive file is not in a public folder');
  }

  const mimeType = metadata.mimeType || 'application/octet-stream';
  if (!mimeType.startsWith('image/')) {
    throw new Error('Requested Drive file is not an image');
  }

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    data: response.data,
    fileName: metadata.name,
    mimeType,
  };
}

// =====================================================
// CLEAR CACHE
// =====================================================

export function clearDriveFolderCache() {
  folderCache.clear();
}