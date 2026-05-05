require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run(label, sql, params = []) {
  const { rows } = await pool.query(sql, params);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(rows, null, 2));
}

async function main() {
  // 1. Apartments - location vs lat/lng mismatch (NULL locations where lat/lng exist)
  await run('Apartments with NULL location but valid lat/lng',
    `SELECT id, name, lat, lng FROM apartments WHERE location IS NULL AND lat IS NOT NULL LIMIT 20`
  );

  // 2. Apartments - NULL polygon count
  await run('Apartments polygon stats',
    `SELECT COUNT(*) AS total, 
            SUM(CASE WHEN polygon IS NULL THEN 1 ELSE 0 END) AS null_polygon,
            SUM(CASE WHEN location IS NULL THEN 1 ELSE 0 END) AS null_location,
            SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) AS verified
     FROM apartments`
  );

  // 3. Offices - location vs lat/lng mismatch
  await run('Offices with NULL location but valid lat/lng',
    `SELECT id, name, lat, lng FROM offices WHERE location IS NULL AND lat IS NOT NULL LIMIT 20`
  );

  // 4. Offices stats
  await run('Offices polygon/location stats',
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN polygon IS NULL THEN 1 ELSE 0 END) AS null_polygon,
            SUM(CASE WHEN location IS NULL THEN 1 ELSE 0 END) AS null_location,
            SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) AS verified
     FROM offices`
  );

  // 5. Stops with NULL apartment_id AND NULL office_id (orphaned stops)
  await run('Stops where BOTH apartment_id and office_id are NULL',
    `SELECT id, route_id, stop_type, label FROM stops
     WHERE apartment_id IS NULL AND office_id IS NULL LIMIT 20`
  );

  // 6. Survey responses with NULL apartment_id AND NULL apartment_name_raw
  await run('Survey responses missing both apartment_id and apartment_name_raw',
    `SELECT id, user_id FROM survey_responses
     WHERE apartment_id IS NULL AND apartment_name_raw IS NULL LIMIT 20`
  );

  // 7. Bookings with invalid shift references
  await run('Bookings with dangling onward_shift_id',
    `SELECT b.id FROM bookings b
     LEFT JOIN shifts s ON b.onward_shift_id = s.id
     WHERE b.onward_shift_id IS NOT NULL AND s.id IS NULL LIMIT 10`
  );

  // 8. seat_inventory where seats_booked + seats_held > seats_total (violation)
  await run('seat_inventory constraint violations',
    `SELECT * FROM seat_inventory 
     WHERE seats_booked + seats_held > seats_total LIMIT 10`
  );

  // 9. Seat holds that are expired but not marked released
  await run('Expired seat holds not released',
    `SELECT id, shift_id, expires_at FROM seat_holds
     WHERE released = false AND expires_at < NOW() LIMIT 20`
  );

  // 10. Bookings status summary
  await run('Bookings status distribution',
    `SELECT status, COUNT(*) FROM bookings GROUP BY status`
  );

  // 11. Routes with no shifts
  await run('Routes with no shifts',
    `SELECT r.id, r.name, r.status FROM routes r
     WHERE NOT EXISTS (SELECT 1 FROM shifts s WHERE s.route_id = r.id)`
  );

  // 12. Routes with no stops
  await run('Routes with no stops',
    `SELECT r.id, r.name, r.status FROM routes r
     WHERE NOT EXISTS (SELECT 1 FROM stops st WHERE st.route_id = r.id)`
  );

  // 13. Check if survey_od_matrix view works
  await run('OD Matrix view (first 5 rows)',
    `SELECT * FROM survey_od_matrix LIMIT 5`
  );

  // 14. Check if seat_availability view works
  await run('seat_availability view (first 3 rows)',
    `SELECT * FROM seat_availability LIMIT 3`
  );

  // 15. Pending locations health
  await run('Pending locations status breakdown',
    `SELECT status, COUNT(*) FROM pending_locations GROUP BY status`
  );

  await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); pool.end(); });
