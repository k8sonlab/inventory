#!/usr/bin/env node

/**
 * Setup script for Inventory App
 * Initializes database and imports Excel data
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runSetup() {
  console.log('\n🚀 Setting up Inventory App...\n');

  try {
    console.log('1️⃣  Running database migrations...');
    await execAsync('node server/migrations/run.js');
    console.log('✅ Database migrations completed\n');

    console.log('2️⃣  Importing data from Excel...');
    await execAsync('node server/utils/importExcel.js');
    console.log('✅ Excel import completed\n');

    console.log('✨ Setup complete! You can now start the app:\n');
    console.log('   Terminal 1 (Backend):');
    console.log('   cd server && npm run dev\n');
    console.log('   Terminal 2 (Frontend):');
    console.log('   cd client && npm run dev\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

runSetup();
