import XLSX from 'xlsx';
import { initializeDatabase, closeDatabase, isPostgresDB, query, exec } from '../db.js';
import { Shelf, Box, Category, Item, RCPart, Screw, Nut, Bearing, OilPaste, Battery, CatalogEnum, OtherItem } from '../models/index.js';
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
    
    // Debug: Print all sheet names
    console.log('📋 Available sheets:', Object.keys(workbook.Sheets));
    
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
          'Battery Sizes': 'battery_size'
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

    // Add missing battery enums not in catalog
    console.log('\n  Adding missing battery enums...');
    const batteryCompanies = ['Varta', 'Energizer', 'Duracell', 'Rayovac', 'Panasonic', 'Sony'];
    const batteryModels = ['Max', 'Lithium', 'Heavy Duty', 'Alkaline', 'Eco', 'Plus'];
    const batteryTypes = ['Lithium', 'Alkaline', 'NiMH', 'Carbon Zinc', 'Silver Oxide', 'Zinc Air'];
    
    for (const value of batteryCompanies) {
      await CatalogEnum.create('battery_company', value);
    }
    for (const value of batteryModels) {
      await CatalogEnum.create('battery_model', value);
    }
    for (const value of batteryTypes) {
      await CatalogEnum.create('battery_type', value);
    }
    console.log('  ✓ battery_company: 6 values');
    console.log('  ✓ battery_model: 6 values');
    console.log('  ✓ battery_type: 6 values');

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

    // 7. Import Nuts
    console.log('\n⚙️  Importing Nuts...');
    const nutsSheet = workbook.Sheets['Nut'];
    if (!nutsSheet) {
      console.log('  ⚠️  "Nut" sheet not found');
    } else {
      const nutsData = XLSX.utils.sheet_to_json(nutsSheet);
      let nutCount = 0;
      
      // Extract unique enum values from nuts data
      const uniqueSizes = new Set();
      const uniqueTypes = new Set();
      const uniqueColors = new Set();
      
      for (const row of nutsData) {
        if (row['Size']) uniqueSizes.add(row['Size']);
        if (row['Type']) uniqueTypes.add(row['Type']);
        if (row['Color']) uniqueColors.add(row['Color']);
      }
      
      // Create enums from extracted values
      for (const size of uniqueSizes) {
        await CatalogEnum.create('nut_size', size);
      }
      for (const type of uniqueTypes) {
        await CatalogEnum.create('nut_type', type);
      }
      for (const color of uniqueColors) {
        await CatalogEnum.create('nut_color', color);
      }
      
      if (uniqueSizes.size > 0) console.log(`  ✓ Nut sizes: ${uniqueSizes.size} values`);
      if (uniqueTypes.size > 0) console.log(`  ✓ Nut types: ${uniqueTypes.size} values`);
      if (uniqueColors.size > 0) console.log(`  ✓ Nut colors: ${uniqueColors.size} values`);
      
      for (const row of nutsData) {
        if (!row['Storage ID'] || !row['Size']) continue;
        
        const boxId = boxMap[row['Storage ID']];
        if (!boxId) continue;
        
        await Nut.create({
          name: `${row['Size']} ${row['Type']} ${row['Color']}`,
          size: row['Size'] || '',
          type: row['Type'] || '',
          color: row['Color'] || '',
          has_washer: row['Washer'] ? true : false,
          box_id: boxId,
          category_id: categoryMap['Nuts'],
          quantity: row['Amount'] || 0,
          notes: row['Notes'] || ''
        });
        nutCount++;
      }
      console.log(`  ✓ Imported ${nutCount} nut entries`);
    }

    // 8. Import Bearings
    console.log('\n🔄 Importing Bearings...');
    const bearingsSheet = workbook.Sheets['Bearings'];
    if (!bearingsSheet) {
      console.log('  ⚠️  "Bearings" sheet not found');
    } else {
      const bearingsData = XLSX.utils.sheet_to_json(bearingsSheet);
      let bearingCount = 0;
      
      // Extract unique enum values from bearings data
      const uniqueTypes = new Set();
      const uniqueSealTypes = new Set();
      
      for (const row of bearingsData) {
        if (row['Type']) uniqueTypes.add(row['Type']);
        // Extract seal type from notes
        if (row['Notes']) uniqueSealTypes.add(row['Notes']);
      }
      
      // Create enums from extracted values
      for (const type of uniqueTypes) {
        await CatalogEnum.create('bearing_type', type);
      }
      for (const sealType of uniqueSealTypes) {
        await CatalogEnum.create('bearing_seal_type', sealType);
      }
      
      if (uniqueTypes.size > 0) console.log(`  ✓ Bearing types: ${uniqueTypes.size} values`);
      if (uniqueSealTypes.size > 0) console.log(`  ✓ Bearing seal types: ${uniqueSealTypes.size} values`);
      
      for (const row of bearingsData) {
        if (!row['Storage ID']) continue;
        
        const boxId = boxMap[row['Storage ID']];
        if (!boxId) continue;
        
        await Bearing.create({
          name: row['Type'] || 'Bearing',
          type: row['Type'] || '',
          seal_type: row['Notes'] || '',
          id_inner: row['ID'] ? parseFloat(row['ID']) : null,
          od: row['OD'] ? parseFloat(row['OD']) : null,
          width: row['Width'] ? parseFloat(row['Width']) : null,
          flanged: row['Flanged'] ? true : false,
          box_id: boxId,
          category_id: categoryMap['Bearings'],
          quantity: row['Amount'] || 0,
          notes: ''
        });
        bearingCount++;
      }
      console.log(`  ✓ Imported ${bearingCount} bearing entries`);
    }

    // 9. Import Other Items
    console.log('\n📦 Importing Other Items...');
    const otherSheet = workbook.Sheets['Other Items'];
    
    if (!otherSheet) {
      console.log('  ⚠️  "Other Items" sheet not found');
    } else {
      const otherData = XLSX.utils.sheet_to_json(otherSheet);
      
      // Clear existing Other Items from legacy items table
      await exec(`DELETE FROM items WHERE item_type = 'Other Items'`);
      console.log('  ✓ Cleared legacy Other Items from items table');
      
      // Clear existing Other Items from other_items table
      await exec(`DELETE FROM other_items`);
      console.log('  ✓ Cleared other_items table');
      
      let otherCount = 0;
      for (const row of otherData) {
        if (!row['Storage ID'] || !row['Name']) continue;
        
        const boxId = boxMap[row['Storage ID']];
        if (!boxId) continue;
        
        // Import into the new other_items table with all fields
        await OtherItem.create({
          item_type: row['Item Type'] || 'Other',
          name: row['Name'] || '',
          size: row['Size'] || '',
          company: row['Company'] || '',
          quantity: row['Amount'] || row['Quantity'] || 0,
          box_id: boxId,
          category_id: categoryMap['Other Items'],
          notes: row['Notes'] || ''
        });
        otherCount++;
      }
      console.log(`  ✓ Imported ${otherCount} other items into other_items table`);
    }

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
      
      await OilPaste.create({
        name: `${row['Company']} ${row['Type']}`,
        company: row['Company'],
        type: row['Type'],
        characteristic: row['Weight/Type'] || row['ML'] || '',
        category_id: categoryMap['Oils/Pastes'],
        box_id: boxId,
        quantity: row['Amount'] || 0,
        notes: ''
      });
    }
    console.log(`  ✓ Imported ${oilsData.length} oils/pastes`);

    // 11. Import Batteries
    console.log('\n🔋 Importing Batteries...');
    const batteriesSheet = workbook.Sheets['Batteries'];
    const batteriesData = XLSX.utils.sheet_to_json(batteriesSheet);
    
    // Get first available box as default for batteries
    const firstBoxId = Object.values(boxMap)[0];
    if (!firstBoxId) {
      console.log('  ❌ No boxes found - skipping batteries');
    } else {
      for (const row of batteriesData) {
        // Map columns from Excel - Excel has: Type, Amount, Model, Expiration
        const size = row['Type'] || '';  // "Type" in Excel is actually battery size (AA, AAA, 9V, etc)
        const model = row['Model'] || '';
        const amount = row['Amount'] || 0;
        
        if (!size) continue;
        
        // Convert Excel date serial number to ISO date string
        let expirationDate = null;
        if (row['Expiration']) {
          const excelDateNum = Number(row['Expiration']);
          if (!isNaN(excelDateNum)) {
            // Excel serial number: days since 1/1/1900
            const jsDate = new Date((excelDateNum - 25569) * 86400 * 1000);
            expirationDate = jsDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
          }
        }
        
        // Use default battery box if storage ID not provided
        const boxId = row['Storage ID'] ? boxMap[row['Storage ID']] : firstBoxId;
        if (!boxId) continue;
        
        await Battery.create({
          size: size,
          company: '', // Not provided in Excel
          model: model,
          type: '', // Chemistry not provided in Excel
          expiration_date: expirationDate,
          mah: null, // Not provided in Excel
          rechargeable: false, // Default to non-rechargeable
          category_id: categoryMap['Batteries'],
          box_id: boxId,
          quantity: amount,
          notes: ''
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
