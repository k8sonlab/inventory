import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import initSqlJs from 'sql.js';
import XLSX from 'xlsx';

const run = promisify(execFile);
const serverDirectory = fileURLToPath(new URL('..', import.meta.url));

test('reset imports avoid duplicates, preserve locations only for --empty, and reject unsafe inputs', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-reset-'));
  t.after(() => rm(directory, { recursive: true }));
  const file = path.join(directory, 'fixture.xlsx');
  const dbFile = path.join(directory, 'inventory.db');
  const env = { ...process.env, DB_TYPE: 'sqlite', DB_FILE: dbFile };
  const workbook = XLSX.utils.book_new();
  const sheets = {
    Shelves: [{ 'Shelf ID': 'S1', Location: 'Test shelf' }],
    Boxes: [{ 'Shelf ID': 'S1', 'Storage ID': 'S1-B01', 'Box Name': 'Test box' }],
    Screws: [{ 'Storage ID': 'S1-B01', Size: 'M3', Amount: 4 }],
    'Other Items': [{ 'Storage ID': 'S1-B01', Name: 'Test washer', 'Item Type': 'Washer', Size: '3x5x0.1', Amount: 1.5 }],
    'RC Parts': [], OilsPAstes: [], Batteries: []
  };
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  }
  XLSX.writeFile(workbook, file);
  const SQL = await initSqlJs();
  const inspect = async () => {
    const db = new SQL.Database(await readFile(dbFile));
    try {
      return {
        screws: db.exec('SELECT COUNT(*) FROM screws')[0].values[0][0],
        washers: db.exec('SELECT COUNT(*) FROM washers_bearings')[0].values[0][0],
        boxes: db.exec('SELECT COUNT(*) FROM boxes')[0].values[0][0],
        boxId: db.exec("SELECT id FROM boxes WHERE storage_id = 'S1-B01'")[0].values[0][0],
        shelfId: db.exec("SELECT id FROM shelves WHERE shelf_code = 'S1'")[0].values[0][0],
        stale: db.exec("SELECT COUNT(*) FROM catalog_enums WHERE enum_type = 'test'")[0].values[0][0]
      };
    } finally {
      db.close();
    }
  };
  const importFile = (...args) => run(process.execPath, ['utils/importExcel.js', ...args], { cwd: serverDirectory, env });
  await importFile(file);
  const original = await inspect();
  await importFile(file);
  assert.equal((await inspect()).screws, 2);
  assert.equal((await inspect()).washers, 2);

  const seed = new SQL.Database(await readFile(dbFile));
  seed.exec("INSERT INTO catalog_enums (id, enum_type, value) VALUES ('stale', 'test', 'stale')");
  await writeFile(dbFile, seed.export());
  seed.close();
  await importFile('--empty', file);
  const emptied = await inspect();
  assert.equal(emptied.screws, 1);
  assert.equal(emptied.washers, 1);
  assert.equal(emptied.stale, 0);
  assert.equal(emptied.boxId, original.boxId);
  assert.equal(emptied.shelfId, original.shelfId);
  for (let index = 0; index < 2; index++) {
    await importFile(file, '--clean');
    const cleaned = await inspect();
    assert.equal(cleaned.screws, 1);
    assert.equal(cleaned.washers, 1);
    assert.equal(cleaned.boxes, 1);
    assert.notEqual(cleaned.boxId, original.boxId);
    assert.notEqual(cleaned.shelfId, original.shelfId);
  }

  const snapshot = await readFile(dbFile);
  const invalid = path.join(directory, 'invalid.xlsx');
  const missingSheets = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(missingSheets, XLSX.utils.json_to_sheet([]), 'Shelves');
  XLSX.writeFile(missingSheets, invalid);
  for (const args of [
    [file, '--clean', '--empty'],
    [file, '--cleen'],
    [path.join(directory, 'missing.xlsx'), '--clean'],
    [invalid, '--empty']
  ]) {
    await assert.rejects(importFile(...args));
    assert.deepEqual(await readFile(dbFile), snapshot);
  }
  assert.match((await importFile('--help')).stdout, /--empty/);
  assert.deepEqual(await readFile(dbFile), snapshot);
});
