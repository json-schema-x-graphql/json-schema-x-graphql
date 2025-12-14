/**
 * Database Seeder
 * 
 * Seeds SQLite database with data from CSV files
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SYSTEMS = ['contract_data', 'public_spending', 'legacy_procurement', 'intake_process', 'logistics_mgmt'];
const db = new Database(resolve(__dirname, '../data/mock-data.db'));

console.log('🌱 Seeding database from CSV files...\n');

// Clear existing data
db.exec('DELETE FROM mock_records');
console.log('✅ Cleared existing data\n');

let totalRecords = 0;

for (const system of SYSTEMS) {
  const csvPath = resolve(__dirname, '../seed-data', `${system}.csv`);
  
  try {
    const content = readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    const stmt = db.prepare(`
      INSERT INTO mock_records (system, record_id, data)
      VALUES (?, ?, ?)
    `);
    
    const insert = db.transaction((records) => {
      for (const record of records) {
        const recordId = record.piid || record.ia_piid_or_unique_id || record.contract_id || record.unique_award_key;
        if (recordId) {
          stmt.run(system, recordId, JSON.stringify(record));
        }
      }
    });
    
    insert(records);
    
    console.log(`✅ ${system.padEnd(12)} - ${records.length} records`);
    totalRecords += records.length;
    
  } catch (e) {
    console.error(`❌ ${system.padEnd(12)} - ${e.message}`);
  }
}

console.log(`\n✨ Seeded ${totalRecords} total records\n`);

db.close();
