require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../seeds', file), 'utf8'));
}

async function seedApartments(client) {
  const apartments = load('apartments.json');
  let inserted = 0;
  let updated = 0;

  for (const apt of apartments) {
    // Check if exists by name
    const { rows } = await client.query('SELECT id FROM apartments WHERE name = $1', [apt.name]);

    if (rows.length > 0) {
      // Update existing record with data from JSON (especially polygon and area)
      await client.query(
        `UPDATE apartments
         SET aliases = $2, area = $3, lat = $4, lng = $5,
             location = ST_SetSRID(ST_MakePoint($5, $4), 4326),
             polygon = $6,
             verified = $7,
             updated_at = NOW()
         WHERE id = $1`,
        [rows[0].id, apt.aliases, apt.area, apt.lat, apt.lng, apt.polygon, apt.verified]
      );
      updated++;
    } else {
      // Insert new
      await client.query(
        `INSERT INTO apartments (name, aliases, area, lat, lng, location, polygon, verified)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7)`,
        [apt.name, apt.aliases, apt.area, apt.lat, apt.lng, apt.polygon, apt.verified]
      );
      inserted++;
    }
  }

  console.log(`  Apartments: ${inserted} inserted, ${updated} updated from source`);
}

async function seedOffices(client) {
  const offices = load('offices.json');
  let inserted = 0, updated = 0;

  for (const office of offices) {
    // Check if exists by name
    const { rows } = await client.query('SELECT id FROM offices WHERE name = $1', [office.name]);

    if (rows.length > 0) {
      // Update gates and aliases; also ensure selection_count is at least 1
      await client.query(
        `UPDATE offices
         SET gates = $2, aliases = $3, verified = $4,
             selection_count = GREATEST(selection_count, 1)
         WHERE id = $1`,
        [rows[0].id, JSON.stringify(office.gates || []), office.aliases || [], office.verified]
      );
      updated++;
    } else {
      await client.query(
        `INSERT INTO offices (name, short_name, aliases, area, lat, lng, location, gates, verified, source)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, 'manual')`,
        [office.name, office.short_name, office.aliases || [], office.area,
         office.lat, office.lng, JSON.stringify(office.gates || []), office.verified]
      );
      inserted++;
    }
  }

  console.log(`  Offices: ${inserted} inserted, ${updated} updated`);
}

async function seedRoutes(client) {
  const routes = load('routes.json');
  let routesInserted = 0, shiftsInserted = 0, stopsInserted = 0;

  for (const route of routes) {
    // Check if route already exists by name
    const { rows: existing } = await client.query(
      'SELECT id FROM routes WHERE name = $1',
      [route.name]
    );

    let routeId;
    if (existing.length > 0) {
      routeId = existing[0].id;
    } else {
      const { rows } = await client.query(
        `INSERT INTO routes (name, origin_area, destination_area, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [route.name, route.origin_area, route.destination_area, route.status]
      );
      routeId = rows[0].id;
      routesInserted++;
    }

    // Seed stops (skip if already exist for this route)
    for (const stop of route.stops || []) {
      const { rowCount } = await client.query(
        // FIX: include location geography so ST_Distance/ST_Within work on stops
        `INSERT INTO stops (route_id, stop_type, label, lat, lng, sequence, location)
         SELECT $1, $2, $3, $4, $5, $6,
                ST_SetSRID(ST_MakePoint($5::float, $4::float), 4326)::geography
         WHERE NOT EXISTS (
           SELECT 1 FROM stops WHERE route_id = $1 AND sequence = $6
         )`,
        [routeId, stop.stop_type, stop.label,
         parseFloat(stop.lat), parseFloat(stop.lng), stop.sequence]
      );
      if (rowCount > 0) stopsInserted++;
    }

    // Seed shifts (skip if already exist for this route + direction + time)
    for (const shift of route.shifts || []) {
      const { rowCount } = await client.query(
        `INSERT INTO shifts (route_id, direction, departure_time, bus_capacity, label)
         SELECT $1, $2, $3::time, $4, $5
         WHERE NOT EXISTS (
           SELECT 1 FROM shifts
           WHERE route_id = $1 AND direction = $2 AND departure_time = $3::time
         )`,
        [routeId, shift.direction, shift.departure_time, shift.bus_capacity, shift.label]
      );
      if (rowCount > 0) shiftsInserted++;
    }
  }

  console.log(`  Routes: ${routesInserted} inserted (${routes.length - routesInserted} already existed)`);
  console.log(`  Stops:  ${stopsInserted} inserted`);
  console.log(`  Shifts: ${shiftsInserted} inserted`);

  // FIX: Back-fill apartment_id on pickup stops by fuzzy name match
  const { rowCount: aptLinked } = await client.query(`
    UPDATE stops st SET apartment_id = a.id
    FROM apartments a
    WHERE st.stop_type = 'pickup' AND st.apartment_id IS NULL
      AND (
        a.name ILIKE regexp_replace(st.label,
          '\\s*(Gate|Main Gate|Entry|Exit|South Gate|North Gate|East Gate|West Gate)\\s*$',
          '', 'i')
        OR regexp_replace(st.label,
          '\\s*(Gate|Main Gate|Entry|Exit|South Gate|North Gate|East Gate|West Gate)\\s*$',
          '', 'i') ILIKE '%' || a.name || '%'
        OR a.name ILIKE '%' || st.label || '%'
        OR st.label ILIKE '%' || a.name || '%'
      )
  `);
  console.log(`  Stops  → apartments linked: ${aptLinked} rows`);

  // FIX: Back-fill office_id on drop stops by fuzzy name match
  const { rowCount: offLinked } = await client.query(`
    UPDATE stops st SET office_id = o.id
    FROM offices o
    WHERE st.stop_type = 'drop' AND st.office_id IS NULL
      AND (
        o.name ILIKE st.label
        OR st.label ILIKE '%' || o.name || '%'
        OR o.name ILIKE '%' || st.label || '%'
        OR o.name ILIKE split_part(st.label, ' — ', 1)
        OR split_part(st.label, ' — ', 1) ILIKE '%' || o.name || '%'
        OR o.name ILIKE '%' || split_part(st.label, ' — ', 1) || '%'
      )
  `);
  console.log(`  Stops  → offices linked: ${offLinked} rows`);
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('\n🌱 Starting seed...\n');

    await client.query('BEGIN');

    console.log('📦 Apartments');
    await seedApartments(client);

    console.log('🏢 Offices');
    await seedOffices(client);

    console.log('🗺️  Routes, Stops & Shifts');
    await seedRoutes(client);

    await client.query('COMMIT');

    // Summary
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM apartments'),
      pool.query('SELECT COUNT(*) FROM offices'),
      pool.query('SELECT COUNT(*) FROM routes'),
      pool.query('SELECT COUNT(*) FROM stops'),
      pool.query('SELECT COUNT(*) FROM shifts'),
    ]);

    console.log('\n✅ Seed complete. Database totals:');
    console.log(`   Apartments : ${counts[0].rows[0].count}`);
    console.log(`   Offices    : ${counts[1].rows[0].count}`);
    console.log(`   Routes     : ${counts[2].rows[0].count}`);
    console.log(`   Stops      : ${counts[3].rows[0].count}`);
    console.log(`   Shifts     : ${counts[4].rows[0].count}`);
    console.log('\n⚙️  Admin setup reminder:');
    console.log('   After first login via Google, run this SQL to grant admin access:');
    console.log("   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';\n");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed, rolled back:', e.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
