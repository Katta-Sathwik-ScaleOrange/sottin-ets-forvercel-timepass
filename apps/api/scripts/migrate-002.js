/**
 * migrate-002.js
 * Runs migration 002_osm_features.sql
 * Usage: node apps/api/scripts/migrate-002.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const fs   = require('fs');
const path = require('path');

async function migrate() {
  console.log('Running migration 002_osm_features.sql ...');
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/002_osm_features.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Migration 002 complete ✔');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration 002 failed:');
  console.error('  message:', e.message);
  console.error('  detail :', e.detail || '');
  console.error('  hint   :', e.hint || '');
  console.error('  code   :', e.code || '');
  process.exit(1);
});
