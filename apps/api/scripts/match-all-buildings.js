require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const APT_DUMP_PATH = path.resolve(__dirname, '../seeds/apartments_db_dump.json');
const OFF_DUMP_PATH = path.resolve(__dirname, '../seeds/offices_db_dump.json');
const OSM_PATH = path.resolve(__dirname, '../../../Maps/data/osm-polygons.geojson');

function normaliseName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/bhuja/g, 'bhooja')
    .replace(/space station/g, 'aliens')
    .replace(/\b(apartments?|residency|residencies|towers?|blocks?|complex|enclave|gardens?|heights?|phase|centre|center|development|india|limited|offices?|campus|building|villas|elite|station|hub|park|resorts?|township|square|plaza|avenues?|homes?|house|manor)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const normA = normaliseName(a);
  const normB = normaliseName(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.length > 3 && normB.length > 3 && (normA.includes(normB) || normB.includes(normA))) return 0.85;

  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(normA), bb = bigrams(normB);
  if (ba.size === 0 || bb.size === 0) return 0;
  let intersection = 0;
  ba.forEach((bg) => { if (bb.has(bg)) intersection++; });
  const union = ba.size + bb.size - intersection;
  return intersection / union;
}

function getCentroid(coords) {
    let lat = 0, lng = 0;
    const ring = coords[0];
    ring.forEach(c => {
        lng += c[0];
        lat += c[1];
    });
    return { lat: lat / ring.length, lng: lng / ring.length };
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function isPointInPolygon(lat, lng, polygon) {
    const x = lng, y = lat;
    const ring = polygon[0];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

async function matchBuildings() {
  console.log('Starting final building-to-OSM matching...');

  const apartments = JSON.parse(fs.readFileSync(APT_DUMP_PATH, 'utf8'));
  const offices = JSON.parse(fs.readFileSync(OFF_DUMP_PATH, 'utf8'));
  const osmData = JSON.parse(fs.readFileSync(OSM_PATH, 'utf8'));

  const allBuildings = [
    ...apartments.map(a => ({ ...a, type: 'apartment' })),
    ...offices.map(o => ({ ...o, type: 'office' }))
  ];

  const features = osmData.features.map(f => ({
    ...f,
    centroid: getCentroid(f.geometry.coordinates)
  })).filter(f => {
    const tags = f.properties.tags || {};
    // Filter out obvious noise
    if (tags.highway || tags.railway || tags.natural === 'water') return false;
    if (tags.boundary === 'administrative') return false;
    return true;
  });

  let matchedCount = 0;
  const updates = [];

  for (const building of allBuildings) {
    let bestMatch = null;
    let maxScore = -1;

    for (const feat of features) {
      const dist = getDistance(building.lat, building.lng, feat.centroid.lat, feat.centroid.lng);
      
      const nameScore = similarity(building.name, feat.properties.name);
      let aliasScore = 0;
      if (building.aliases) {
        building.aliases.forEach(alias => {
          aliasScore = Math.max(aliasScore, similarity(alias, feat.properties.name));
        });
      }

      const inPolygon = isPointInPolygon(building.lat, building.lng, feat.geometry.coordinates);
      
      let score = Math.max(nameScore, aliasScore);
      
      // Proximity & Point-in-polygon
      if (inPolygon) score += 2.0; // Increased bonus for being inside
      
      if (dist < 0.05) score += 1.0;      // Very close (50m)
      else if (dist < 0.2) score += 0.5;   // Close (200m)
      else if (dist < 0.5) score += 0.2;   // Near (500m)
      else if (dist > 2.0) score -= 2.0;   // Too far (>2km)

      // Special case for coordinate errors: only if name is perfect match and reasonably nearby
      if (score > 0.95 && dist < 2.0) score += 1.0; 

      // Penalize matches that are generic or too small/large
      const osmName = feat.properties.name || '';
      if (osmName.length < 3 || 
          osmName.includes('Hyderabad') || 
          osmName.includes('University') || 
          osmName.includes('National Park') ||
          osmName.includes('Hill Ridge Appartments') ||
          osmName.includes('Jawaharlal Nehru Institute')) {
          score -= 1.5;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = feat;
      }
    }

    if (bestMatch && maxScore >= 1.5) { // Increased threshold from 1.1 to 1.5
      matchedCount++;
      const ring = bestMatch.geometry.coordinates[0];
      if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) {
          ring.push([ring[0][0], ring[0][1]]);
      }
      const coords = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
      const wkt = `POLYGON((${coords}))`;

      updates.push({
        type: building.type,
        id: building.id,
        name: building.name,
        osm_name: bestMatch.properties.name,
        osm_id: bestMatch.properties.osm_id,
        osm_type: bestMatch.properties.osm_type,
        wkt: wkt,
        new_lat: distToCentroid(building, bestMatch.centroid) > 0.5 ? bestMatch.centroid.lat : building.lat,
        new_lng: distToCentroid(building, bestMatch.centroid) > 0.5 ? bestMatch.centroid.lng : building.lng
      });
      console.log(`  ✔ [${building.type}] "${building.name}" → "${bestMatch.properties.name}" (score=${maxScore.toFixed(2)})`);
    } else {
      console.log(`  ✘ [${building.type}] "${building.name}" - Unmatched.`);
    }
  }

  function distToCentroid(b, c) {
      return getDistance(b.lat, b.lng, c.lat, c.lng);
  }

  console.log(`\nMatched ${matchedCount} out of ${allBuildings.length} buildings.`);

  console.log('Updating database...');
  for (const update of updates) {
    const table = update.type === 'apartment' ? 'apartments' : 'offices';
    try {
      await pool.query(
        `UPDATE ${table}
         SET polygon = ST_SetSRID(ST_GeomFromText($1), 4326)::geography,
             osm_id = $2,
             osm_type = $3,
             lat = $4,
             lng = $5,
             location = ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography
         WHERE id = $6`,
        [update.wkt, update.osm_id, update.osm_type, update.new_lat, update.new_lng, update.id]
      );
    } catch (err) {
      console.error(`Error updating ${update.name}: ${err.message}`);
    }
  }

  console.log('Database update complete.');
  const { rows: updatedApts } = await pool.query('SELECT * FROM apartments ORDER BY name');
  const { rows: updatedOffices } = await pool.query('SELECT * FROM offices ORDER BY name');
  fs.writeFileSync(path.resolve(__dirname, '../seeds/apartments.json'), JSON.stringify(updatedApts, null, 2));
  fs.writeFileSync(path.resolve(__dirname, '../seeds/offices.json'), JSON.stringify(updatedOffices, null, 2));
  await pool.end();
}

matchBuildings().catch(console.error);
