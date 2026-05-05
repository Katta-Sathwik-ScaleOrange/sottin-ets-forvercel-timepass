require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run(label, sql, params = []) {
  const { rows } = await pool.query(sql, params);
  const status = rows.length === 0 ? '✅ CLEAN' : `⚠️  ${rows.length} row(s)`;
  console.log(`${status}  ${label}`);
  if (rows.length > 0) console.log('     →', JSON.stringify(rows[0]));
  return rows;
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FINAL SCHEMA & DATA VERIFICATION');
  console.log('══════════════════════════════════════════════════\n');

  // 1. Stale expired seat holds (should be 0 after migration)
  await run(
    'Expired seat_holds not released',
    `SELECT COUNT(*) AS n FROM seat_holds WHERE released = false AND expires_at < NOW()`
  ).then(r => {
    if (r[0]?.n > 0) console.log('     → FAIL: still have unreleased expired holds');
  });

  // 2. Offices with selection_count = 0 (should be 0 after migration)
  await run(
    'Offices with selection_count = 0',
    `SELECT COUNT(*) AS n FROM offices WHERE selection_count = 0`
  );

  // 3. Stops with NULL location (should be 0 after migration)
  await run(
    'Stops with NULL location geometry',
    `SELECT COUNT(*) AS n FROM stops WHERE location IS NULL`
  );

  // 4. Stops table has location column
  const { rows: stopCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='stops' AND column_name='location'`
  );
  console.log(`${stopCols.length > 0 ? '✅ CLEAN' : '❌ FAIL '}  stops.location column exists`);

  // 5. Routes have updated_at column
  const { rows: routeCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='routes' AND column_name='updated_at'`
  );
  console.log(`${routeCols.length > 0 ? '✅ CLEAN' : '❌ FAIL '}  routes.updated_at column exists`);

  // 6. survey_responses has data_consent column
  const { rows: srCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='survey_responses' AND column_name='data_consent'`
  );
  console.log(`${srCols.length > 0 ? '✅ CLEAN' : '❌ FAIL '}  survey_responses.data_consent column exists`);

  // 7. bookings has route_id column
  const { rows: bkCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name='route_id'`
  );
  console.log(`${bkCols.length > 0 ? '✅ CLEAN' : '❌ FAIL '}  bookings.route_id column exists`);

  // 8. seat_inventory constraint violations
  await run(
    'seat_inventory: booked+held > total (constraint violation)',
    `SELECT COUNT(*) AS n FROM seat_inventory WHERE seats_booked + seats_held > seats_total`
  );

  // 9. Dangling bookings (onward_shift_id references a deleted shift)
  await run(
    'Bookings with dangling onward_shift_id',
    `SELECT COUNT(*) AS n FROM bookings b LEFT JOIN shifts s ON b.onward_shift_id = s.id WHERE b.onward_shift_id IS NOT NULL AND s.id IS NULL`
  );

  // 10. Survey responses missing both apartment references
  await run(
    'Survey responses with no apartment reference at all',
    `SELECT COUNT(*) AS n FROM survey_responses WHERE apartment_id IS NULL AND apartment_name_raw IS NULL`
  );

  // 11. Date format from inventory API (should be YYYY-MM-DD string, not Date object)
  const { rows: invDates } = await pool.query(
    `SELECT to_char(date, 'YYYY-MM-DD') AS date FROM seat_inventory LIMIT 1`
  );
  const dateVal = invDates[0]?.date;
  const isGoodFormat = dateVal && /^\d{4}-\d{2}-\d{2}$/.test(dateVal);
  console.log(`${isGoodFormat ? '✅ CLEAN' : '❌ FAIL '}  seat_inventory date format = "${dateVal}" (should be YYYY-MM-DD)`);

  // 12. Offices with wrong source (manual offices tagged as google with no place_id)
  await run(
    'Manual offices incorrectly tagged as source=google',
    `SELECT COUNT(*) AS n FROM offices WHERE source='google' AND (place_id IS NULL OR place_id='')`
  );

  // 13. Summary counts
  console.log('\n──────────────────────────────────────────────────');
  console.log('  DATABASE SUMMARY');
  console.log('──────────────────────────────────────────────────');
  const tables = ['users','apartments','offices','routes','stops','shifts','seat_inventory','bookings','survey_responses','seat_holds','pending_locations'];
  for (const t of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
    console.log(`  ${t.padEnd(22)} : ${rows[0].n} rows`);
  }

  // 14. Route/shift connectivity
  const { rows: routes } = await pool.query(`SELECT r.name, r.status, COUNT(DISTINCT s.id) AS shifts, COUNT(DISTINCT st.id) AS stops FROM routes r LEFT JOIN shifts s ON s.route_id = r.id LEFT JOIN stops st ON st.route_id = r.id GROUP BY r.id ORDER BY r.name`);
  console.log('\n──────────────────────────────────────────────────');
  console.log('  ROUTE HEALTH');
  console.log('──────────────────────────────────────────────────');
  routes.forEach(r => console.log(`  [${r.status}] ${r.name.padEnd(45)} ${r.shifts} shifts  ${r.stops} stops`));

  console.log('\n══════════════════════════════════════════════════\n');
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); pool.end(); });
