import { migratePlaintextPasswords } from '../services/auth.service.js';
import { initializeSheets } from '../services/sheets.service.js';
import { testGoogleConnections } from '../config/google.js';

async function main() {
  console.log('🔐 FIGURAX - Password Migration');
  console.log('===============================');

  try {
    console.log('\n🔌 Testing Google API connections...');
    const ok = await testGoogleConnections();
    if (!ok) {
      console.error('❌ Google API connections failed. Check credentials.');
      process.exit(1);
    }

    console.log('\n📊 Initializing sheets...');
    await initializeSheets();

    console.log('\n🔄 Migrating plaintext passwords to Argon2id hashes...');
    const { migrated } = await migratePlaintextPasswords();

    if (migrated > 0) {
      console.log(`\n✅ Successfully migrated ${migrated} password(s) to secure hashes.`);
    } else {
      console.log('\nℹ️  No plaintext passwords found to migrate. All passwords are already hashed.');
    }

    console.log('\n🎉 Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();