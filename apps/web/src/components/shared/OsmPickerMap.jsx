/**
 * OsmPickerMap — Interactive Leaflet map for picking apartments / offices.
 *
 * Features:
 *  • Full pan + zoom (draggable)
 *  • All available locations rendered as animated green markers
 *  • Click a marker → shows popup with name/area + "Select" button
 *  • Click anywhere on blank map → drops a draggable pin and searches nearby via API
 *  • "Locate me" button — GPS-based nearest-location search
 *  • Smooth dark-Carto tile theme matching the app's dark brand
 *
 * Props:
 *   mode         'apartment' | 'office'
 *   locations    Array of { id, name, area, lat, lng, polygon_geojson? }   (pre-loaded list)
 *   defaultCenter  [lat, lng]  — map centre on open
 *   defaultZoom  number
 *   onSelect     fn(item)  — fires when user confirms selection
 *   onClose      fn()      — fires when user taps the X / closes
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

// ─── Leaflet default icon fix (Vite asset pipeline) ──────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Icon factories ───────────────────────────────────────────────────────────
function makeLocationIcon(selected = false) {
  const size   = selected ? 26 : 20;
  const glow   = selected ? 'rgba(34,197,94,0.45)' : 'rgba(34,197,94,0.25)';
  const border = selected ? '#fff' : 'rgba(255,255,255,0.6)';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          position:absolute;inset:0;
          background:${glow};
          border-radius:50%;
          animation:osmPulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;inset:${selected ? 4 : 3}px;
          background:#22c55e;
          border:2.5px solid ${border};
          border-radius:50%;
          box-shadow:0 2px 10px rgba(0,0,0,0.5);
        "></div>
      </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeDroppedPinIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          width:18px;height:18px;
          background:#f59e0b;
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 2px 10px rgba(0,0,0,0.6);
        "></div>
        <div style="
          width:2px;height:10px;
          background:#f59e0b;
          border-radius:1px;
        "></div>
      </div>`,
    iconSize:   [18, 28],
    iconAnchor: [9, 28],
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OsmPickerMap({
  mode          = 'apartment',
  locations     = [],
  defaultCenter = [17.4847, 78.3102],
  defaultZoom   = 14,
  onSelect,
  onClose,
}) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markersRef    = useRef([]);
  const pinMarkerRef  = useRef(null);
  const polygonRef    = useRef(null);

  const [selectedItem, setSelectedItem]   = useState(null);
  const [nearbyItems,  setNearbyItems]    = useState([]);
  const [gpsLoading,   setGpsLoading]     = useState(false);
  const [pinSearching, setPinSearching]   = useState(false);
  const [hint,         setHint]           = useState('Tap a marker to select, or tap the map to drop a pin');

  // ── Polygon helpers ──────────────────────────────────────────────────────────
  const parsePolygon = (item) => {
    if (!item?.polygon_geojson) return null;
    if (typeof item.polygon_geojson === 'string') {
      try { return JSON.parse(item.polygon_geojson); } catch { return null; }
    }
    return item.polygon_geojson;
  };

  const showPolygon = useCallback((map, item) => {
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    const geo = parsePolygon(item);
    if (!geo) return;
    polygonRef.current = L.geoJSON(
      { type: 'Feature', geometry: geo, properties: {} },
      { style: { color: '#22c55e', weight: 2.5, opacity: 1, fillColor: '#22c55e', fillOpacity: 0.2 } }
    ).addTo(map);
    try {
      const bounds = polygonRef.current.getBounds();
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 18 });
    } catch (_) {}
  }, []);

  // ── Build popup HTML ─────────────────────────────────────────────────────────
  const buildPopupHtml = (item) => `
    <div style="
      font-family:'Inter',sans-serif;
      background:#1a1a24;
      border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;
      padding:12px 14px;
      min-width:180px;
      max-width:240px;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);
    ">
      <p style="color:#fff;font-weight:600;font-size:13px;margin:0 0 2px;">${item.name}</p>
      <p style="color:#94a3b8;font-size:11px;margin:0 0 10px;">${item.area || ''}</p>
      <button
        id="osm-select-btn"
        style="
          width:100%;padding:7px 0;
          background:#22c55e;color:#fff;
          border:none;border-radius:8px;
          font-size:12px;font-weight:600;
          cursor:pointer;
          transition:opacity 0.15s;
        "
        onmouseover="this.style.opacity='0.85'"
        onmouseout="this.style.opacity='1'"
      >
        ✓ Select this location
      </button>
    </div>`;

  // ── Render all location markers ───────────────────────────────────────────────
  const renderMarkers = useCallback((map, items, selected) => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    items.forEach(item => {
      if (!item.lat || !item.lng) return;
      const isSelected = selected?.id === item.id;
      const marker = L.marker([item.lat, item.lng], {
        icon: makeLocationIcon(isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      const popup = L.popup({
        closeButton: false,
        className:   'osm-picker-popup',
        maxWidth:    260,
        offset:      [0, -10],
      }).setContent(buildPopupHtml(item));

      marker.on('click', () => {
        map.eachLayer(l => { if (l instanceof L.Popup) l.remove(); });
        marker.bindPopup(popup).openPopup();
        // Attach button listener after popup DOM renders
        setTimeout(() => {
          const btn = document.getElementById('osm-select-btn');
          if (btn) btn.onclick = () => confirmSelect(map, item);
        }, 80);
      });

      markersRef.current.push(marker);
    });
  }, []); // eslint-disable-line

  const confirmSelect = useCallback((map, item) => {
    setSelectedItem(item);
    map.eachLayer(l => { if (l instanceof L.Popup) l.remove(); });
    showPolygon(map, item);
    // Re-render markers to highlight selected
    renderMarkers(map, locations.length > 0 ? locations : nearbyItems, item);
    setHint(`✓ ${item.name} selected — tap "Confirm" below`);
  }, [locations, nearbyItems, showPolygon, renderMarkers]);

  // ── Drop-pin search (click on blank map) ─────────────────────────────────────
  const searchNearPin = useCallback(async (map, lat, lng) => {
    setPinSearching(true);
    setHint('Searching nearby locations…');
    try {
      const endpoint = mode === 'apartment'
        ? `/apartments/detect?lat=${lat}&lng=${lng}`
        : `/offices/search?q=&lat=${lat}&lng=${lng}`;

      const data = await api.get(endpoint);

      let nearby = [];
      if (mode === 'apartment') {
        if (data.match) {
          nearby = [data.match];
        } else {
          nearby = data.nearby || [];
        }
      } else {
        nearby = data.results || data || [];
      }

      setNearbyItems(nearby);
      renderMarkers(map, nearby, null);

      if (nearby.length === 0) {
        setHint('No locations found near this pin. Try panning the map.');
      } else {
        setHint(`Found ${nearby.length} location${nearby.length > 1 ? 's' : ''} — tap a marker to select`);
      }
    } catch (e) {
      console.error('Pin search failed:', e);
      setHint('Search failed. Try tapping a marker directly.');
    } finally {
      setPinSearching(false);
    }
  }, [mode, renderMarkers]);

  // ── GPS button ────────────────────────────────────────────────────────────────
  const handleGPS = useCallback(() => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;
    setGpsLoading(true);
    setHint('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.setView([lat, lng], 16);
        // Drop pin at detected location
        if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
        pinMarkerRef.current = L.marker([lat, lng], { icon: makeDroppedPinIcon(), draggable: true }).addTo(map);
        pinMarkerRef.current.on('dragend', (e) => {
          const { lat: nlat, lng: nlng } = e.target.getLatLng();
          searchNearPin(map, nlat, nlng);
        });
        await searchNearPin(map, lat, lng);
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        setHint('Could not access location. Please tap the map manually.');
      },
      { timeout: 8000 }
    );
  }, [searchNearPin]);

  // ── Init map ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(container, {
      center:          defaultCenter,
      zoom:            defaultZoom,
      zoomControl:     false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Dark Carto tiles
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd' }
    ).addTo(map);

    // Zoom controls — top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Attribution — tiny
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a> © <a href="https://carto.com">CARTO</a>')
      .addTo(map);

    // Click on map → drop / move pin → search
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLatLng([lat, lng]);
      } else {
        pinMarkerRef.current = L.marker([lat, lng], { icon: makeDroppedPinIcon(), draggable: true }).addTo(map);
        pinMarkerRef.current.on('dragend', (ev) => {
          const { lat: nlat, lng: nlng } = ev.target.getLatLng();
          searchNearPin(map, nlat, nlng);
        });
      }
      await searchNearPin(map, lat, lng);
    });

    // Render pre-loaded locations
    if (locations.length > 0) {
      renderMarkers(map, locations, null);
    }

    // Fix size after mount
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []); // run once on mount

  // ── Re-render markers when locations prop changes ────────────────────────────
  useEffect(() => {
    if (mapRef.current && locations.length > 0) {
      renderMarkers(mapRef.current, locations, selectedItem);
    }
  }, [locations]); // eslint-disable-line

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-surface-border bg-surface-1"
         style={{ height: '420px' }}>

      {/* ── Popup CSS injected once ────────────────────────────────────────── */}
      <style>{`
        @keyframes osmPulse {
          0%   { transform:scale(1);   opacity:0.8; }
          70%  { transform:scale(2.8); opacity:0;   }
          100% { transform:scale(1);   opacity:0;   }
        }
        .osm-picker-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .osm-picker-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .osm-picker-popup .leaflet-popup-tip-container { display:none; }
        .leaflet-control-zoom a {
          background: rgba(26,26,36,0.9) !important;
          color: #94a3b8 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover { color:#22c55e !important; }
        .leaflet-bar { border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 10px !important; overflow:hidden; }
      `}</style>

      {/* ── Top toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* GPS button */}
          <button
            onClick={handleGPS}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 border border-brand-500/30 rounded-lg px-2.5 py-1.5 transition-colors active:scale-95"
          >
            {gpsLoading
              ? <Spinner size="sm" />
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            }
            <span className="font-medium">Locate me</span>
          </button>

          {/* Hint text */}
          <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[200px]">
            {pinSearching ? 'Searching…' : hint}
          </span>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Hint on mobile ────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 bg-surface-2/60 border-b border-surface-border sm:hidden flex-shrink-0">
        <p className="text-slate-500 text-xs truncate">
          {pinSearching ? '🔍 Searching…' : hint}
        </p>
      </div>

      {/* ── Map container ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Pin searching overlay */}
        {pinSearching && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center gap-2 border border-white/10">
              <Spinner size="sm" />
              <span className="text-white text-sm font-medium">Searching nearby…</span>
            </div>
          </div>
        )}

        {/* Legend badge */}
        <div className="absolute bottom-8 left-2 z-[500] pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm text-[9px] text-slate-400 px-2 py-1 rounded-lg border border-white/10 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block flex-shrink-0"/>
              <span>{mode === 'apartment' ? 'Apartment' : 'Office'} locations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block flex-shrink-0"/>
              <span>Dropped pin</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom confirm bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-surface-2 border-t border-surface-border flex-shrink-0">
        {selectedItem ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{selectedItem.name}</p>
              <p className="text-slate-400 text-xs truncate">{selectedItem.area}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
                  setHint('Tap a marker to select, or tap the map to drop a pin');
                  if (mapRef.current) renderMarkers(mapRef.current, locations.length > 0 ? locations : nearbyItems, null);
                }}
                className="text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-surface-3 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => onSelect(selectedItem)}
                className="bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors active:scale-95"
              >
                Confirm ✓
              </button>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-xs w-full text-center">
            {locations.length > 0
              ? `${locations.length} location${locations.length > 1 ? 's' : ''} shown — tap a marker to select`
              : 'Tap the map or use "Locate me" to find nearby locations'}
          </p>
        )}
      </div>
    </div>
  );
}
