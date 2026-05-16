const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Bounding box for Tellapur -> Financial District -> Madhapur
// [minLat, minLng, maxLat, maxLng]
const BBOX = '17.38, 78.20, 17.56, 78.45';

const QUERY = `
[out:json][timeout:180];
(
  way["name"](${BBOX});
  relation["name"](${BBOX});
);
out body geom;
`;

async function fetchOSMPolygons() {
    console.log('Fetching ALL named OSM polygons from Overpass API...');
    try {
        // Using a different mirror to avoid rate limits
        const url = `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(QUERY)}`;
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'TellapurTransitBuildingMatcher/1.1' },
            timeout: 120000 
        });

        const data = response.data;
        const features = [];

        console.log(`Processing ${data.elements.length} OSM elements...`);

        for (const el of data.elements) {
            if (!el.tags || !el.tags.name) continue;

            let geometry = null;

            if (el.type === 'way' && el.geometry) {
                // Check if it's a closed way (polygon)
                const first = el.geometry[0];
                const last = el.geometry[el.geometry.length - 1];
                if (first.lat === last.lat && first.lon === last.lon && el.geometry.length >= 4) {
                    geometry = {
                        type: 'Polygon',
                        coordinates: [el.geometry.map(p => [p.lon, p.lat])]
                    };
                }
            } else if (el.type === 'relation' && el.members) {
                // Find outer rings
                const outer = el.members.find(m => m.role === 'outer' && m.geometry);
                if (outer) {
                    geometry = {
                        type: 'Polygon',
                        coordinates: [outer.geometry.map(p => [p.lon, p.lat])]
                    };
                }
            }

            if (geometry) {
                features.push({
                    type: 'Feature',
                    properties: {
                        name: el.tags.name,
                        osm_id: el.id,
                        osm_type: el.type,
                        tags: el.tags
                    },
                    geometry
                });
            }
        }

        const geojson = {
            type: 'FeatureCollection',
            features
        };

        const outPath = path.resolve(__dirname, '../../../Maps/data/osm-polygons.geojson');
        fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));

        console.log(`Successfully fetched and saved ${features.length} polygons to ${outPath}`);
    } catch (error) {
        console.error('Error fetching OSM data:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

fetchOSMPolygons();
