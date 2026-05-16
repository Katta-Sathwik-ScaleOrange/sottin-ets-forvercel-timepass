import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';

// Fix for default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active:  'bg-green-500/10 text-green-400 border-green-500/20',
    draft:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    paused:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
    retired: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border capitalize', styles[status] || styles.draft)}>
      {status}
    </span>
  );
}

function FInput({ label, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-slate-400">{label}</label>}
      <input
        className="w-full bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-500/50 transition-colors"
        {...props}
      />
    </div>
  );
}

function FSelect({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-slate-400">{label}</label>}
      <select
        className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function Btn({ children, variant = 'primary', loading = false, size = 'md', ...props }) {
  const styles = {
    primary:   'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20',
    secondary: 'bg-surface-3 hover:bg-surface-2 text-white border border-surface-border',
    danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
    success:   'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20',
    warning:   'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
        styles[variant], sizes[size]
      )}
      disabled={loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ─── Route Map Component ───────────────────────────────────────────────────────

function RouteMap({ stops }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ markers: [], line: null, polygons: null });

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, {
      center: [17.45, 78.35], zoom: 13,
      zoomControl: false, attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd'
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Load Polygons
    api.get('/apartments/all-polygons').then(({ features }) => {
      layersRef.current.polygons = L.geoJSON(features, {
        style: { color: '#22c55e', weight: 1, opacity: 0.4, fillColor: '#22c55e', fillOpacity: 0.05 },
        onEachFeature: (f, l) => { if (f.properties?.name) l.bindTooltip(f.properties.name, { className: 'map-tooltip', direction: 'top' }); }
      }).addTo(map);
    }).catch(console.warn);

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing route layers
    layersRef.current.markers.forEach(m => m.remove());
    layersRef.current.markers = [];
    if (layersRef.current.line) layersRef.current.line.remove();

    if (stops.length === 0) return;

    const coords = [];
    stops.forEach(stop => {
      if (!stop.lat || !stop.lng) return;
      const pos = [stop.lat, stop.lng];
      coords.push(pos);

      const color = stop.stop_type === 'pickup' ? '#22c55e' : '#3b82f6';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;background:${color};border:3px solid #fff;border-radius:50%;display:flex;items-center;justify-center;color:#fff;font-weight:bold;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${stop.sequence}</div>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
      });

      const marker = L.marker(pos, { icon }).addTo(map).bindPopup(`<b>Stop ${stop.sequence}:</b> ${stop.label}`);
      layersRef.current.markers.push(marker);
    });

    if (coords.length > 1) {
      layersRef.current.line = L.polyline(coords, { color: '#fff', weight: 3, opacity: 0.5, dashArray: '8, 8' }).addTo(map);
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops]);

  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl overflow-hidden relative mb-4">
      <div ref={containerRef} style={{ height: '400px', width: '100%' }} />
      <div className="absolute top-4 left-4 z-[500] pointer-events-none space-y-1">
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-green-500" />
           <span className="text-[10px] text-white font-medium uppercase tracking-wider">Pickup Stop</span>
        </div>
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-blue-500" />
           <span className="text-[10px] text-white font-medium uppercase tracking-wider">Drop Stop</span>
        </div>
      </div>
      <style>{`
        .map-tooltip {
          background: rgba(0,0,0,0.8) !important;
          border: 1px solid rgba(34,197,94,0.3) !important;
          color: #fff !important;
          font-size: 9px !important;
          padding: 1px 4px !important;
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const EMPTY_ROUTE = { name: '', origin_area: '', destination_area: '' };
const EMPTY_STOP  = { stop_type: 'pickup', label: '', lat: '', lng: '', sequence: '' };
const EMPTY_SHIFT = { direction: 'onward', departure_time: '', bus_capacity: '22', label: '' };

export default function RouteBuilder() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE);
  const [stopForm,  setStopForm]  = useState(EMPTY_STOP);
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT);

  const [saving, setSaving] = useState('');
  const [error, setError]   = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => { loadRoutes(); }, []);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 2500); };

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/routes');
      setRoutes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.error || 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const refreshRoute = async (id) => {
    try {
      const arr = await api.get('/admin/routes');
      const list = Array.isArray(arr) ? arr : [];
      setRoutes(list);
      setSelectedRoute(list.find(r => r.id === id) || null);
    } catch (_) {}
  };

  // ── Route CRUD ───────────────────────────────────────────────────────────────

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!routeForm.name || !routeForm.origin_area || !routeForm.destination_area) return;
    setSaving('route'); setError('');
    try {
      const created = await api.post('/admin/routes', routeForm);
      setRoutes(prev => [created, ...prev]);
      setSelectedRoute(created);
      setRouteForm(EMPTY_ROUTE);
      setShowCreateForm(false);
      showSuccess('Route created!');
    } catch (e) {
      setError(e.error || 'Failed to create route');
    } finally { setSaving(''); }
  };

  const handleDeleteRoute = async () => {
    if (!selectedRoute) return;
    if (!window.confirm(`Delete route "${selectedRoute.name}"? This also removes all its stops and shifts.`)) return;
    setSaving('deleteRoute'); setError('');
    try {
      await api.delete(`/admin/routes/${selectedRoute.id}`);
      setRoutes(prev => prev.filter(r => r.id !== selectedRoute.id));
      setSelectedRoute(null);
      showSuccess('Route deleted.');
    } catch (e) {
      setError(e.error || 'Failed to delete route');
    } finally { setSaving(''); }
  };

  const handlePublish = async () => {
    if (!selectedRoute || selectedRoute.status === 'active') return;
    setSaving('publish'); setError('');
    try {
      const updated = await api.patch(`/admin/routes/${selectedRoute.id}/publish`);
      setSelectedRoute(updated);
      setRoutes(prev => prev.map(r => r.id === updated.id ? updated : r));
      showSuccess('Route published and is now live!');
    } catch (e) {
      setError(e.error || 'Failed to publish route');
    } finally { setSaving(''); }
  };

  const handlePauseResume = async () => {
    if (!selectedRoute) return;
    const newStatus = selectedRoute.status === 'paused' ? 'active' : 'paused';
    setSaving('status'); setError('');
    try {
      const updated = await api.patch(`/admin/routes/${selectedRoute.id}`, { status: newStatus });
      setSelectedRoute(updated);
      setRoutes(prev => prev.map(r => r.id === updated.id ? updated : r));
      showSuccess(`Route ${newStatus === 'paused' ? 'paused' : 'resumed'}.`);
    } catch (e) {
      setError(e.error || 'Failed to update route status');
    } finally { setSaving(''); }
  };

  // ── Stop CRUD ────────────────────────────────────────────────────────────────

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!selectedRoute || !stopForm.label || !stopForm.lat || !stopForm.lng || !stopForm.sequence) return;
    setSaving('stop'); setError('');
    try {
      await api.post(`/admin/routes/${selectedRoute.id}/stops`, {
        stops: [{
          stop_type: stopForm.stop_type,
          label:     stopForm.label,
          lat:       parseFloat(stopForm.lat),
          lng:       parseFloat(stopForm.lng),
          sequence:  parseInt(stopForm.sequence),
        }],
      });
      setStopForm(EMPTY_STOP);
      await refreshRoute(selectedRoute.id);
      showSuccess('Stop added.');
    } catch (e) {
      setError(e.error || 'Failed to add stop');
    } finally { setSaving(''); }
  };

  const handleDeleteStop = async (stop) => {
    if (!window.confirm(`Remove stop "${stop.label}"?`)) return;
    setSaving(`stop-${stop.id}`); setError('');
    try {
      await api.delete(`/admin/routes/${selectedRoute.id}/stops/${stop.id}`);
      await refreshRoute(selectedRoute.id);
      showSuccess('Stop removed.');
    } catch (e) {
      setError(e.error || 'Failed to remove stop');
    } finally { setSaving(''); }
  };

  // ── Shift CRUD ───────────────────────────────────────────────────────────────

  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!selectedRoute || !shiftForm.departure_time || !shiftForm.label) return;
    setSaving('shift'); setError('');
    try {
      await api.post(`/admin/routes/${selectedRoute.id}/shifts`, {
        direction:      shiftForm.direction,
        departure_time: shiftForm.departure_time,
        bus_capacity:   parseInt(shiftForm.bus_capacity) || 22,
        label:          shiftForm.label,
      });
      setShiftForm(EMPTY_SHIFT);
      await refreshRoute(selectedRoute.id);
      showSuccess('Shift added.');
    } catch (e) {
      setError(e.error || 'Failed to add shift');
    } finally { setSaving(''); }
  };

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Remove shift "${shift.label}"?`)) return;
    setSaving(`shift-${shift.id}`); setError('');
    try {
      await api.delete(`/admin/routes/${selectedRoute.id}/shifts/${shift.id}`);
      await refreshRoute(selectedRoute.id);
      showSuccess('Shift removed.');
    } catch (e) {
      setError(e.error || 'Failed to remove shift');
    } finally { setSaving(''); }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const stops = selectedRoute?.stops
    ? [...selectedRoute.stops].filter(Boolean).sort((a, b) => a.sequence - b.sequence)
    : [];
  const shifts       = selectedRoute?.shifts ? selectedRoute.shifts.filter(Boolean) : [];
  const onwardShifts = shifts.filter(s => s.direction === 'onward');
  const returnShifts = shifts.filter(s => s.direction === 'return');

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Builder</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create routes, stops, and shifts</p>
        </div>
        <Btn onClick={() => setShowCreateForm(true)}>+ New Route</Btn>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-surface-1 border border-surface-border rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Create New Route</h2>
          <form onSubmit={handleCreateRoute} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FInput label="Route Name" placeholder="e.g. Tellapur → Financial District"
              value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} required />
            <FInput label="Origin Area" placeholder="e.g. Tellapur"
              value={routeForm.origin_area} onChange={e => setRouteForm(f => ({ ...f, origin_area: e.target.value }))} required />
            <FInput label="Destination Area" placeholder="e.g. Financial District"
              value={routeForm.destination_area} onChange={e => setRouteForm(f => ({ ...f, destination_area: e.target.value }))} required />
            <div className="sm:col-span-3 flex gap-2">
              <Btn type="submit" loading={saving === 'route'}>Create Route</Btn>
              <Btn variant="secondary" type="button" onClick={() => setShowCreateForm(false)}>Cancel</Btn>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Routes list */}
        <div className="col-span-12 lg:col-span-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner /></div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-surface-1 border border-surface-border rounded-2xl">
              <p className="text-2xl mb-2">🗺️</p>
              <p className="text-sm">No routes yet. Create one above.</p>
            </div>
          ) : (
            routes.map(route => {
              const isSelected = selectedRoute?.id === route.id;
              const stopCount = (route.stops || []).filter(Boolean).length;
              const shiftCount = (route.shifts || []).filter(Boolean).length;
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={clsx(
                    'w-full text-left bg-surface-1 border rounded-2xl p-4 transition-all space-y-2.5 relative overflow-hidden',
                    isSelected
                      ? 'border-brand-500/60 bg-brand-500/5'
                      : 'border-surface-border hover:border-slate-500'
                  )}
                >
                  {/* Left accent bar on selected */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-2xl" />
                  )}
                  <div className="flex items-center justify-between pl-1">
                    <span className={clsx('font-semibold text-sm truncate pr-2', isSelected ? 'text-white' : 'text-slate-200')}>{route.name}</span>
                    <StatusBadge status={route.status} />
                  </div>
                  <div className="flex items-center gap-1.5 pl-1 text-sm">
                    <span className="text-slate-400">{route.origin_area}</span>
                    <span className="text-brand-500 font-bold">→</span>
                    <span className="text-slate-400">{route.destination_area}</span>
                  </div>
                  <div className="flex gap-2 pl-1">
                    <span className="text-[11px] bg-surface-3 text-slate-400 px-2 py-0.5 rounded-full border border-surface-border">
                      {stopCount} stop{stopCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] bg-surface-3 text-slate-400 px-2 py-0.5 rounded-full border border-surface-border">
                      {shiftCount} shift{shiftCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Route detail panel */}
        <div className="col-span-12 lg:col-span-8">
          {!selectedRoute ? (
            <div className="bg-surface-1 border border-surface-border rounded-2xl flex items-center justify-center min-h-[400px] text-slate-500">
              <div className="text-center space-y-2">
                <p className="text-3xl">←</p>
                <p className="text-sm">Select a route to edit</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <RouteMap stops={stops} />

              {/* Route header */}
              <div className="bg-surface-1 border border-surface-border rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-bold text-lg">{selectedRoute.name}</h2>
                      <StatusBadge status={selectedRoute.status} />
                    </div>
                    <p className="text-slate-400 text-sm">
                      {selectedRoute.origin_area} → {selectedRoute.destination_area}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedRoute.status === 'draft' && (
                      <Btn variant="success" loading={saving === 'publish'} onClick={handlePublish}>
                        ✓ Publish
                      </Btn>
                    )}
                    {(selectedRoute.status === 'active' || selectedRoute.status === 'paused') && (
                      <Btn
                        variant={selectedRoute.status === 'paused' ? 'success' : 'warning'}
                        loading={saving === 'status'}
                        onClick={handlePauseResume}
                      >
                        {selectedRoute.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
                      </Btn>
                    )}
                    <Btn variant="danger" loading={saving === 'deleteRoute'} onClick={handleDeleteRoute}>
                      🗑 Delete
                    </Btn>
                  </div>
                </div>
              </div>

              {/* Stops */}
              <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-semibold">Stops ({stops.length})</h3>

                {stops.length > 0 ? (
                  <div className="space-y-2">
                    {stops.map((stop, i) => (
                      <div key={stop.id || i} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
                        <div className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          stop.stop_type === 'pickup' ? 'bg-brand-500/20 text-brand-500' : 'bg-blue-500/20 text-blue-400'
                        )}>
                          {stop.sequence}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{stop.label}</p>
                          <p className="text-slate-500 text-xs capitalize">
                            {stop.stop_type} · {parseFloat(stop.lat).toFixed(4)}, {parseFloat(stop.lng).toFixed(4)}
                          </p>
                        </div>
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full border capitalize mr-2',
                          stop.stop_type === 'pickup'
                            ? 'bg-brand-500/10 text-brand-500 border-brand-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        )}>
                          {stop.stop_type}
                        </span>
                        <button
                          disabled={saving === `stop-${stop.id}`}
                          onClick={() => handleDeleteStop(stop)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          title="Remove stop"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No stops yet</p>
                )}

                <form onSubmit={handleAddStop} className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-surface-border">
                  <FSelect label="Type" value={stopForm.stop_type}
                    onChange={e => setStopForm(f => ({ ...f, stop_type: e.target.value }))}>
                    <option value="pickup">Pickup</option>
                    <option value="drop">Drop</option>
                  </FSelect>
                  <FInput label="Sequence" type="number" min="1" placeholder="1"
                    value={stopForm.sequence} onChange={e => setStopForm(f => ({ ...f, sequence: e.target.value }))} />
                  <div className="col-span-2">
                    <FInput label="Stop Label" placeholder="e.g. My Home Bhooja Gate 2"
                      value={stopForm.label} onChange={e => setStopForm(f => ({ ...f, label: e.target.value }))} />
                  </div>
                  <FInput label="Latitude" type="number" step="any" placeholder="17.4947"
                    value={stopForm.lat} onChange={e => setStopForm(f => ({ ...f, lat: e.target.value }))} />
                  <FInput label="Longitude" type="number" step="any" placeholder="78.3534"
                    value={stopForm.lng} onChange={e => setStopForm(f => ({ ...f, lng: e.target.value }))} />
                  <div className="col-span-2 flex items-end">
                    <Btn type="submit" variant="secondary" loading={saving === 'stop'} size="sm">
                      + Add Stop
                    </Btn>
                  </div>
                </form>
              </div>

              {/* Shifts */}
              <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-semibold">Shifts ({shifts.length})</h3>
                {shifts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Onward', data: onwardShifts, color: 'brand' },
                      { label: 'Return', data: returnShifts, color: 'blue' },
                    ].map(({ label, data, color }) => (
                      <div key={label} className="space-y-2">
                        <p className="text-xs font-medium text-slate-400">{label}</p>
                        {data.length === 0 && <p className="text-slate-600 text-xs">None added</p>}
                        {data.map((sh, i) => (
                          <div key={sh.id || i} className={clsx(
                            'flex items-center justify-between bg-surface-2 rounded-xl px-3 py-3',
                            color === 'brand' ? 'border-l-2 border-brand-500' : 'border-l-2 border-blue-400'
                          )}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={clsx(
                                'w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0',
                                color === 'brand' ? 'bg-brand-500/10' : 'bg-blue-500/10'
                              )}>
                                🕐
                              </div>
                              <div className="min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{sh.label}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={clsx('text-xs font-mono font-bold', color === 'brand' ? 'text-brand-500' : 'text-blue-400')}>
                                    {sh.departure_time}
                                  </span>
                                  <span className="text-slate-600 text-xs">·</span>
                                  <span className="text-slate-500 text-xs">{sh.bus_capacity} seats</span>
                                </div>
                              </div>
                            </div>
                            <button
                              disabled={saving === `shift-${sh.id}`}
                              onClick={() => handleDeleteShift(sh)}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40 ml-2"
                              title="Remove shift"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No shifts yet</p>
                )}

                <form onSubmit={handleAddShift} className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-surface-border">
                  <FSelect label="Direction" value={shiftForm.direction}
                    onChange={e => setShiftForm(f => ({ ...f, direction: e.target.value }))}>
                    <option value="onward">Onward</option>
                    <option value="return">Return</option>
                  </FSelect>
                  <FInput label="Departure Time" type="time"
                    value={shiftForm.departure_time} onChange={e => setShiftForm(f => ({ ...f, departure_time: e.target.value }))} />
                  <FInput label="Capacity" type="number" min="1" max="60"
                    value={shiftForm.bus_capacity} onChange={e => setShiftForm(f => ({ ...f, bus_capacity: e.target.value }))} />
                  <FInput label="Display Label" placeholder="e.g. Morning 8:30 AM"
                    value={shiftForm.label} onChange={e => setShiftForm(f => ({ ...f, label: e.target.value }))} />
                  <div className="col-span-2 sm:col-span-4 flex">
                    <Btn type="submit" variant="secondary" loading={saving === 'shift'} size="sm">
                      + Add Shift
                    </Btn>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

