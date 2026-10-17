import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import XLSX from 'xlsx';

const run = promisify(execFile);
const serverDirectory = fileURLToPath(new URL('..', import.meta.url));

test('migration removes the unused Other Item type options only, and the importer no longer recreates them', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-enums-'));
  t.after(() => rm(directory, { recursive: true }));
  const file = path.join(directory, 'fixture.xlsx');
  const env = { ...process.env, DB_TYPE: 'sqlite', DB_FILE: path.join(directory, 'inventory.db') };

  const workbook = XLSX.utils.book_new();
  const sheets = {
    Shelves: [{ 'Shelf ID': 'S1', Location: 'Test shelf' }],
    Boxes: [{ 'Shelf ID': 'S1', 'Storage ID': 'S1-B01', 'Box Name': 'Test box' }],
    'Types Catalog': [{ 'Item Type': 'Connector', 'Oil Companies': 'Acme Oil', 'Oil Types': 'Grease' }],
    Screws: [], 'Other Items': [], 'RC Parts': [], OilsPAstes: [], Batteries: []
  };
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  }
  XLSX.writeFile(workbook, file);

  await run(process.execPath, ['utils/importExcel.js', file], { cwd: serverDirectory, env });

  const script = `
    import { initializeDatabase, closeDatabase, query, exec } from './db.js';
    import { runMigrations } from './migrations/run.js';
    await initializeDatabase();
    await exec("INSERT INTO catalog_enums (id, enum_type, value) VALUES ('legacy-1', 'other_item_type', 'Servo')");
    const count = async (type) => (await query("SELECT COUNT(*) AS c FROM catalog_enums WHERE enum_type = '" + type + "'"))[0].c;
    const before = await count('other_item_type');
    await runMigrations();
    await runMigrations();
    console.log(JSON.stringify({
      before,
      other: await count('other_item_type'),
      company: await count('oil_paste_company'),
      type: await count('oil_paste_type')
    }));
    await closeDatabase();
  `;
  const { stdout } = await run(process.execPath, ['--input-type=module', '-e', script], { cwd: serverDirectory, env });
  const result = JSON.parse(stdout.trim().split('\n').pop());
  assert.equal(result.before, 1, 'importer must not create other_item_type rows');
  assert.equal(result.other, 0, 'migration removes legacy other_item_type rows (idempotently)');
  assert.equal(result.company, 1);
  assert.equal(result.type, 1);
});
