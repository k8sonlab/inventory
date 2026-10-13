import { initializeDatabase, query, closeDatabase } from './db.js';

async function verify() {
  try {
    await initializeDatabase();
    
    // Check items with company data
    const withCompanyData = await query(`
      SELECT item_type, name, size, company 
      FROM other_items 
      WHERE company IS NOT NULL AND company != ''
      ORDER BY company, name
    `, []);
    
    console.log('\n✅ Other Items WITH Company Data:\n');
    console.log('Item Type\t\tName\t\t\t\tSize\t\t\tCompany');
    console.log('─'.repeat(140));
    
    withCompanyData.forEach(row => {
      const itemType = (row.item_type || '').padEnd(15);
      const name = (row.name || '').padEnd(35);
      const size = (row.size || '').padEnd(20);
      const company = row.company || '';
      console.log(`${itemType}\t${name}\t${size}\t${company}`);
    });
    
    console.log('\n' + '─'.repeat(140));
    
    const total = await query(`SELECT COUNT(*) as count FROM other_items`, []);
    const withCompany = await query(`
      SELECT COUNT(*) as count FROM other_items WHERE company IS NOT NULL AND company != ''
    `, []);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total Other Items: ${total[0].count}`);
    console.log(`   Items with company: ${withCompany[0].count}`);
    console.log(`   Items without company: ${total[0].count - withCompany[0].count}`);
    
    await closeDatabase();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

verify();
