require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run(label, sql, params = []) {
  const { rows } = await pool.query(sql, params);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(rows, null, 2));
}

async function main() {
  await run('Apartment location NULLs',
    `SELECT COUNT(*) AS total, SUM(CASE WHEN location IS NULL THEN 1 ELSE 0 END) AS null_location FROM apartments`
  );
  await run('Office location NULLs',
    `SELECT COUNT(*) AS total, SUM(CASE WHEN location IS NULL THEN 1 ELSE 0 END) AS null_location FROM offices`
  );
  // The date issue in seat_availability - dates showing as midnight UTC timestamps instead of plain dates
  await run('seat_inventory date column type check',
    `SELECT shift_id, date, date::text AS date_text FROM seat_inventory LIMIT 5`
  );
  // Stops missing location geometry
  await run('Stops - check if they have location geometry column',
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'stops' AND table_schema = 'public'`
  );
  // offices: check selection_count values
  await run('Offices with selection_count = 0 (should be at least 1)',
    `SELECT id, name, selection_count FROM offices WHERE selection_count = 0 LIMIT 20`
  );
  // apartments: check for entries with osm_id but missing polygon (import incomplete)
  await run('Apartments with osm_id but missing polygon',
    `SELECT id, name, osm_id FROM apartments WHERE osm_id IS NOT NULL AND polygon IS NULL LIMIT 20`
  );
  // Check that the suggest endpoint ON CONFLICT DO NOTHING works (no conflict target)
  await run('Apartments unique constraints',
    `SELECT constraint_name, constraint_type FROM information_schema.table_constraints
     WHERE table_name = 'apartments' AND table_schema = 'public'`
  );
  await pool.end();
}
main().catch(e => { console.error('FATAL:', e.message); pool.end(); });
