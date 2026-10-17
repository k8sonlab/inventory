import XLSX from 'xlsx';
import { initializeDatabase, closeDatabase, clearApplicationData, isPostgresDB, query, queryOne, exec } from '../db.js';
import { runMigrations } from '../migrations/run.js';
import { Shelf, Box, Category, Item, RCPart, Screw, Nut, Bearing, OilPaste, Battery, CatalogEnum, OtherItem, WasherBearing } from '../models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importExcelData(filePath, { clean = false, empty = false } = {}) {
  let databaseInitialized = false;
  try {
    // Use provided path or default
    const excelFilePath = filePath || path.join(__dirname, '..', '..', 'Generic Items Storage.xlsx');
    
    console.log(`\n📂 Reading Excel file: ${excelFilePath}\n`);
    
    // Verify file exists
    if (!fs.existsSync(excelFilePath)) {
      throw new Error(`File not found: ${excelFilePath}`);
    }
    
    const workbook = XLSX.readFile(excelFilePath);
    if (clean || empty) {
      const requiredSheets = ['Shelves', 'Boxes', 'RC Parts', 'OilsPAstes', 'Batteries'];
      const missingSheets = requiredSheets.filter(name => !workbook.Sheets[name]);
      if (missingSheets.length > 0) {
        throw new Error(`Cannot reset import: missing required sheets: ${missingSheets.join(', ')}`);
      }
    }

    await initializeDatabase();
    databaseInitialized = true;
    await runMigrations();
    const db = isPostgresDB() ? 'PostgreSQL' : 'SQLite';
    console.log(`🗄️  Using ${db} database\n`);
    
    if (clean || empty) {
      console.warn(empty
        ? 'WARNING: --empty deletes all application data EXCEPT shelves and boxes before importing.'
        : 'WARNING: --clean deletes ALL application data before importing; tables are preserved.');
      await clearApplicationData({ preserveLocations: empty });
      console.log(empty ? 'Cleared application data; shelves and boxes preserved.' : 'Cleared all application data.');
    }
    
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
    const categories = ['Screws', 'Nuts', 'Other Items', 'RC Parts', 'Oils/Pastes', 'Batteries', 'Washers & Bearings'];
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

    // 8. Clear legacy Bearings (moved to Washers & Bearings table)
    console.log('\n🔄 Clearing legacy Bearings category...');
    await exec(`DELETE FROM items WHERE item_type = 'Bearings'`);
    console.log('  ✓ Cleared legacy Bearings from items table');

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
        
        // Skip washers - they'll be imported to washers_bearings instead
        if (row['Item Type'] === 'Washer') continue;
        
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

    // 10. Import Washers & Bearings (unified table)
    console.log('\n⚙️  Importing Washers & Bearings into unified table...');
    
    // Query for Washers & Bearings category (may not be in initial categoryMap)
    let wbCategory = categoryMap['Washers & Bearings'];
    if (!wbCategory) {
      const wbCat = await queryOne(`SELECT id FROM categories WHERE name = ${isPostgresDB() ? '$1' : '?'}`, ['Washers & Bearings']);
      wbCategory = wbCat?.id;
    }
    
    if (wbCategory) {
      let wbCount = 0;
      
      // Extract and create enums for washer/bearing subtypes
      const uniqueSubtypes = new Set();
      
      // Clear old enum values
      await exec(`DELETE FROM catalog_enums WHERE enum_type IN (${isPostgresDB() ? '$1, $2' : '?, ?'})`, ['washer_bearing_subtype', 'washer_bearing_material']);
      
      // Collect bearing subtypes
      if (workbook.SheetNames.includes('Bearings')) {
        const bearingsData = XLSX.utils.sheet_to_json(workbook.Sheets['Bearings']);
        for (const row of bearingsData) {
          // Only add Notes as subtype if it's NOT a dimension (e.g., skip "10x5", "15x6x1.2", "3x5x0.1")
          // Match patterns like: 10x5, 15x6x1.2, 3x5x0.1, 8x12x0.3, etc.
          const notes = String(row['Notes'] || '').trim();
          if (notes && !notes.match(/^[\d.]+[x][\d.]+/)) {
            uniqueSubtypes.add(notes);
          }
        }
      }
      
      // Collect bearing subtypes only
      // Note: Company names are not materials, so we skip the materials collection
      // Washers/Bearings will have empty materials for now
      if (workbook.SheetNames.includes('Other Items')) {
        const otherData = XLSX.utils.sheet_to_json(workbook.Sheets['Other Items']);
        for (const row of otherData) {
          if (row['Item Type'] === 'Washer') {
            // Only add Size as subtype if it's NOT a dimension (e.g., skip "10x5", "15x6x1.2", "3x5x0.1")
            // Match patterns like: 10x5, 15x6x1.2, 3x5x0.1, 8x12x0.3, etc.
            const size = String(row['Size'] || '').trim();
            if (size && !size.match(/^[\d.]+[x][\d.]+/)) {
              uniqueSubtypes.add(size);
            }
            // Skip Company - it's not a material, it's a supplier name
          }
        }
      }
      
      // Create enum values for subtypes only
      for (const subtype of uniqueSubtypes) {
        if (subtype.trim()) {
          await CatalogEnum.create('washer_bearing_subtype', subtype);
        }
      }
      
      if (uniqueSubtypes.size > 0) console.log(`  ✓ Washer/Bearing subtypes: ${uniqueSubtypes.size} values`);
      
      // Import Bearings from Bearings sheet
      if (workbook.SheetNames.includes('Bearings')) {
        const bearingsData = XLSX.utils.sheet_to_json(workbook.Sheets['Bearings']);
        for (const row of bearingsData) {
          if (!row['Storage ID']) continue;
          
          const boxId = boxMap[row['Storage ID']];
          if (!boxId) continue;
          
          // Only use Notes as subtype if it's NOT a dimension
          let bearingSubtype = '';
          const notes = String(row['Notes'] || '').trim();
          if (notes && !notes.match(/^[\d.]+[x][\d.]+/)) {
            bearingSubtype = notes;
          }
          
          await WasherBearing.create({
            category: 'Bearing',
            name: row['Type'] || 'Bearing',
            inner_diameter: row['ID'] ? parseFloat(row['ID']) : null,
            outer_diameter: row['OD'] ? parseFloat(row['OD']) : null,
            thickness: row['Width'] ? parseFloat(row['Width']) : null,
            subtype: bearingSubtype,
            material: '',
            quantity: row['Amount'] || 0,
            box_id: boxId,
            category_id: wbCategory,
            notes: ''
          });
          wbCount++;
        }
        console.log(`  ✓ Imported ${wbCount} bearings into washers_bearings table`);
      }
      
      // Import Washers from Other Items sheet (filter by item_type='Washer')
      if (workbook.SheetNames.includes('Other Items')) {
        const otherData = XLSX.utils.sheet_to_json(workbook.Sheets['Other Items']);
        let washerCount = 0;
        
        for (const row of otherData) {
          if (row['Item Type'] !== 'Washer') continue;
          
          // Allow washers without Storage ID - they'll have box_id = null
          let boxId = null;
          if (row['Storage ID']) {
            boxId = boxMap[row['Storage ID']];
            // If Storage ID exists but box not found, skip this washer
            if (!boxId) continue;
          }
          
          // Parse washer size (Size format: ID x OD x Thickness, e.g., "14x8x0.3")
          let inner_diameter = null, outer_diameter = null, thickness = null;
          let washerSubtype = '';
          
          if (row['Size']) {
            const size = String(row['Size']).trim();
            // Try pattern: ID x OD x Thickness (correct order)
            const match = size.toUpperCase().match(/(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)/);
            if (match) {
              inner_diameter = parseFloat(match[1]);
              outer_diameter = parseFloat(match[2]);
              thickness = parseFloat(match[3]);
            }
            
            // Only use Size as subtype if it's NOT a dimension
            if (!size.match(/^[\d.]+[x][\d.]+/)) {
              washerSubtype = size;
            }
          }
          
          await WasherBearing.create({
            category: 'Washer',
            name: row['Name'] || 'Washer',
            inner_diameter: inner_diameter,
            outer_diameter: outer_diameter,
            thickness: thickness,
            subtype: washerSubtype,
            material: '',
            quantity: row['Amount'] || row['Quantity'] || 0,
            box_id: boxId,
            category_id: wbCategory,
            notes: row['Notes'] || ''
          });
          washerCount++;
        }
        console.log(`  ✓ Imported ${washerCount} washers into washers_bearings table`);
      }
    } else {
      console.log('  ⚠️  "Washers & Bearings" category not found in database');
    }

    // 10. Import RC Parts into the dedicated rc_parts table
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

    // 11. Import Oils/Pastes
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
    if (databaseInitialized) await closeDatabase();
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const paths = args.filter(arg => !arg.startsWith('--'));
const unknownOptions = args.filter(arg => arg.startsWith('--') && !['--clean', '--empty', '--help'].includes(arg));

if (unknownOptions.length > 0 || paths.length > 1 || (args.includes('--clean') && args.includes('--empty'))) {
  console.error(`Invalid arguments: ${args.join(' ')}`);
  console.error('Usage: node utils/importExcel.js [path-to-excel-file] [--clean | --empty]');
  process.exitCode = 1;
} else if (args.includes('--help')) {
  console.log('Usage: node utils/importExcel.js [path-to-excel-file] [--clean | --empty]');
  console.log('--clean deletes ALL application data before importing; tables are preserved.');
  console.log('--empty deletes all application data EXCEPT shelves and boxes before importing.');
  console.log('Without a path, uses Generic Items Storage.xlsx in the project root.');
} else {
  importExcelData(paths[0], { clean: args.includes('--clean'), empty: args.includes('--empty') });
}
