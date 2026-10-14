import initSqlJs from 'sql.js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DB_FILE = process.env.DB_FILE || 'inventory.db';
const DB_FILE_PATH = path.resolve(DB_FILE);

let db = null;
let isPostgres = false;
let SQL = null;

/**
 * Database adapter - supports both SQLite (via sql.js) and PostgreSQL
 */
export async function initializeDatabase() {
  if (DB_TYPE === 'postgres') {
    isPostgres = true;
    const poolConfig = {
      user: process.env.DB_USER || 'inventory_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'inventory_db',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    };
    
    // Add SSL config if DB_SSL is set
    if (process.env.DB_SSL && process.env.DB_SSL !== 'false') {
      if (process.env.DB_SSL === 'require') {
        poolConfig.ssl = { rejectUnauthorized: false };
      } else if (process.env.DB_SSL === 'prefer') {
        poolConfig.ssl = true;
      }
    }
    
    db = new Pool(poolConfig);
    console.log('📊 Connected to PostgreSQL');
  } else {
    isPostgres = false;
    SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_FILE_PATH)) {
      const buffer = fs.readFileSync(DB_FILE_PATH);
      db = new SQL.Database(buffer);
      console.log(`📊 Loaded SQLite database from ${DB_FILE_PATH}`);
    } else {
      db = new SQL.Database();
      console.log(`📊 Created new SQLite database`);
    }
  }
}

export function getDatabase() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function isPostgresDB() {
  return isPostgres;
}

/**
 * Save SQLite database to disk
 */
function saveSQLiteDatabase() {
  if (!isPostgres && db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  }
}

/**
 * Execute a query on either database
 */
export async function query(sql, params = []) {
  if (isPostgres) {
    const result = await db.query(sql, params);
    return result.rows;
  } else {
    try {
      const results = db.exec(sql, params);
      if (results.length === 0) return [];
      const columns = results[0].columns;
      const values = results[0].values;
      return values.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    } catch (e) {
      console.error('SQLite query error:', sql, params, e);
      throw e;
    }
  }
}

/**
 * Execute a single query and return first row
 */
export async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results[0] || null;
}

/**
 * Execute a modification query (INSERT, UPDATE, DELETE)
 */
export async function exec(sql, params = []) {
  if (isPostgres) {
    const result = await db.query(sql, params);
    return result.rows;
  } else {
    try {
      if (params.length > 0) {
        // Use prepared statement for parameterized queries
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
      } else {
        // Direct execution for non-parameterized queries
        db.exec(sql);
      }
      saveSQLiteDatabase();
      return { changes: 1 };
    } catch (e) {
      console.error('[exec] SQLite exec error:', e.message);
      console.error('[exec] SQL:', sql);
      console.error('[exec] Params:', params);
      throw e;
    }
  }
}

/**
 * Execute multiple statements (for migrations)
 */
export async function execMultiple(statements) {
  if (isPostgres) {
    for (const statement of statements) {
      await db.query(statement);
    }
  } else {
    try {
      statements.forEach(statement => {
        db.exec(statement);
      });
      saveSQLiteDatabase();
    } catch (e) {
      console.error('SQLite migration error:', e);
      throw e;
    }
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (isPostgres) {
    await db.end();
  } else if (db) {
    saveSQLiteDatabase();
    db.close();
    db = null;
  }
}
