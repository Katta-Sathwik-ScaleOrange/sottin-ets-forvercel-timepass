import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';

// ── Small Leaflet pin map ──────────────────────────────────────────────────────
function PinMap({ lat, lng }) {
  const innerRef = useRef(null);
  const mapRef   = useRef(null);
  const polygonsRef = useRef(null);

  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(container, {
      center: [lat, lng], zoom: 16,
      zoomControl: false, attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#f59e0b;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(245,158,11,0.35);"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon }).addTo(map);

    // Load all polygons
    api.get('/apartments/all-polygons').then(({ features }) => {
      if (polygonsRef.current) polygonsRef.current.remove();
      polygonsRef.current = L.geoJSON(features, {
        style: {
          color: '#22c55e',
          weight: 1,
          opacity: 0.5,
          fillColor: '#22c55e',
          fillOpacity: 0.1,
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindTooltip(feature.properties.name, {
              className: 'building-tooltip',
              direction: 'top'
            });
          }
        }
      }).addTo(map);
    }).catch(console.warn);

    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    const t = setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 150);
    return () => { clearTimeout(t); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng]);

  return (
    <div style={{ height: '180px', borderRadius: '12px', overflow: 'hidden' }}
         className="w-full border border-surface-border relative">
      <div ref={innerRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .building-tooltip {
          background: rgba(0,0,0,0.8) !important;
          border: 1px solid rgba(34,197,94,0.4) !important;
          color: #fff !important;
          font-weight: 500 !important;
          font-size: 9px !important;
          border-radius: 4px !important;
          padding: 1px 4px !important;
        }
      `}</style>
    </div>
  );
}

// ── Apartment search/create modal for merge action ────────────────────────────
function MergeModal({ item, onMerge, onPromote, onClose }) {
  const [mode, setMode]         = useState('search'); // 'search' | 'create'
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  
  // Create Form State
  const [newName, setNewName]   = useState(item.suggested_name || '');
  const [newArea, setNewArea]   = useState('Tellapur');
  
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/admin/apartments?search=${encodeURIComponent(q)}&limit=10`);
        setResults(data.apartments || []);
      } catch (_) {}
      finally { setLoading(false); }
    }, 300);
  }, []);

  useEffect(() => { if (mode === 'search') search(query); }, [query, search, mode]);

  // Handle Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-3xl animate-in fade-in duration-300 isolation-auto">
      <div className="bg-surface-2 border border-white/10 rounded-[2rem] w-full max-w-lg max-h-[90vh] flex flex-col shadow-[0_0_120px_rgba(0,0,0,1)] ring-1 ring-white/10 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Header (Sticky) ─────────────────────────────────────────── */}
        <div className="px-8 py-6 border-b border-white/5 bg-surface-1/80 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-black text-2xl tracking-tighter">Action Required</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Review & Categorize GPS Suggestion</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-surface-3 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-all border border-transparent hover:border-red-500/30 active:scale-90"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex p-1.5 bg-surface-0 rounded-2xl border border-white/5 shadow-inner">
            <button
              onClick={() => setMode('search')}
              className={clsx(
                'flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all',
                mode === 'search' ? 'bg-surface-3 text-white shadow-xl ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Merge Existing
            </button>
            <button
              onClick={() => setMode('create')}
              className={clsx(
                'flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all',
                mode === 'create' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Promote to New
            </button>
          </div>
        </div>

        {/* ── Body (Scrollable) ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8 custom-scrollbar pb-10">
          
          {/* Location Context Card */}
          <div className="flex items-center gap-5 bg-white/[0.03] rounded-[1.5rem] p-5 border border-white/5 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/5">
              📍
            </div>
            <div className="min-w-0">
              <p className="text-amber-500/60 text-[9px] font-black uppercase tracking-[0.3em] mb-1">GPS Coordinates</p>
              <p className="text-white font-mono text-base font-black tracking-tight leading-none">{item.lat.toFixed(6)}, {item.lng.toFixed(6)}</p>
              <p className="text-slate-500 text-[10px] font-bold mt-1 truncate">{item.user_email || 'System Generated'}</p>
            </div>
          </div>

          {mode === 'search' ? (
            <div className="space-y-5">
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-brand-500">🔍</span>
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search apartment by name..."
                  className="w-full bg-surface-3 border border-white/10 rounded-2xl pl-14 pr-10 py-5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 focus:ring-[6px] focus:ring-brand-500/10 transition-all shadow-2xl"
                />
                {loading && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="space-y-2">
                {query.length < 2 && !selected && (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                    <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center text-slate-500">🔎</div>
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-widest text-center px-6 leading-relaxed">Search your database to link this GPS hit</p>
                  </div>
                )}
                {results.map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => setSelected(apt)}
                    className={clsx(
                      'w-full text-left px-6 py-5 rounded-2xl transition-all border group relative overflow-hidden',
                      selected?.id === apt.id
                        ? 'bg-brand-500/10 border-brand-500 shadow-2xl scale-[1.02]'
                        : 'bg-surface-3 hover:bg-surface-border border-transparent hover:scale-[1.01]'
                    )}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="min-w-0">
                        <p className={clsx(
                          'text-sm font-black transition-colors',
                          selected?.id === apt.id ? 'text-brand-400' : 'text-slate-200 group-hover:text-white'
                        )}>
                          {apt.name}
                        </p>
                        <p className="text-slate-500 text-[10px] font-black uppercase mt-1 tracking-[0.2em]">{apt.area}</p>
                      </div>
                      <div className={clsx(
                        'w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-lg',
                        selected?.id === apt.id ? 'bg-brand-500 text-white scale-110 rotate-0' : 'bg-surface-0 text-transparent border border-white/10 -rotate-12'
                      )}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
                {query.length >= 2 && !loading && results.length === 0 && (
                  <p className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">No matching apartments found</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2.5">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Proposed Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. My Home Avatar"
                  className="w-full bg-surface-3 border border-white/10 rounded-2xl px-5 py-4.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all shadow-inner font-bold"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Assigned Area</label>
                <div className="relative">
                   <select
                    value={newArea}
                    onChange={e => setNewArea(e.target.value)}
                    className="w-full bg-surface-3 border border-white/10 rounded-2xl px-5 py-4.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all appearance-none cursor-pointer font-bold"
                  >
                    {['Tellapur', 'Kollur', 'Gopanpalle', 'Nallagandla', 'Manikonda', 'Financial District', 'Gachibowli', 'Madhapur'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs">▼</span>
                </div>
              </div>
              <div className="bg-brand-500/[0.03] border border-brand-500/20 rounded-2xl p-6 flex gap-4 shadow-inner">
                <span className="text-2xl">⚡</span>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  This action will immediately create a <b className="text-brand-400">Verified Apartment</b>. 
                  Users in this cluster will be able to select it during surveys.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (Sticky) ─────────────────────────────────────────── */}
        <div className="px-10 py-7 bg-surface-1 border-t border-white/5 flex gap-5 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-white transition-all active:scale-95"
          >
            Cancel
          </button>
          
          {mode === 'search' ? (
            <button
              disabled={!selected}
              onClick={() => onMerge(item.id, selected.id, item.suggested_name)}
              className="flex-[2] py-5 bg-brand-500 hover:bg-brand-600 disabled:opacity-20 disabled:grayscale text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-[1.25rem] transition-all shadow-2xl shadow-brand-500/20 active:scale-95 border border-white/10"
            >
              Finalize Merge
            </button>
          ) : (
            <button
              disabled={!newName || !newArea}
              onClick={() => onPromote(item.id, { name: newName, area: newArea, lat: item.lat, lng: item.lng })}
              className="flex-[2] py-5 bg-brand-500 hover:bg-brand-600 disabled:opacity-20 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-[1.25rem] transition-all shadow-2xl shadow-brand-500/20 active:scale-95 border border-white/10"
            >
              Confirm Promotion
            </button>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:  'bg-amber-900/30 text-amber-400 border-amber-500/40',
  reviewed: 'bg-blue-900/30 text-blue-400 border-blue-500/40',
  merged:   'bg-green-900/30 text-green-400 border-green-500/40',
  rejected: 'bg-red-900/30 text-red-400 border-red-500/40',
};

export default function PendingLocations() {
  const [items, setItems]                 = useState([]);
  const [total, setTotal]                 = useState(0);
  const [filterStatus, setFilterStatus]   = useState('pending');
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [mergeTarget, setMergeTarget]     = useState(null); // item to merge

  const fetchItems = async (status = filterStatus) => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/pending-locations?status=${status}&limit=50`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load pending locations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(filterStatus); }, [filterStatus]);

  const handleAction = async (id, action, extra = {}) => {
    setActionLoading(id);
    try {
      await api.patch(`/admin/pending-locations/${id}`, { action, ...extra });
      setItems(prev => prev.filter(it => it.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (e) {
      alert('Action failed: ' + (e.message || e.error || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMerge = async (pendingId, apartmentId, suggestedName) => {
    setMergeTarget(null);
    await handleAction(pendingId, 'merge', { apartment_id: apartmentId, suggested_name: suggestedName });
  };

  const handlePromote = async (pendingId, apartmentData) => {
    setMergeTarget(null);
    setActionLoading(pendingId);
    try {
      // 1. Create the new apartment
      const newApt = await api.post('/admin/apartments', { 
        ...apartmentData, 
        verified: true,
        aliases: [apartmentData.name] 
      });
      // 2. Merge pending location into the brand new apartment
      await handleAction(pendingId, 'merge', { apartment_id: newApt.id });
    } catch (e) {
      alert('Promotion failed: ' + (e.message || 'Unknown error'));
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Locations</h1>
          <p className="text-slate-400 text-sm mt-1">
            GPS hits that didn't match any apartment polygon — <span className="text-white font-medium">{total}</span> {filterStatus}
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['pending', 'reviewed', 'merged', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                filterStatus === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-2 text-slate-400 hover:text-white border border-surface-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-surface-1 border border-surface-border rounded-2xl">
          <p className="text-slate-500 text-lg">No {filterStatus} locations</p>
          <p className="text-slate-600 text-sm mt-1">
            {filterStatus === 'pending' ? 'All GPS hits have been reviewed.' : 'Switch tabs to see other statuses.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-surface-1 border border-surface-border rounded-2xl p-4 space-y-3">
              {/* Status + date */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_STYLES[item.status]}`}>
                  {item.status}
                </span>
                <span className="text-slate-500 text-xs">
                  {new Date(item.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Map */}
              <PinMap lat={item.lat} lng={item.lng} />

              {/* Coordinates */}
              <div className="bg-surface-2 rounded-lg px-3 py-2 font-mono text-xs text-slate-300 flex items-center justify-between">
                <span>{item.lat.toFixed(6)}, {item.lng.toFixed(6)}</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=17/${item.lat}/${item.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-500 hover:underline text-xs ml-2"
                >
                  OSM ↗
                </a>
              </div>

              {/* User info */}
              {item.user_name && (
                <div>
                  <p className="text-white text-sm font-medium">{item.user_name}</p>
                  <p className="text-slate-400 text-xs">{item.user_email}</p>
                </div>
              )}

              {/* Suggested name */}
              {item.suggested_name && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg px-3 py-2">
                  <p className="text-amber-300 text-xs">
                    <span className="text-slate-500">User suggested: </span>
                    {item.suggested_name}
                  </p>
                </div>
              )}

              {/* Merged apartment */}
              {item.merged_apartment_name && (
                <p className="text-green-400 text-xs">✔ Merged into: {item.merged_apartment_name}</p>
              )}

              {/* Action buttons */}
              {(item.status === 'pending' || item.status === 'reviewed') && (
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={actionLoading === item.id}
                    onClick={() => setMergeTarget(item)}
                    className="flex-1 text-xs px-3 py-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-500/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Merge →
                  </button>
                  <button
                    disabled={actionLoading === item.id}
                    onClick={() => handleAction(item.id, 'reviewed')}
                    className="flex-1 text-xs px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-500/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reviewed
                  </button>
                  <button
                    disabled={actionLoading === item.id}
                    onClick={() => handleAction(item.id, 'reject')}
                    className="flex-1 text-xs px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {actionLoading === item.id && (
                <div className="flex items-center justify-center py-1">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Merge modal */}
      {mergeTarget && (
        <MergeModal
          item={mergeTarget}
          onMerge={handleMerge}
          onPromote={handlePromote}
          onClose={() => setMergeTarget(null)}
        />
      )}
    </div>
  );
}
