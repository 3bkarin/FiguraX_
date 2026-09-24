import { initializeSheets } from '../services/sheets.service.js';
import { initializeDriveFolders } from '../services/drive.service.js';
import { initializeSettings } from '../services/settings.service.js';
import { initializeDefaultShippingRates } from '../services/shipping.service.js';
import { testGoogleConnections } from '../config/google.js';
import { env } from '../config/env.js';

async function main() {
  console.log('🔧 FIGURAX - Google Sheets & Drive Initialization');
  console.log('================================================');

  try {
    validateEnv();

    console.log('\n🔌 Testing Google API connections...');
    const ok = await testGoogleConnections();
    if (!ok) {
      console.error('❌ Some Google API connections failed. Check credentials.');
      process.exit(1);
    }

    console.log('\n📊 Initializing Google Sheets...');
    await initializeSheets();

    console.log('\n📁 Initializing Google Drive folders...');
    await initializeDriveFolders();

    console.log('\n⚙️  Initializing settings...');
    await initializeSettings();

    console.log('\n🚚 Initializing default shipping rates...');
    await initializeDefaultShippingRates();

    console.log('\n✅ Initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run migrate:passwords (to hash existing passwords)');
    console.log('2. Run: npm run migrate:data (to migrate existing data)');
    console.log('3. Start server: npm run dev');
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

function validateEnv() {
  const required = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_SHEET_ID',
    'GOOGLE_DRIVE_FOLDER_ID',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

main();