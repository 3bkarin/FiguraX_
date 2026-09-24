import { config } from 'dotenv';

config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',

  port: parseInt(process.env.PORT || '3000', 10),

  frontendOrigin:
    process.env.FRONTEND_ORIGIN || 'http://localhost:5500',

  productionFrontendOrigin:
    process.env.PRODUCTION_FRONTEND_ORIGIN || '',

  reviewFrontendOrigin:
    process.env.REVIEW_FRONTEND_ORIGIN || '',

  sessionSecret:
    process.env.SESSION_SECRET || 'dev-secret-change-me',

  google: {
    // Google Sheets - Service Account
    projectId:
      process.env.GOOGLE_PROJECT_ID || '',

    clientEmail:
      process.env.GOOGLE_CLIENT_EMAIL || '',

    privateKey:
      (process.env.GOOGLE_PRIVATE_KEY || '')
        .replace(/\\n/g, '\n'),

    sheetId:
      process.env.GOOGLE_SHEET_ID || '',

    // Google Drive - existing My Drive folder
    driveFolderId:
      process.env.GOOGLE_DRIVE_FOLDER_ID || '',

    // Google Drive - OAuth
    driveClientId:
      process.env.GOOGLE_DRIVE_CLIENT_ID || '',

    driveClientSecret:
      process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',

    driveRefreshToken:
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',

    driveRedirectUri:
      process.env.GOOGLE_DRIVE_REDIRECT_URI ||
      'https://developers.google.com/oauthplayground',
  },

  gmail: {
    clientId:
      process.env.GMAIL_CLIENT_ID || '',

    clientSecret:
      process.env.GMAIL_CLIENT_SECRET || '',

    refreshToken:
      process.env.GMAIL_REFRESH_TOKEN || '',

    sender:
      process.env.GMAIL_SENDER || 'figuraxverse@gmail.com',
  },

  companyEmail:
    process.env.COMPANY_EMAIL || 'figuraxverse@gmail.com',

  defaultCurrency:
    process.env.DEFAULT_CURRENCY || 'EGP',

  admin: {
    mahrousEmail:
      process.env.ADMIN_MAHROUS_EMAIL ||
      'abdelrahman.mahrous2005@gmail.com',

    mahrousId:
      process.env.ADMIN_MAHROUS_ID || '147897',
  },
};

export function validateEnv() {
  const required = [
    // Google Sheets
    'google.projectId',
    'google.clientEmail',
    'google.privateKey',
    'google.sheetId',

    // Google Drive
    'google.driveFolderId',
    'google.driveClientId',
    'google.driveClientSecret',
    'google.driveRefreshToken',

    // Gmail
    'gmail.clientId',
    'gmail.clientSecret',
    'gmail.refreshToken',

    // App
    'sessionSecret',
  ];

  const missing = [];

  for (const key of required) {
    const value = key
      .split('.')
      .reduce((obj, k) => obj?.[k], env);

    if (!value || value === 'dev-secret-change-me') {
      missing.push(key);
    }
  }

  if (missing.length > 0 && env.nodeEnv === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (
    env.nodeEnv === 'development' &&
    missing.length > 0
  ) {
    console.warn(
      '⚠️ Missing environment variables (development mode):',
      missing.join(', ')
    );
  }
}