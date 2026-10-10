import { initializeDatabase, isPostgresDB, closeDatabase, query, exec, execMultiple, getDatabase } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  try {
    console.log('\n🔄 Running database migrations...');
    
    await initializeDatabase();
    const isPG = isPostgresDB();

    if (isPG) {
      // PostgreSQL migrations
      const statements = [
        `CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS shelves (
          id UUID PRIMARY KEY,
          shelf_code VARCHAR(50) NOT NULL UNIQUE,
          location VARCHAR(255) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS boxes (
          id UUID PRIMARY KEY,
          shelf_id UUID REFERENCES shelves(id),
          storage_id VARCHAR(100) NOT NULL UNIQUE,
          box_name VARCHAR(255),
          box_type VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS items (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          item_type VARCHAR(100),
          category_id UUID REFERENCES categories(id),
          box_id UUID REFERENCES boxes(id),
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          parameters JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS catalog_enums (
          id UUID PRIMARY KEY,
          enum_type VARCHAR(100) NOT NULL,
          value VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(enum_type, value)
        )`,
        
        `CREATE TABLE IF NOT EXISTS rc_parts (
          id UUID PRIMARY KEY,
          company VARCHAR(255),
          model VARCHAR(255),
          item_code VARCHAR(255) NOT NULL,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_items_box ON items(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`,
        `CREATE INDEX IF NOT EXISTS idx_boxes_shelf ON boxes(shelf_id)`,
        `CREATE INDEX IF NOT EXISTS idx_boxes_storage_id ON boxes(storage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_catalog_type ON catalog_enums(enum_type)`,
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_box ON rc_parts(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_company ON rc_parts(company)`,
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_item_code ON rc_parts(item_code)`
      ];

      for (const statement of statements) {
        await exec(statement);
      }
    } else {
      // SQLite migrations
      const statements = [
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS shelves (
          id TEXT PRIMARY KEY,
          shelf_code TEXT NOT NULL UNIQUE,
          location TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS boxes (
          id TEXT PRIMARY KEY,
          shelf_id TEXT REFERENCES shelves(id),
          storage_id TEXT NOT NULL UNIQUE,
          box_name TEXT,
          box_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          item_type TEXT,
          category_id TEXT REFERENCES categories(id),
          box_id TEXT REFERENCES boxes(id),
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          parameters TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS catalog_enums (
          id TEXT PRIMARY KEY,
          enum_type TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(enum_type, value)
        )`,

        `CREATE TABLE IF NOT EXISTS rc_parts (
          id TEXT PRIMARY KEY,
          company TEXT,
          model TEXT,
          item_code TEXT NOT NULL,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_items_box ON items(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`,
        `CREATE INDEX IF NOT EXISTS idx_boxes_shelf ON boxes(shelf_id)`,
        `CREATE INDEX IF NOT EXISTS idx_boxes_storage_id ON boxes(storage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_catalog_type ON catalog_enums(enum_type)`,
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_box ON rc_parts(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_company ON rc_parts(company)`,
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_item_code ON rc_parts(item_code)`
      ];

      await execMultiple(statements);
    }

    console.log('✅ Database migrations completed successfully\n');
    await closeDatabase();
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

runMigrations();
