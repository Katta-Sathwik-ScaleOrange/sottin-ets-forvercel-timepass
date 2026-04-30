/**
 * migrate-to-neon.js
 * Reads all data from local PostgreSQL (tt_db_v1) and imports into NeonDB
 * in the correct FK dependency order.
 */

const { Pool } = require('pg');

const LOCAL = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5433/tellapur_transit',
  ssl: false,
});

const NEON = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ZqCu46TAXHSJ@ep-fragrant-river-an9pfz7d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function clearNeon() {
  console.log('\n🗑️  Clearing NeonDB tables...');
  // Truncate in reverse FK order
  await NEON.query(`
    TRUNCATE TABLE
      pending_locations,
      seat_holds,
      seat_inventory,
      bookings,
      survey_responses,
      stops,
      shifts,
      routes,
      offices,
      apartments,
      users
    RESTART IDENTITY CASCADE
  `);
  console.log('✅ All tables cleared');
}

async function copyTable(tableName, columns) {
  console.log(`\n📋 Copying ${tableName}...`);

  const { rows } = await LOCAL.query(`SELECT * FROM ${tableName}`);

  if (rows.length === 0) {
    console.log(`   ℹ️  No rows in ${tableName}`);
    return;
  }

  // Build INSERT with ON CONFLICT DO NOTHING for safety
  const cols = columns.join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  let inserted = 0;
  let errors = 0;

  // Only JSONB columns need explicit JSON.stringify — NOT native pg arrays (text[], date[])
  const jsonCols = ['gates'];

  for (const row of rows) {
    const values = columns.map(col => {
      const val = row[col] !== undefined ? row[col] : null;
      // Serialize arrays/objects in JSONB columns to string
      if (jsonCols.includes(col) && val !== null && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    });
    try {
      await NEON.query(
        `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      inserted++;
    } catch (e) {
      console.error(`   ❌ Row error in ${tableName}:`, e.message, '| Row ID:', row.id);
      errors++;
    }
  }

  console.log(`   ✅ ${tableName}: ${inserted} inserted, ${errors} errors (out of ${rows.length} rows)`);
}

async function main() {
  console.log('🚀 Starting migration: Local PostgreSQL → NeonDB');

  try {
    // Verify connections
    await LOCAL.query('SELECT 1');
    console.log('✅ Local DB connected');
    await NEON.query('SELECT 1');
    console.log('✅ NeonDB connected');

    // Clear NeonDB
    await clearNeon();

    // Import in FK dependency order

    // 1. users — no FK deps
    await copyTable('users', [
      'id', 'google_id', 'name', 'email', 'phone', 'avatar_url',
      'role', 'whatsapp_opt', 'created_at', 'updated_at'
    ]);

    // 2. apartments — FK: suggested_by → users
    await copyTable('apartments', [
      'id', 'name', 'aliases', 'area', 'lat', 'lng',
      'location', 'polygon', 'place_id', 'verified',
      'suggested_by', 'created_at', 'osm_id', 'osm_type'
    ]);

    // 3. offices — no FK deps on app tables
    await copyTable('offices', [
      'id', 'name', 'short_name', 'aliases', 'area', 'lat', 'lng',
      'location', 'polygon', 'place_id', 'gates', 'source',
      'verified', 'selection_count', 'created_at',
      'building_name', 'osm_id', 'osm_type'
    ]);

    // 4. routes — no FK deps
    await copyTable('routes', [
      'id', 'name', 'origin_area', 'destination_area', 'status', 'created_at'
    ]);

    // 5. shifts — FK: route_id → routes
    await copyTable('shifts', [
      'id', 'route_id', 'direction', 'departure_time',
      'bus_capacity', 'label', 'created_at'
    ]);

    // 6. stops — FK: route_id → routes, apartment_id → apartments, office_id → offices
    await copyTable('stops', [
      'id', 'route_id', 'stop_type', 'apartment_id', 'office_id',
      'label', 'lat', 'lng', 'sequence', 'created_at'
    ]);

    // 7. bookings — FK: user_id → users, shift → shifts
    await copyTable('bookings', [
      'id', 'user_id', 'onward_shift_id', 'return_shift_id',
      'booking_dates', 'return_dates', 'onward_trips', 'return_trips',
      'per_trip_rate_onward', 'per_trip_rate_return', 'amount_total',
      'status', 'razorpay_order_id', 'razorpay_payment_id',
      'month_year', 'created_at', 'confirmed_at'
    ]);

    // 8. seat_holds — FK: user_id → users, shift_id → shifts
    await copyTable('seat_holds', [
      'id', 'user_id', 'shift_id', 'dates', 'expires_at', 'released', 'created_at'
    ]);

    // 9. seat_inventory — FK: shift_id → shifts
    await copyTable('seat_inventory', [
      'id', 'shift_id', 'date', 'seats_total', 'seats_booked', 'seats_held'
    ]);

    // 10. survey_responses — FK: user_id → users, apartment_id → apartments, office_id → offices
    await copyTable('survey_responses', [
      'id', 'user_id', 'apartment_id', 'apartment_name_raw',
      'office_id', 'office_name_raw', 'preferred_days',
      'estimated_days_month', 'morning_band', 'evening_band', 'submitted_at'
    ]);

    // 11. pending_locations — FK: user_id → users, merged_into → apartments
    await copyTable('pending_locations', [
      'id', 'lat', 'lng', 'location', 'user_id', 'raw_address',
      'suggested_name', 'status', 'merged_into', 'created_at'
    ]);

    // Verify final counts
    console.log('\n📊 Final verification:');
    const tables = ['users', 'apartments', 'offices', 'routes', 'shifts', 'stops',
                    'bookings', 'survey_responses', 'pending_locations'];
    for (const t of tables) {
      const { rows } = await NEON.query(`SELECT COUNT(*) as n FROM ${t}`);
      console.log(`   ${t}: ${rows[0].n} rows`);
    }

    console.log('\n✅ Migration complete!');

  } catch (e) {
    console.error('\n❌ Migration failed:', e.message);
    throw e;
  } finally {
    await LOCAL.end();
    await NEON.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
