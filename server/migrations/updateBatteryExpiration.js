import { query, exec, isPostgresDB } from '../db.js';

// Helper function to convert Excel date serial number to ISO date string
const excelDateToISO = (excelDateNum) => {
  if (!excelDateNum) return null;
  const num = Number(excelDateNum);
  if (isNaN(num)) return null;
  const jsDate = new Date((num - 25569) * 86400 * 1000);
  return jsDate.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Extract expiration date from notes like "Expires: 48944"
const parseExpirationFromNotes = (notes) => {
  if (!notes) return null;
  const match = notes.match(/Expires:\s*(\d+)/);
  if (match && match[1]) {
    return excelDateToISO(match[1]);
  }
  return null;
};

async function updateBatteryExpirationDates() {
  try {
    console.log('\n🔋 Updating battery expiration dates from notes...');
    
    // Get all batteries with notes containing "Expires:"
    const batteries = await query('SELECT id, notes FROM batteries WHERE notes LIKE ?', ['%Expires:%']);
    
    let updated = 0;
    for (const battery of batteries) {
      const expirationDate = parseExpirationFromNotes(battery.notes);
      
      if (expirationDate) {
        const sql = `UPDATE batteries SET expiration_date = ${isPostgresDB() ? '$1' : '?'} WHERE id = ${isPostgresDB() ? '$2' : '?'}`;
        await exec(sql, [expirationDate, battery.id]);
        updated++;
        console.log(`  ✓ Updated battery ${battery.id}: Expiration = ${expirationDate}`);
      }
    }
    
    console.log(`  ✓ Updated ${updated} batteries with expiration dates from notes`);
    
  } catch (error) {
    console.error('Error updating battery expiration dates:', error);
    throw error;
  }
}

export { updateBatteryExpirationDates };
