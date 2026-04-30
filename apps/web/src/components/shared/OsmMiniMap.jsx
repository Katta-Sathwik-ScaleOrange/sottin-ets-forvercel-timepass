/**
 * OsmMiniMap.jsx
 *
 * Renders a small Leaflet map with:
 *  - A green OSM building polygon (if polygonGeoJson is provided)
 *  - A green pulsing pin marker (if no polygon)
 *
 * Uses leaflet npm package (not CDN) for reliable Vite bundling.
 * Uses OpenStreetMap tiles — free, no API key required.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon paths broken by Vite asset hashing
// (Not needed here since we use divIcon, but kept for safety)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function OsmMiniMap({ lat, lng, polygonGeoJson = null, height = '180px', label = '' }) {
  const innerRef = useRef(null);   // the actual Leaflet target div
  const mapRef   = useRef(null);   // the Leaflet map instance

  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;

    // Tear down any existing map (handles React Strict Mode double-invoke in dev)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const centre = [lat, lng];
    const zoom   = polygonGeoJson ? 17 : 16;

    const map = L.map(container, {
      center            : centre,
      zoom,
      zoomControl       : false,
      attributionControl: false,
      dragging          : false,
      scrollWheelZoom   : false,
      doubleClickZoom   : false,
      touchZoom         : false,
    });

    mapRef.current = map;

    // OSM tile layer — free, no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Attribution control (tiny, bottom-right)
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    if (polygonGeoJson) {
      // Render the building polygon as a semi-transparent green overlay
      const polygonLayer = L.geoJSON(
        { type: 'Feature', geometry: polygonGeoJson, properties: {} },
        {
          style: {
            color      : '#22c55e',
            weight     : 2.5,
            opacity    : 1,
            fillColor  : '#22c55e',
            fillOpacity: 0.2,
          },
        }
      ).addTo(map);

      // Auto-zoom to fit the building polygon
      try {
        map.fitBounds(polygonLayer.getBounds(), { padding: [20, 20] });
      } catch (_) {
        // fitBounds can throw if polygon bounds are degenerate
        map.setView(centre, zoom);
      }
    } else {
      // No polygon → render a custom green pulse pin
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px; height:14px;
          background:#22c55e;
          border:2.5px solid #fff;
          border-radius:50%;
          box-shadow:0 0 0 4px rgba(34,197,94,0.35);
        "></div>`,
        iconSize  : [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(centre, { icon }).addTo(map);
    }

    // CRITICAL: force Leaflet to recalculate container dimensions after React
    // has finished painting the component. Without this, tiles may not render.
    const sizeTimer = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(sizeTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, polygonGeoJson]);

  return (
    // Outer div: overflow:hidden + border-radius for visual clipping
    <div
      style={{ height, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}
      className="w-full border border-surface-border"
      aria-label={label ? `Map showing ${label}` : 'Location map'}
    >
      {/* Inner div: the actual Leaflet mount target — must be 100% of parent */}
      <div ref={innerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
