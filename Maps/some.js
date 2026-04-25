// scripts/fetch-osm-polygons.js
const fetch = require('node-fetch');

const QUERY = `
[out:json];
(
  way["building"]["name"](17.40, 78.23, 17.53, 78.33);
  relation["building"]["name"](17.40, 78.23, 17.53, 78.33);
  way["landuse"="residential"]["name"](17.40, 78.23, 17.53, 78.33);
  relation["landuse"="residential"]["name"](17.40, 78.23, 17.53, 78.33);
);
out geom;
`;

async function fetchOSMPolygons() {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(QUERY)}`,
    });
    const data = await res.json();

    // Convert OSM geometry to GeoJSON polygons
    const features = data.elements
        .filter(el => el.geometry && el.tags?.name)
        .map(el => ({
            type: 'Feature',
            properties: {
                name: el.tags.name,
                osm_id: el.id,
                type: el.tags.building || el.tags.landuse,
            },
            geometry: {
                type: 'Polygon',
                coordinates: [el.geometry.map(p => [p.lon, p.lat])],
            },
        }));

    require('fs').writeFileSync(
        './data/osm-polygons.geojson',
        JSON.stringify({ type: 'FeatureCollection', features }, null, 2)
    );

    console.log(`Fetched ${features.length} polygons from OSM`);
}

fetchOSMPolygons();