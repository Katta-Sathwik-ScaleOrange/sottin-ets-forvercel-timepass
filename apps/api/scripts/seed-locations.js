/**
 * seed-locations.js
 *
 * CLI script to bulk-import apartments or offices from a JSON file
 * directly into the PostgreSQL database.
 *
 * Usage:
 *   node apps/api/scripts/seed-locations.js --type apartments --file Maps/data/seed-apartments.json
 *   node apps/api/scripts/seed-locations.js --type offices    --file Maps/data/seed-offices.json
 *
 * JSON format for apartments:
 *   [
 *     { "name": "My Home Bhooja", "area": "Tellapur", "lat": 17.484, "lng": 78.310,
 *       "aliases": ["bhooja", "my home bhooja"], "verified": true }
 *   ]
 *
 * JSON format for offices:
 *   [
 *     { "name": "Amazon Dev Centre", "short_name": "Amazon", "area": "Financial District",
 *       "lat": 17.425, "lng": 78.340, "building_name": "Amazon HQ",
 *       "aliases": ["amazon", "adc"], "verified": true,
 *       "gates": [{"label":"Main Gate","lat":17.425,"lng":78.340}] }
 *   ]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

// ─── Parse CLI Args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const type     = getArg('--type');   // 'apartments' | 'offices'
const filePath = getArg('--file');   // relative or absolute path to JSON

if (!type || !['apartments', 'offices'].includes(type)) {
  console.error('❌ Usage: node seed-locations.js --type apartments|offices --file <path>');
  process.exit(1);
}
if (!filePath) {
  console.error('❌ --file <path> is required');
  process.exit(1);
}

const absPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  console.error(`❌ File not found: ${absPath}`);
  process.exit(1);
}

// ─── Load JSON ────────────────────────────────────────────────────────────────

let records;
try {
  records = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  if (!Array.isArray(records)) throw new Error('Root must be a JSON array');
} catch (e) {
  console.error('❌ Failed to parse JSON:', e.message);
  process.exit(1);
}

console.log(`\n📂 Loaded ${records.length} records from ${path.basename(absPath)}`);

// ─── Apartment Seeder ─────────────────────────────────────────────────────────

async function seedApartments(items) {
  let inserted = 0, skipped = 0, errors = 0;

  for (const item of items) {
    const { name, area, lat, lng, aliases = [], verified = false } = item;

    if (!name || !area || lat == null || lng == null) {
      console.warn(`  ⚠ Skipping "${name || 'unnamed'}" — missing required fields`);
      skipped++;
      continue;
    }

    try {
      // Upsert: if same name+area exists, update; otherwise insert
      const { rows } = await pool.query(
        `INSERT INTO apartments
           (name, area, lat, lng, aliases, verified, location)
         VALUES ($1, $2, $3, $4, $5, $6,
                 ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)
         ON CONFLICT DO NOTHING
         RETURNING id, name`,
        [name, area, parseFloat(lat), parseFloat(lng),
         Array.isArray(aliases) ? aliases : [],
         Boolean(verified)]
      );

      if (rows.length > 0) {
        console.log(`  ✔ Inserted: "${name}" (${area})`);
        inserted++;
      } else {
        console.log(`  ↩ Skipped (duplicate): "${name}"`);
        skipped++;
      }
    } catch (e) {
      console.error(`  ✘ Error inserting "${name}":`, e.message);
      errors++;
    }
  }

  return { inserted, skipped, errors };
}

// ─── Office Seeder ────────────────────────────────────────────────────────────

async function seedOffices(items) {
  let inserted = 0, skipped = 0, errors = 0;

  for (const item of items) {
    const {
      name, short_name = null, area, lat, lng,
      aliases = [], building_name = null,
      gates = [], verified = false,
    } = item;

    if (!name || !area || lat == null || lng == null) {
      console.warn(`  ⚠ Skipping "${name || 'unnamed'}" — missing required fields`);
      skipped++;
      continue;
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO offices
           (name, short_name, area, lat, lng, aliases, building_name,
            gates, verified, source, selection_count, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual',0,
                 ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography)
         ON CONFLICT DO NOTHING
         RETURNING id, name`,
        [name, short_name, area, parseFloat(lat), parseFloat(lng),
         Array.isArray(aliases) ? aliases : [],
         building_name,
         JSON.stringify(Array.isArray(gates) ? gates : []),
         Boolean(verified)]
      );

      if (rows.length > 0) {
        console.log(`  ✔ Inserted: "${name}" (${area})`);
        inserted++;
      } else {
        console.log(`  ↩ Skipped (duplicate): "${name}"`);
        skipped++;
      }
    } catch (e) {
      console.error(`  ✘ Error inserting "${name}":`, e.message);
      errors++;
    }
  }

  return { inserted, skipped, errors };
}

// ─── Run ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🚀 Seeding ${type}...\n`);

  const stats = type === 'apartments'
    ? await seedApartments(records)
    : await seedOffices(records);

  console.log('\n========== Summary ==========');
  console.log(`  Type      : ${type}`);
  console.log(`  Total     : ${records.length}`);
  console.log(`  Inserted  : ${stats.inserted}`);
  console.log(`  Skipped   : ${stats.skipped}`);
  console.log(`  Errors    : ${stats.errors}`);
  console.log('==============================\n');

  await pool.end();
  process.exit(stats.errors > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  pool.end();
  process.exit(1);
});
