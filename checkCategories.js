import Database from 'better-sqlite3';

async function checkCategories() {
  try {
    const db = new Database('./server/inventory.db', { readonly: true });
    const categories = db.prepare('SELECT id, name, sort_order FROM categories ORDER BY sort_order, name').all();
    
    console.log('\n=== Categories in Database ===');
    categories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} (sort_order: ${cat.sort_order}, id: ${cat.id})`);
    });
    
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkCategories();
