require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const { rows } = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users','apartments','offices','routes','stops','shifts',
                         'seat_inventory','bookings','survey_responses','seat_holds','pending_locations')
    ORDER BY table_name, ordinal_position
  `);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
