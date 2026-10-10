#!/usr/bin/env node

/**
 * Script to analyze the structure of the Excel inventory file
 * Usage: node scripts/analyze-excel.js
 */

const XLSX = require('xlsx');
const path = require('path');

function analyzeExcelFile() {
  const filePath = path.join(__dirname, '..', 'Generic Items Storage.xlsx');
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log('\n=== EXCEL FILE STRUCTURE ===\n');
    console.log(`Sheets found: ${sheetNames.join(', ')}\n`);
    
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`\n--- Sheet: "${sheetName}" ---`);
      console.log(`Total rows: ${data.length}`);
      
      if (data.length > 0) {
        console.log('\nColumns:', Object.keys(data[0]));
        console.log('\nFirst 3 rows:');
        console.table(data.slice(0, 3));
      }
    });
    
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
    process.exit(1);
  }
}

analyzeExcelFile();
