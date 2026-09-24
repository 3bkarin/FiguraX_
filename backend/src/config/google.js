import { google } from 'googleapis';
import { env } from './env.js';

let sheetsClient = null;
let driveClient = null;
let gmailClient = null;

// =====================================================
// GOOGLE SHEETS - SERVICE ACCOUNT
// =====================================================

export function getSheetsClient() {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        project_id: env.google.projectId,
        client_email: env.google.clientEmail,
        private_key: env.google.privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    sheetsClient = google.sheets({
      version: 'v4',
      auth,
    });
  }

  return sheetsClient;
}

// =====================================================
// GOOGLE DRIVE - USER OAUTH
// =====================================================

export function getDriveClient() {
  if (!driveClient) {
    if (!env.google.driveClientId) {
      throw new Error('GOOGLE_DRIVE_CLIENT_ID is not configured');
    }

    if (!env.google.driveClientSecret) {
      throw new Error('GOOGLE_DRIVE_CLIENT_SECRET is not configured');
    }

    if (!env.google.driveRefreshToken) {
      throw new Error('GOOGLE_DRIVE_REFRESH_TOKEN is not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      env.google.driveClientId,
      env.google.driveClientSecret,
      env.google.driveRedirectUri || 'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: env.google.driveRefreshToken,
    });

    driveClient = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  return driveClient;
}

// =====================================================
// GMAIL - EXISTING OAUTH
// =====================================================

export function getGmailClient() {
  if (!gmailClient) {
    const { OAuth2 } = google.auth;

    const oauth2Client = new OAuth2(
      env.gmail.clientId,
      env.gmail.clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: env.gmail.refreshToken,
    });

    gmailClient = google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });
  }

  return gmailClient;
}

// =====================================================
// TEST GOOGLE CONNECTIONS
// =====================================================

export async function testGoogleConnections() {
  let success = true;

  // -----------------------------
  // Google Sheets
  // -----------------------------
  try {
    const sheets = getSheetsClient();

    await sheets.spreadsheets.get({
      spreadsheetId: env.google.sheetId,
    });

    console.log('✅ Google Sheets connection OK');
  } catch (error) {
    success = false;
    console.error(
      '❌ Google Sheets connection failed:',
      error.message
    );
  }

  // -----------------------------
  // Google Drive
  // -----------------------------
  try {
    const drive = getDriveClient();

    await drive.files.get({
      fileId: env.google.driveFolderId,
      fields: 'id,name,mimeType',
    });

    console.log('✅ Google Drive OAuth connection OK');
  } catch (error) {
    success = false;
    console.error(
      '❌ Google Drive OAuth connection failed:',
      error.message
    );
  }

    // -----------------------------
  // Gmail
  // -----------------------------
  try {
    const gmailAuth = new google.auth.OAuth2(
      env.gmail.clientId,
      env.gmail.clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    gmailAuth.setCredentials({
      refresh_token: env.gmail.refreshToken,
    });

    await gmailAuth.getAccessToken();

    console.log('✅ Gmail OAuth connection OK');
  } catch (error) {
    success = false;
    console.error(
      '❌ Gmail OAuth connection failed:',
      error.message
    );
  }

  return success;
}