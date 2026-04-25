require('dotenv').config();
const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('Seeding apartments...');
  const apartments = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../seeds/apartments.json'), 'utf8')
  );

  for (const apt of apartments) {
    await pool.query(
      `INSERT INTO apartments (name, aliases, area, lat, lng, location, verified)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6)
       ON CONFLICT DO NOTHING`,
      [apt.name, apt.aliases, apt.area, apt.lat, apt.lng, apt.verified]
    );
  }
  console.log(`Seeded ${apartments.length} apartments`);

  console.log('Seeding offices...');
  const offices = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../seeds/offices.json'), 'utf8')
  );

  for (const office of offices) {
    await pool.query(
      `INSERT INTO offices (name, short_name, area, lat, lng, location, gates, verified, source)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, 'manual')
       ON CONFLICT DO NOTHING`,
      [office.name, office.short_name, office.area, office.lat, office.lng,
       JSON.stringify(office.gates || []), office.verified]
    );
  }
  console.log(`Seeded ${offices.length} offices`);

  process.exit(0);
}

seed().catch(e => { console.error('Seed failed:', e); process.exit(1); });
