#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Step 1: Delete existing database
console.log('🗑️  Clearing old database...');
const dbPath = path.join(__dirname, 'inventory.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Database deleted');
} else {
  console.log('✅ No existing database found');
}

// Step 2: Initialize with fresh migrations
console.log('\n🔄 Initializing fresh database with migrations...');
const { initializeDatabase, closeDatabase } = await import('./db.js');
await initializeDatabase();
console.log('✅ Database initialized with migrations');

// Step 3: Run import
console.log('\n📥 Running Excel import...');
const { importExcelData } = await import('./utils/importExcel.js');
try {
  await importExcelData();
  console.log('✅ Import completed successfully!');
} catch (error) {
  console.error('❌ Import failed:', error);
}

closeDatabase();
console.log('\n✅ Setup complete!');
process.exit(0);
