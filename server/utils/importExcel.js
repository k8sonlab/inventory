import XLSX from 'xlsx';
import { initializeDatabase, closeDatabase, isPostgresDB, query, exec } from '../db.js';
import { Shelf, Box, Category, Item, RCPart, Screw, CatalogEnum } from '../models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importExcelData() {
  try {
    const filePath = path.join(__dirname, '..', '..', 'Generic Items Storage.xlsx');
    
    console.log(`\n📂 Reading Excel file: ${filePath}\n`);
    
    await initializeDatabase();
    const db = isPostgresDB() ? 'PostgreSQL' : 'SQLite';
    console.log(`🗄️  Using ${db} database\n`);
    
    const workbook = XLSX.readFile(filePath);
    
    // 1. Import Shelves
    console.log('📚 Importing Shelves...');
    const shelvesSheet = workbook.Sheets['Shelves'];
    const shelvesData = XLSX.utils.sheet_to_json(shelvesSheet);
    
    const shelfMap = {}; // Store shelf_code -> shelf_id mapping
    for (const row of shelvesData) {
      const shelf = await Shelf.create(row['Shelf ID'], row['Location'], row['Notes'] || '');
      shelfMap[row['Shelf ID']] = shelf.id;
      console.log(`  ✓ Shelf: ${row['Shelf ID']} - ${row['Location']}`);
    }

    // 2. Import Boxes
    console.log('\n📦 Importing Boxes...');
    const boxesSheet = workbook.Sheets['Boxes'];
    const boxesData = XLSX.utils.sheet_to_json(boxesSheet);
    
    const boxMap = {}; // Store storage_id -> box_id mapping
    const shelfBoxCount = {};
    
    for (const row of boxesData) {
      if (!row['Shelf ID'] || !row['Storage ID']) continue;
      
      const shelfId = shelfMap[row['Shelf ID']];
      if (!shelfId) continue;
      
      const box = await Box.create(
        shelfId,
        row['Storage ID'],
        row['Box Name'],
        row['Box Type'] || ''
      );
      boxMap[row['Storage ID']] = box.id;
      
      shelfBoxCount[row['Shelf ID']] = (shelfBoxCount[row['Shelf ID']] || 0) + 1;
    }
    
    Object.entries(shelfBoxCount).forEach(([shelfCode, count]) => {
      console.log(`  ✓ Shelf ${shelfCode}: ${count} boxes`);
    });

    // 3. Import Catalog Enums (for dropdowns)
    console.log('\n📋 Importing Catalog Reference Data...');
    const catalogSheet = workbook.Sheets['Types Catalog'];
    
    if (!catalogSheet) {
      console.log('  ⚠️  "Types Catalog" sheet not found in Excel file');
      console.log('  Available sheets:', Object.keys(workbook.Sheets));
    } else {
      const catalogData = XLSX.utils.sheet_to_json(catalogSheet);
      
      if (!catalogData || catalogData.length === 0) {
        console.log('  ⚠️  "Types Catalog" sheet is empty');
      } else {
        console.log(`  ℹ️  Found ${catalogData.length} rows in catalog`);
        console.log('  Columns found:', Object.keys(catalogData[0] || {}));
        
        // Map Excel column names to enum_type names used in frontend
        const enumTypeMap = {
          'Head Types': 'screw_head_type',
          'Drive Types': 'screw_drive_type',
          'Thread Types': 'screw_thread_type',
          'Screw Colors': 'screw_color',
          'Screw Materials': 'screw_material',
          'Screw Sizes': 'screw_size',
          'Nut type': 'nut_type',
          'Color': 'nut_color',
          'Item Type': 'other_item_type',
          'RC Company': 'rc_company',
          'RC Model': 'rc_model',
          'Oil Companies': 'oil_paste_company',
          'Oil Types': 'oil_paste_type',
          'Battery Sizes': 'battery_type'
        };
        
        for (const [excelCol, enumType] of Object.entries(enumTypeMap)) {
          const values = catalogData
            .map(row => row[excelCol])
            .filter(v => v && typeof v === 'string' && v.trim());
          
          if (values.length === 0) {
            console.log(`  ⚠️  No data found for column: ${excelCol}`);
          } else {
            for (const value of [...new Set(values)]) {
              await CatalogEnum.create(enumType, value);
            }
            console.log(`  ✓ ${enumType}: ${new Set(values).size} values`);
          }
        }
      }
    }

    // 4. Migrate any legacy RC Parts already sitting in items table
    console.log('\n🧹 Checking for legacy RC Part rows...');
    const legacyRcItems = await query(`SELECT * FROM items WHERE item_type = 'RC Parts'`);

    for (const row of legacyRcItems) {
      const params = typeof row.parameters === 'string' ? JSON.parse(row.parameters || '{}') : (row.parameters || {});
      const company = params.company || row.name || '';
      const model = params.model || '';
      const itemCode = params.item_code || row.name || '';

      if (itemCode) {
        await RCPart.create({
          company,
          model,
          item_code: itemCode,
          box_id: row.box_id,
          category_id: row.category_id,
          quantity: row.quantity || 0,
          notes: row.notes || ''
        });

        await exec(`DELETE FROM items WHERE id = ${isPostgresDB() ? '$1' : '?'}`, [row.id]);
      }
    }

    console.log(`  ✓ Migrated ${legacyRcItems.length} legacy RC Part rows`);

    // 5. Create Categories
    console.log('\n📂 Creating Item Categories...');
    const categories = ['Screws', 'Nuts', 'Bearings', 'Other Items', 'RC Parts', 'Oils/Pastes', 'Batteries'];
    const categoryMap = {};
    
    for (const catName of categories) {
      const cat = await Category.create(catName);
      categoryMap[catName] = cat.id;
      console.log(`  ✓ ${catName}`);
    }

    // 6. Import Screws
    console.log('\n🔩 Importing Screws...');
    const screwsSheet = workbook.Sheets['Screws'];
    if (!screwsSheet) {
      console.log('  ⚠️  "Screws" sheet not found');
    } else {
      const screwsData = XLSX.utils.sheet_to_json(screwsSheet);
      let screwCount = 0;
      
      // Extract unique enum values from screws data
      const uniqueSizes = new Set();
      const uniqueHeadTypes = new Set();
      const uniqueDriveTypes = new Set();
      const uniqueThreadTypes = new Set();
      const uniqueColors = new Set();
      const uniqueMaterials = new Set();
      
      for (const row of screwsData) {
        if (row['Size']) uniqueSizes.add(row['Size']);
        if (row['Head Type']) uniqueHeadTypes.add(row['Head Type']);
        if (row['Drive Type']) uniqueDriveTypes.add(row['Drive Type']);
        if (row['Thread Type']) uniqueThreadTypes.add(row['Thread Type']);
        if (row['Color']) uniqueColors.add(row['Color']);
        if (row['Material']) uniqueMaterials.add(row['Material']);
      }
      
      // Create enums from extracted values
      for (const size of uniqueSizes) {
        await CatalogEnum.create('screw_size', size);
      }
      for (const headType of uniqueHeadTypes) {
        await CatalogEnum.create('screw_head_type', headType);
      }
      for (const driveType of uniqueDriveTypes) {
        await CatalogEnum.create('screw_drive_type', driveType);
      }
      for (const threadType of uniqueThreadTypes) {
        await CatalogEnum.create('screw_thread_type', threadType);
      }
      for (const color of uniqueColors) {
        await CatalogEnum.create('screw_color', color);
      }
      for (const material of uniqueMaterials) {
        await CatalogEnum.create('screw_material', material);
      }
      
      if (uniqueSizes.size > 0) console.log(`  ✓ Screw sizes: ${uniqueSizes.size} values`);
      if (uniqueHeadTypes.size > 0) console.log(`  ✓ Head types: ${uniqueHeadTypes.size} values`);
      if (uniqueDriveTypes.size > 0) console.log(`  ✓ Drive types: ${uniqueDriveTypes.size} values`);
      if (uniqueThreadTypes.size > 0) console.log(`  ✓ Thread types: ${uniqueThreadTypes.size} values`);
      if (uniqueColors.size > 0) console.log(`  ✓ Colors: ${uniqueColors.size} values`);
      if (uniqueMaterials.size > 0) console.log(`  ✓ Materials: ${uniqueMaterials.size} values`);
      
      for (const row of screwsData) {
        if (!row['Storage ID'] || !row['Size']) continue;
        
        const boxId = boxMap[row['Storage ID']];
        if (!boxId) continue;
        
        await Screw.create({
          name: `${row['Size']} x ${row['Length']}mm ${row['Head Type']} ${row['Drive Type']}`,
          size: row['Size'] || '',
          length: row['Length'] || '',
          head_type: row['Head Type'] || '',
          drive_type: row['Drive Type'] || '',
          thread_type: row['Thread Type'] || '',
          color: row['Color'] || '',
          material: row['Material'] || '',
          box_id: boxId,
          category_id: categoryMap['Screws'],
          quantity: row['Amount'] || 0,
          notes: row['Notes'] || ''
        });
        screwCount++;
      }
      console.log(`  ✓ Imported ${screwCount} screw entries`);
    }

    // 6. Import Nuts
    console.log('\n⚙️  Importing Nuts...');
    const nutsSheet = workbook.Sheets['Nut'];
    const nutsData = XLSX.utils.sheet_to_json(nutsSheet);
    
    for (const row of nutsData) {
      if (!row['Storage ID'] || !row['Size']) continue;
      
      const boxId = boxMap[row['Storage ID']];
      if (!boxId) continue;
      
      await Item.create({
        name: `${row['Size']} ${row['Type']} ${row['Color']}`,
        item_type: 'Nuts',
        category_id: categoryMap['Nuts'],
        box_id: boxId,
        quantity: row['Amount'] || 0,
        parameters: {
          size: row['Size'],
          type: row['Type'],
          color: row['Color'],
          has_washer: row['Washer'] || false
        }
      });
    }
    console.log(`  ✓ Imported ${nutsData.length} nut entries`);

    // 7. Import Bearings
    console.log('\n🔄 Importing Bearings...');
    const bearingsSheet = workbook.Sheets['Bearings'];
    const bearingsData = XLSX.utils.sheet_to_json(bearingsSheet);
    
    for (const row of bearingsData) {
      if (!row['Storage ID']) continue;
      
      const boxId = boxMap[row['Storage ID']];
      if (!boxId) continue;
      
      await Item.create({
        name: row['Type'] || 'Bearing',
        item_type: 'Bearings',
        category_id: categoryMap['Bearings'],
        box_id: boxId,
        quantity: row['Amount'] || 0,
        notes: '',
        parameters: {
          type: row['Notes'] || '',
          id: row['ID'],
          od: row['OD'],
          width: row['Width']
        }
      });
    }
    console.log(`  ✓ Imported ${bearingsData.length} bearing entries`);

    // 8. Import Other Items
    console.log('\n📦 Importing Other Items...');
    const otherSheet = workbook.Sheets['Other Items'];
    const otherData = XLSX.utils.sheet_to_json(otherSheet);
    
    for (const row of otherData) {
      if (!row['Storage ID'] || !row['Name']) continue;
      
      const boxId = boxMap[row['Storage ID']];
      if (!boxId) continue;
      
      await Item.create({
        name: row['Name'],
        item_type: 'Other Items',
        category_id: categoryMap['Other Items'],
        box_id: boxId,
        quantity: row['Amount'] || 0,
        parameters: {
          item_type: row['Item Type'],
          size: row['Size'] || ''
        }
      });
    }
    console.log(`  ✓ Imported ${otherData.length} other items`);

    // 9. Import RC Parts into the dedicated rc_parts table
    console.log('\n🏎️  Importing RC Parts...');
    const rcSheet = workbook.Sheets['RC Parts'];
    const rcData = XLSX.utils.sheet_to_json(rcSheet);
    
    for (const row of rcData) {
      const itemCode = row['Part Number / Title'] || row['Item Code'] || row['Part Number'] || '';
      if (!row['Storage ID'] || !itemCode) continue;
      
      const boxId = boxMap[row['Storage ID']];
      if (!boxId) continue;
      
      await RCPart.create({
        company: row['Company'] || '',
        model: row['Model'] || '',
        item_code: itemCode,
        category_id: categoryMap['RC Parts'],
        box_id: boxId,
        quantity: row['Amount'] || 0,
        notes: row['Notes'] || ''
      });
    }
    console.log(`  ✓ Imported ${rcData.length} RC parts`);

    // 10. Import Oils/Pastes
    console.log('\n🛢️  Importing Oils & Pastes...');
    const oilsSheet = workbook.Sheets['OilsPAstes'];
    const oilsData = XLSX.utils.sheet_to_json(oilsSheet);
    
    for (const row of oilsData) {
      if (!row['Storage ID'] || !row['Type']) continue;
      
      const boxId = boxMap[row['Storage ID']];
      if (!boxId) continue;
      
      await Item.create({
        name: `${row['Company']} ${row['Type']} ${row['Weight/Type']}`,
        item_type: 'Oils/Pastes',
        category_id: categoryMap['Oils/Pastes'],
        box_id: boxId,
        quantity: row['Amount'] || 0,
        parameters: {
          company: row['Company'],
          type: row['Type'],
          weight_type: row['Weight/Type'],
          ml: row['ML']
        }
      });
    }
    console.log(`  ✓ Imported ${oilsData.length} oils/pastes`);

    // 11. Import Batteries
    console.log('\n🔋 Importing Batteries...');
    const batteriesSheet = workbook.Sheets['Batteries'];
    const batteriesData = XLSX.utils.sheet_to_json(batteriesSheet);
    
    // Use first shelf as default for batteries (they need to be stored somewhere)
    const defaultShelves = Object.values(shelfMap);
    const defaultShelf = defaultShelves[0];
    let batteryBox = await Box.getByStorageId('BATTERIES-01');
    if (!batteryBox && defaultShelf) {
      batteryBox = await Box.create(defaultShelf, 'BATTERIES-01', 'Batteries Box', 'box');
    }
    
    if (batteryBox) {
      for (const row of batteriesData) {
        if (!row['Type'] || !row['Model']) continue;
        
        await Item.create({
          name: `${row['Type']} - ${row['Model']}`,
          item_type: 'Batteries',
          category_id: categoryMap['Batteries'],
          box_id: batteryBox.id,
          quantity: row['Amount'] || 0,
          parameters: {
            type: row['Type'],
            model: row['Model'],
            expiration: row['Expiration']
          }
        });
      }
      console.log(`  ✓ Imported ${batteriesData.length} battery entries`);
    }

    console.log('\n✅ All data imported successfully!\n');
    console.log('Summary:');
    console.log(`  • Shelves: ${Object.keys(shelfMap).length}`);
    console.log(`  • Boxes: ${Object.keys(boxMap).length}`);
    console.log(`  • Categories: ${Object.keys(categoryMap).length}`);
    console.log(`  • Database: ${db}\n`);
    
    await closeDatabase();
  } catch (error) {
    console.error('\n❌ Error importing Excel:', error.message);
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

importExcelData();
