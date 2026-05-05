/**
 * OsmMiniMap — Leaflet map with green building polygon or pulsing pin.
 * Uses Carto dark-matter tiles for a clean look that matches the app's dark theme.
 * Falls back to OSM standard tiles if Carto is unavailable.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function OsmMiniMap({ lat, lng, polygonGeoJson = null, height = '200px', label = '' }) {
  const innerRef = useRef(null);
  const mapRef   = useRef(null);

  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const centre = [lat, lng];
    const zoom   = polygonGeoJson ? 17 : 16;

    const map = L.map(container, {
      center: centre, zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    mapRef.current = map;

    // Dark Carto tiles — no API key needed
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd' }
    ).addTo(map);

    // Attribution (tiny, bottom-right)
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a> © <a href="https://carto.com">CARTO</a>')
      .addTo(map);

    if (polygonGeoJson) {
      const polygonLayer = L.geoJSON(
        { type: 'Feature', geometry: polygonGeoJson, properties: {} },
        {
          style: {
            color:       '#22c55e',
            weight:      2.5,
            opacity:     1,
            fillColor:   '#22c55e',
            fillOpacity: 0.25,
          },
        }
      ).addTo(map);

      // Small green centre dot on the polygon centroid
      try {
        const bounds = polygonLayer.getBounds();
        const centre = bounds.getCenter();
        const dot = L.divIcon({
          className: '',
          html: `<div style="width:8px;height:8px;background:#22c55e;border-radius:50%;box-shadow:0 0 0 3px rgba(34,197,94,0.4);"></div>`,
          iconSize: [8, 8], iconAnchor: [4, 4],
        });
        L.marker(centre, { icon: dot }).addTo(map);
        map.fitBounds(bounds, { padding: [24, 24] });
      } catch (_) {
        map.setView(centre, zoom);
      }
    } else {
      // Pulsing green pin
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:20px;height:20px;">
            <div style="
              position:absolute;inset:0;
              background:rgba(34,197,94,0.25);
              border-radius:50%;
              animation:osmPulse 1.8s ease-out infinite;
            "></div>
            <div style="
              position:absolute;inset:4px;
              background:#22c55e;
              border:2px solid #fff;
              border-radius:50%;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
            "></div>
          </div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      L.marker(centre, { icon }).addTo(map);
    }

    const sizeTimer = setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 150);
    return () => {
      clearTimeout(sizeTimer);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [lat, lng, polygonGeoJson]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-surface-border relative"
         style={{ height }}
         aria-label={label ? `Map showing ${label}` : 'Location map'}>
      {/* Pulse animation injected once via a style tag inside the component */}
      <style>{`
        @keyframes osmPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.5); opacity: 0;   }
          100% { transform: scale(1);   opacity: 0;   }
        }
      `}</style>

      <div ref={innerRef} style={{ width: '100%', height: '100%' }} />

      {/* Label overlay at top-left */}
      {label && (
        <div className="absolute top-2 left-2 z-[500] pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-lg border border-white/10">
            {label}
          </div>
        </div>
      )}

      {/* OSM badge bottom-right (above attribution) */}
      <div className="absolute bottom-7 right-2 z-[500] pointer-events-none">
        <div className="bg-black/50 text-[9px] text-slate-400 px-1.5 py-0.5 rounded border border-white/10">
          OpenStreetMap
        </div>
      </div>
    </div>
  );
}
