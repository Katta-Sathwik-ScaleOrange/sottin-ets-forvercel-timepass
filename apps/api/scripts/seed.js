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

  for (const apt of apartments) {
    const { rowCount } = await client.query(
      `INSERT INTO apartments (name, aliases, area, lat, lng, location, verified)
       SELECT $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6
       WHERE NOT EXISTS (SELECT 1 FROM apartments WHERE name = $1)`,
      [apt.name, apt.aliases, apt.area, apt.lat, apt.lng, apt.verified]
    );
    if (rowCount > 0) inserted++;
  }

  console.log(`  Apartments: ${inserted} inserted, ${apartments.length - inserted} already existed`);
}

async function seedOffices(client) {
  const offices = load('offices.json');
  let inserted = 0, updated = 0;

  for (const office of offices) {
    // Check if exists by name
    const { rows } = await client.query('SELECT id FROM offices WHERE name = $1', [office.name]);

    if (rows.length > 0) {
      // Update gates and aliases if they've changed
      await client.query(
        `UPDATE offices SET gates = $2, aliases = $3, verified = $4 WHERE id = $1`,
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
        `INSERT INTO stops (route_id, stop_type, label, lat, lng, sequence)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM stops WHERE route_id = $1 AND sequence = $6
         )`,
        [routeId, stop.stop_type, stop.label, stop.lat, stop.lng, stop.sequence]
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
