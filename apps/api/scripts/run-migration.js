/**
 * run-migration.js
 * Applies a SQL migration file to the NeonDB.
 * Usage: node scripts/run-migration.js migrations/003_schema_fixes.sql
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.js <migration-file>');
  process.exit(1);
}

const migrationPath = path.resolve(__dirname, '..', migrationFile);
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log(`\n🚀 Running migration: ${migrationFile}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration applied successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration FAILED. Transaction rolled back.');
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
