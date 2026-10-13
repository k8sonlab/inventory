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
          sort_order INTEGER,
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
          name VARCHAR(255),
          company VARCHAR(255),
          model VARCHAR(255),
          item_code VARCHAR(255) NOT NULL,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS screws (
          id UUID PRIMARY KEY,
          name VARCHAR(255),
          size VARCHAR(255),
          length VARCHAR(255),
          head_type VARCHAR(255),
          drive_type VARCHAR(255),
          thread_type VARCHAR(255),
          color VARCHAR(255),
          material VARCHAR(255),
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS nuts (
          id UUID PRIMARY KEY,
          name VARCHAR(255),
          size VARCHAR(255),
          type VARCHAR(255),
          color VARCHAR(255),
          has_washer BOOLEAN DEFAULT false,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS bearings (
          id UUID PRIMARY KEY,
          name VARCHAR(255),
          type VARCHAR(255),
          seal_type VARCHAR(255),
          id_inner DECIMAL(10, 3),
          od DECIMAL(10, 3),
          width DECIMAL(10, 3),
          flanged BOOLEAN DEFAULT false,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
                `CREATE TABLE IF NOT EXISTS bearings (
          id UUID PRIMARY KEY,
          name VARCHAR(255),
          type VARCHAR(255),
          id_inner DECIMAL(10, 3),
          od DECIMAL(10, 3),
          width DECIMAL(10, 3),
          flanged BOOLEAN DEFAULT false,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS oil_pastes (
          id UUID PRIMARY KEY,
          name VARCHAR(255),
          company VARCHAR(255),
          type VARCHAR(255),
          characteristic TEXT,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS batteries (
          id UUID PRIMARY KEY,
          size VARCHAR(255),
          company VARCHAR(255),
          model VARCHAR(255),
          type VARCHAR(255),
          expiration_date DATE,
          mah INTEGER,
          rechargeable BOOLEAN DEFAULT FALSE,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS other_items (
          id UUID PRIMARY KEY,
          item_type VARCHAR(255),
          size VARCHAR(255),
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id UUID REFERENCES boxes(id),
          category_id UUID REFERENCES categories(id),
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
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_item_code ON rc_parts(item_code)`,
        `CREATE INDEX IF NOT EXISTS idx_screws_box ON screws(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_screws_size ON screws(size)`,
        `CREATE INDEX IF NOT EXISTS idx_screws_category ON screws(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_nuts_box ON nuts(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_nuts_size ON nuts(size)`,
        `CREATE INDEX IF NOT EXISTS idx_nuts_category ON nuts(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bearings_box ON bearings(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bearings_type ON bearings(type)`,
        `CREATE INDEX IF NOT EXISTS idx_bearings_category ON bearings(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_oil_pastes_box ON oil_pastes(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_oil_pastes_company ON oil_pastes(company)`,
        `CREATE INDEX IF NOT EXISTS idx_oil_pastes_type ON oil_pastes(type)`,
        `CREATE INDEX IF NOT EXISTS idx_batteries_box ON batteries(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_batteries_company ON batteries(company)`,
        `CREATE INDEX IF NOT EXISTS idx_batteries_size ON batteries(size)`,
        `CREATE INDEX IF NOT EXISTS idx_other_items_box ON other_items(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_other_items_item_type ON other_items(item_type)`,
        `CREATE INDEX IF NOT EXISTS idx_other_items_category ON other_items(category_id)`
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
          sort_order INTEGER,
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
          name TEXT,
          company TEXT,
          model TEXT,
          item_code TEXT NOT NULL,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS screws (
          id TEXT PRIMARY KEY,
          name TEXT,
          size TEXT,
          length TEXT,
          head_type TEXT,
          drive_type TEXT,
          thread_type TEXT,
          color TEXT,
          material TEXT,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS nuts (
          id TEXT PRIMARY KEY,
          name TEXT,
          size TEXT,
          type TEXT,
          color TEXT,
          has_washer BOOLEAN DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS bearings (
          id TEXT PRIMARY KEY,
          name TEXT,
          type TEXT,
          seal_type TEXT,
          id_inner REAL,
          od REAL,
          width REAL,
          flanged BOOLEAN DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS oil_pastes (
          id TEXT PRIMARY KEY,
          name TEXT,
          company TEXT,
          type TEXT,
          characteristic TEXT,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS batteries (
          id TEXT PRIMARY KEY,
          size TEXT,
          company TEXT,
          model TEXT,
          type TEXT,
          expiration_date DATE,
          mah INTEGER,
          rechargeable INTEGER DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS other_items (
          id TEXT PRIMARY KEY,
          item_type TEXT,
          size TEXT,
          quantity INTEGER DEFAULT 0,
          notes TEXT,
          box_id TEXT REFERENCES boxes(id),
          category_id TEXT REFERENCES categories(id),
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
        `CREATE INDEX IF NOT EXISTS idx_rc_parts_item_code ON rc_parts(item_code)`,
        `CREATE INDEX IF NOT EXISTS idx_screws_box ON screws(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_screws_size ON screws(size)`,
        `CREATE INDEX IF NOT EXISTS idx_screws_category ON screws(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_nuts_box ON nuts(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_nuts_size ON nuts(size)`,
        `CREATE INDEX IF NOT EXISTS idx_nuts_category ON nuts(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bearings_box ON bearings(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bearings_type ON bearings(type)`,
        `CREATE INDEX IF NOT EXISTS idx_bearings_category ON bearings(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_oil_pastes_box ON oil_pastes(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_oil_pastes_company ON oil_pastes(company)`,
        `CREATE INDEX IF NOT EXISTS idx_oil_pastes_type ON oil_pastes(type)`,
        `CREATE INDEX IF NOT EXISTS idx_batteries_box ON batteries(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_batteries_company ON batteries(company)`,
        `CREATE INDEX IF NOT EXISTS idx_batteries_size ON batteries(size)`,
        `CREATE INDEX IF NOT EXISTS idx_other_items_box ON other_items(box_id)`,
        `CREATE INDEX IF NOT EXISTS idx_other_items_item_type ON other_items(item_type)`,
        `CREATE INDEX IF NOT EXISTS idx_other_items_category ON other_items(category_id)`
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
