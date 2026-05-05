/**
 * migrate-all.js
 * Runs ALL migrations in order (001 → 002 → 003 → 004).
 * Each file is sent as a single query to PostgreSQL so that
 * PL/pgSQL DO $$ blocks and multi-statement DDL are handled
 * correctly by the server-side parser (no client-side splitting).
 *
 * Each migration is idempotent — safe to run multiple times.
 *
 * Usage: node scripts/migrate-all.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Run all 4 migrations in order.
// Pass --skip-applied to skip 001-003 when DB already has those tables.
// By default we run 004 (new) and skip 001-003 (already applied on NeonDB).
const skipApplied = !process.argv.includes('--all');

const MIGRATIONS = skipApplied
  ? [
      // 001-003 already applied — skip them to avoid view-column conflicts
      'migrations/004_comprehensive_fix.sql',
    ]
  : [
      'migrations/001_initial_schema.sql',
      'migrations/002_osm_features.sql',
      'migrations/003_schema_fixes.sql',
      'migrations/004_comprehensive_fix.sql',
    ];

async function runMigration(migrationFile) {
  const migrationPath = path.resolve(__dirname, '..', migrationFile);
  if (!fs.existsSync(migrationPath)) {
    console.warn(`  ⚠️  File not found, skipping: ${migrationFile}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();

  try {
    // Send the entire migration file as one query to the PostgreSQL server.
    // This preserves PL/pgSQL $$ delimiters and multi-statement DDL correctly.
    await client.query(sql);
    console.log(`  ✅  ${migrationFile}`);
    return true;
  } catch (e) {
    console.error(`  ❌  ${migrationFile} FAILED: ${e.message}`);
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TELLAPUR TRANSIT — Running All Migrations');
  console.log('══════════════════════════════════════════════════\n');

  let passed = 0;
  try {
    for (const migration of MIGRATIONS) {
      const ok = await runMigration(migration);
      if (ok) passed++;
    }
    console.log(`\n✅ ${passed}/${MIGRATIONS.length} migrations applied.\n`);
  } catch (e) {
    console.error('\n❌ Migration run stopped due to fatal error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
