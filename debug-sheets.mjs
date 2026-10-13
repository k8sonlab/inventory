import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'Generic Items Storage.xlsx');

console.log(`\nReading: ${filePath}\n`);

try {
  const workbook = XLSX.readFile(filePath);
  
  console.log('📋 Sheet names:');
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. "${name}"`);
  });
  
  // Check Batteries sheet
  console.log('\n🔋 Batteries sheet data:');
  const batteriesSheet = workbook.Sheets['Batteries'];
  if (!batteriesSheet) {
    console.log('  ❌ Batteries sheet not found!');
  } else {
    const data = XLSX.utils.sheet_to_json(batteriesSheet);
    console.log(`  Found ${data.length} rows`);
    if (data.length > 0) {
      console.log('  First row keys:', Object.keys(data[0]));
      console.log('  First row:', JSON.stringify(data[0], null, 2));
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
