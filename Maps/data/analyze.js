const fs = require('fs');
const geojson = JSON.parse(fs.readFileSync('osm-polygons.geojson', 'utf8'));
const apartments = JSON.parse(fs.readFileSync('seed-apartments.json', 'utf8'));
const offices = JSON.parse(fs.readFileSync('seed-offices.json', 'utf8'));
const unmatched = JSON.parse(fs.readFileSync('unmatched-polygons.json', 'utf8'));

const features = geojson.features;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function pointInPolygon(point, polygon) {
  const x = point[0], y = point[1];
  let inside = false;
  const coords = polygon[0];
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1];
    const xj = coords[j][0], yj = coords[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function fuzzyMatch(name1, name2) {
  const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!n1 || !n2) return false;
  return n1.includes(n2) || n2.includes(n1);
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCentroid(coords) {
  const ring = coords[0];
  let sumLng = 0, sumLat = 0;
  ring.forEach(p => { sumLng += p[0]; sumLat += p[1]; });
  return [sumLng / ring.length, sumLat / ring.length];
}

function matchLocation(loc) {
  // Strategy 1: Point-in-Polygon
  for (const f of features) {
    if (f.geometry.type !== 'Polygon') continue;
    if (pointInPolygon([loc.lng, loc.lat], f.geometry.coordinates)) {
      return { method: 'Point-in-Polygon', polygon: f.properties.name, osm_id: f.properties.osm_id, dist: 0 };
    }
  }

  // Strategy 2: Name fuzzy match
  for (const f of features) {
    if (fuzzyMatch(loc.name, f.properties.name || '')) {
      const c = getCentroid(f.geometry.coordinates);
      const d = haversine(loc.lat, loc.lng, c[1], c[0]);
      return { method: 'Name-Fuzzy', polygon: f.properties.name, osm_id: f.properties.osm_id, dist: Math.round(d) };
    }
  }

  // Strategy 3: Alias fuzzy match
  if (loc.aliases) {
    for (const alias of loc.aliases) {
      for (const f of features) {
        if (fuzzyMatch(alias, f.properties.name || '')) {
          const c = getCentroid(f.geometry.coordinates);
          const d = haversine(loc.lat, loc.lng, c[1], c[0]);
          return { method: 'Alias-Fuzzy', polygon: f.properties.name, osm_id: f.properties.osm_id, dist: Math.round(d) };
        }
      }
    }
  }

  // Strategy 4: Nearest centroid within 200m
  let nearest = null, nearestDist = Infinity;
  for (const f of features) {
    const c = getCentroid(f.geometry.coordinates);
    const d = haversine(loc.lat, loc.lng, c[1], c[0]);
    if (d < nearestDist) { nearestDist = d; nearest = f; }
  }
  if (nearestDist <= 200) {
    return { method: 'Nearest-Centroid(<200m)', polygon: nearest.properties.name, osm_id: nearest.properties.osm_id, dist: Math.round(nearestDist) };
  }

  return null;
}

// ============================================================
// SECTION 1: GEOJSON STATS
// ============================================================
console.log('');
console.log('============================================================');
console.log('  SECTION 1: osm-polygons.geojson STATISTICS');
console.log('============================================================');
console.log('Total polygon features:', features.length);

const typeCount = {};
features.forEach(f => {
  const t = f.properties.type || 'unknown';
  typeCount[t] = (typeCount[t] || 0) + 1;
});
console.log('Breakdown by building/landuse type:');
Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('');
console.log('Unmatched polygons file count:', Array.isArray(unmatched) ? unmatched.length : (unmatched.features ? unmatched.features.length : JSON.stringify(unmatched).substring(0,100)));

// ============================================================
// SECTION 2: APARTMENTS MATCHING
// ============================================================
console.log('');
console.log('============================================================');
console.log('  SECTION 2: APARTMENT MATCHING (' + apartments.length + ' total)');
console.log('============================================================');

let aptMatched = [], aptUnmatched = [];
apartments.forEach(apt => {
  const result = matchLocation(apt);
  if (result) {
    aptMatched.push({ name: apt.name, area: apt.area, verified: apt.verified, ...result });
  } else {
    aptUnmatched.push({ name: apt.name, area: apt.area, verified: apt.verified, lat: apt.lat, lng: apt.lng });
  }
});

const methodGroups = {};
aptMatched.forEach(m => { methodGroups[m.method] = (methodGroups[m.method] || 0) + 1; });

console.log('MATCHED: ' + aptMatched.length + '/' + apartments.length);
console.log('NOT MATCHED: ' + aptUnmatched.length + '/' + apartments.length);
console.log('Match method breakdown:');
Object.entries(methodGroups).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
console.log('');
console.log('--- MATCHED apartments ---');
aptMatched.forEach(m => {
  console.log('  [' + m.method + '] "' + m.name + '" (' + m.area + ') => polygon: "' + m.polygon + '" osm_id:' + m.osm_id + (m.dist > 0 ? ' ~' + m.dist + 'm away' : ' (exact)'));
});
console.log('');
console.log('--- UNMATCHED apartments (no polygon found) ---');
aptUnmatched.forEach(u => {
  console.log('  "' + u.name + '" (' + u.area + ') verified:' + u.verified + ' lat:' + u.lat + ' lng:' + u.lng);
});

// ============================================================
// SECTION 3: OFFICES MATCHING
// ============================================================
console.log('');
console.log('============================================================');
console.log('  SECTION 3: OFFICE MATCHING (' + offices.length + ' total)');
console.log('============================================================');

let offMatched = [], offUnmatched = [];
offices.forEach(off => {
  const result = matchLocation(off);
  if (result) {
    offMatched.push({ name: off.name, area: off.area, verified: off.verified, ...result });
  } else {
    offUnmatched.push({ name: off.name, area: off.area, verified: off.verified, lat: off.lat, lng: off.lng });
  }
});

const offMethodGroups = {};
offMatched.forEach(m => { offMethodGroups[m.method] = (offMethodGroups[m.method] || 0) + 1; });

console.log('MATCHED: ' + offMatched.length + '/' + offices.length);
console.log('NOT MATCHED: ' + offUnmatched.length + '/' + offices.length);
console.log('Match method breakdown:');
Object.entries(offMethodGroups).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
console.log('');
console.log('--- MATCHED offices ---');
offMatched.forEach(m => {
  console.log('  [' + m.method + '] "' + m.name + '" (' + m.area + ') => polygon: "' + m.polygon + '" osm_id:' + m.osm_id + (m.dist > 0 ? ' ~' + m.dist + 'm away' : ' (exact)'));
});
console.log('');
console.log('--- UNMATCHED offices ---');
offUnmatched.forEach(u => {
  console.log('  "' + u.name + '" (' + u.area + ') verified:' + u.verified + ' lat:' + u.lat + ' lng:' + u.lng);
});

// ============================================================
// SECTION 4: OVERALL SUMMARY
// ============================================================
console.log('');
console.log('============================================================');
console.log('  SECTION 4: FINAL SUMMARY');
console.log('============================================================');
const totalMatched = aptMatched.length + offMatched.length;
const totalUnmatched = aptUnmatched.length + offUnmatched.length;
const total = apartments.length + offices.length;
console.log('Total locations (apartments + offices): ' + total);
console.log('Total matched to GeoJSON polygon:       ' + totalMatched + ' (' + Math.round(totalMatched/total*100) + '%)');
console.log('Total NOT matched to any polygon:       ' + totalUnmatched + ' (' + Math.round(totalUnmatched/total*100) + '%)');
console.log('GeoJSON polygons total:                 ' + features.length);
console.log('GeoJSON polygons used in matching:      ~' + totalMatched + ' (one per location)');
console.log('GeoJSON polygons NOT used:              ~' + (features.length - totalMatched));
console.log('');
console.log('All verified apartments matched?        ' + (apartments.filter(a=>a.verified).every(a=>aptMatched.find(m=>m.name===a.name)) ? 'YES' : 'NO'));
console.log('All verified offices matched?           ' + (offices.filter(o=>o.verified).every(o=>offMatched.find(m=>m.name===o.name)) ? 'YES' : 'NO'));
