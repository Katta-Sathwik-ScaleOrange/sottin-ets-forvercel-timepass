/**
 * import-osm-polygons.js
 *
 * Reads Maps/data/osm-polygons.geojson (already fetched from Overpass API)
 * and fuzzy-matches each feature's name against the apartments table.
 * On match: updates polygon + osm_id columns.
 * No match: logs to unmatched.json for manual review.
 *
 * Run from project root:
 *   node apps/api/scripts/import-osm-polygons.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const GEOJSON_PATH = path.resolve(__dirname, '../../../Maps/data/osm-polygons.geojson');
const UNMATCHED_PATH = path.resolve(__dirname, '../../../Maps/data/unmatched-polygons.json');

// Normalise a name for comparison: lowercase, remove common words
function normaliseName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\b(apartments?|residency|residencies|towers?|blocks?|complex|enclave|gardens?|heights?|phase)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple Jaccard similarity on bigrams
function similarity(a, b) {
  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(a), bb = bigrams(b);
  let intersection = 0;
  ba.forEach((bg) => { if (bb.has(bg)) intersection++; });
  const union = ba.size + bb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function run() {
  if (!fs.existsSync(GEOJSON_PATH)) {
    console.error(`GeoJSON file not found at:\n  ${GEOJSON_PATH}`);
    console.error('Run Maps/some.js first to fetch OSM polygons.');
    process.exit(1);
  }

  console.log(`Reading ${GEOJSON_PATH} ...`);
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
  const features = geojson.features.filter(
    (f) => f.properties?.name && f.geometry?.type === 'Polygon'
  );
  console.log(`Found ${features.length} named polygon features in OSM data.`);

  // Load all apartments from DB
  const { rows: apartments } = await pool.query(
    'SELECT id, name FROM apartments WHERE verified = true OR verified = false'
  );
  console.log(`Loaded ${apartments.length} apartments from DB.`);

  let matched = 0;
  let updated = 0;
  const unmatched = [];

  for (const feature of features) {
    const osmName = feature.properties.name;
    const osmId   = feature.properties.osm_id;
    const osmType = feature.properties.type || 'way';
    const normOsm = normaliseName(osmName);

    // Find best-matching apartment
    let bestApt   = null;
    let bestScore = 0;

    for (const apt of apartments) {
      const normApt = normaliseName(apt.name);
      const score   = similarity(normOsm, normApt);
      if (score > bestScore) { bestScore = score; bestApt = apt; }
    }

    const THRESHOLD = 0.35; // Minimum Jaccard similarity to accept as a match
    if (bestScore >= THRESHOLD && bestApt) {
      matched++;
      // Build WKT polygon from GeoJSON coordinates
      const coords = feature.geometry.coordinates[0]
        .map(([lng, lat]) => `${lng} ${lat}`)
        .join(', ');
      const wkt = `POLYGON((${coords}))`;

      try {
        await pool.query(
          `UPDATE apartments
           SET polygon  = ST_SetSRID(ST_GeomFromText($1), 4326)::geography,
               osm_id   = $2,
               osm_type = $3
           WHERE id = $4
             AND polygon IS NULL`,
          // Only update rows that don't already have a polygon set
          [wkt, osmId, osmType, bestApt.id]
        );
        updated++;
        console.log(`  ✔ "${osmName}" → "${bestApt.name}" (score=${bestScore.toFixed(2)})`);
      } catch (err) {
        console.warn(`  ⚠ DB error for "${osmName}": ${err.message}`);
      }
    } else {
      unmatched.push({
        osm_name : osmName,
        osm_id   : osmId,
        best_apt : bestApt?.name || null,
        score    : bestScore,
      });
    }
  }

  // Write unmatched for manual review
  fs.writeFileSync(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2));

  console.log('\n========== Summary ==========');
  console.log(`  OSM features processed : ${features.length}`);
  console.log(`  Matched to apartments  : ${matched}`);
  console.log(`  DB rows updated        : ${updated}`);
  console.log(`  Unmatched (see file)   : ${unmatched.length}`);
  console.log(`  Unmatched log          : ${UNMATCHED_PATH}`);

  await pool.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Import failed:', err);
  pool.end();
  process.exit(1);
});
