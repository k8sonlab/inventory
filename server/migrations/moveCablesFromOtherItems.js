// Moves Other Items of type "Cable" into the Cables table. Prints the plan only; pass --apply to write.
import { initializeDatabase, query, exec, closeDatabase, isPostgresDB } from '../db.js';
import { runMigrations } from './run.js';
import { Cable, CatalogEnum } from '../models/index.js';

const apply = process.argv.includes('--apply');
const NOT_CABLES = /switch|holder|clip|protector|9v connector/i;

function classify(item) {
  const text = `${item.name || ''} ${item.size || ''}`;
  const gauge = text.match(/(\d+)\s*A[WR]G/i);
  const length = text.match(/\b(\d+(?:\.\d+)?)\s*(cm|m)\b/i);
  const color = (item.name || '').match(/^(red and black|red and blue|red|black)\b/i);
  // "1 to 2" describes a splitter, not the two ends
  const ends = /\b\d+\s+to\s+\d+\b/i.test(item.name || '')
    ? null
    : (item.name || '').match(/^(?:adapter\s+)?(.+?)\s+(?:to|-)\s+(.+?)(?:\s*\(.*)?$/i);

  let cableType = 'Other';
  if (gauge && !/jst|xh/i.test(text)) cableType = 'Power Wire';
  else if (/usb|tb4|thunderbolt|micro-?b/i.test(text)) cableType = 'USB/Data';
  else if (/\bjr\b|servo/i.test(text)) cableType = 'Servo/JR';
  else if (/jst|xh/i.test(text)) cableType = 'JST/Balance';
  else if (/adapter/i.test(text)) cableType = 'Adapter';

  return {
    cable_type: cableType,
    end_a: ends ? ends[1].trim() : '',
    end_b: ends ? ends[2].trim() : '',
    length: length ? `${length[1]}${length[2].toLowerCase()}` : '',
    gauge: gauge ? `${gauge[1]}AWG` : '',
    color: color ? color[1].replace(/\band\b/i, '/').replace(/\s+/g, '') : '',
    company: item.company || '',
    name: item.name || '',
    quantity: item.quantity ?? 0,
    box_id: item.box_id,
    notes: [item.notes, item.size && !length && !gauge ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ')
  };
}

async function main() {
  await initializeDatabase();
  await runMigrations();
  const ph = (n) => (isPostgresDB() ? `$${n}` : '?');
  const [category] = await query(`SELECT id FROM categories WHERE name = ${ph(1)}`, ['Cables']);
  const rows = await query(`SELECT * FROM other_items WHERE item_type = ${ph(1)} ORDER BY name`, ['Cable']);

  const moves = rows.filter((row) => !NOT_CABLES.test(row.name || ''));
  const skipped = rows.filter((row) => NOT_CABLES.test(row.name || ''));

  console.log(`${moves.length} cables to move, ${skipped.length} left in Other Items:\n`);
  for (const row of moves) {
    const c = classify(row);
    console.log(`  ${row.name} [${row.size || ''}] -> ${c.cable_type} | ${c.end_a || '-'} -> ${c.end_b || '-'} | ${c.length || '-'} | ${c.gauge || '-'} | ${c.color || '-'}`);
  }
  console.log('\nLeft in Other Items (fix their type by hand):');
  for (const row of skipped) console.log(`  ${row.name}`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to move them.');
    return;
  }

  for (const row of moves) {
    const cable = classify(row);
    await Cable.create({ ...cable, category_id: category.id });
    for (const [enumType, value] of [['cable_type', cable.cable_type], ['cable_end', cable.end_a], ['cable_end', cable.end_b],
      ['cable_gauge', cable.gauge], ['cable_color', cable.color], ['cable_company', cable.company]]) {
      if (value) await CatalogEnum.create(enumType, value);
    }
    await exec(`DELETE FROM other_items WHERE id = ${ph(1)}`, [row.id]);
  }
  console.log(`\nMoved ${moves.length} cables.`);
}

try {
  await main();
} catch (error) {
  console.error('Failed:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
