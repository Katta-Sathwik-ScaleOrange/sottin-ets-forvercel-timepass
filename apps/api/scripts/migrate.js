require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('Running database migration...');
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/001_initial_schema.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(e => { console.error('Migration failed:', e); process.exit(1); });
