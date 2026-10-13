#!/usr/bin/env node
import { initializeDatabase, closeDatabase } from '../db.js';
import { updateBatteryExpirationDates } from './updateBatteryExpiration.js';

async function runMigration() {
  try {
    console.log('🔄 Running battery expiration date migration...\n');
    await initializeDatabase();
    await updateBatteryExpirationDates();
    console.log('\n✅ Migration completed successfully!');
    await closeDatabase();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
