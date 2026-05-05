import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';

// ── Small Leaflet pin map ──────────────────────────────────────────────────────
function PinMap({ lat, lng }) {
  const innerRef = useRef(null);
  const mapRef   = useRef(null);

  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(container, {
      center: [lat, lng], zoom: 16,
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#f59e0b;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(245,158,11,0.35);"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon }).addTo(map);
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    const t = setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 150);
    return () => { clearTimeout(t); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng]);

  return (
    <div style={{ height: '130px', borderRadius: '10px', overflow: 'hidden' }}
         className="w-full border border-surface-border">
      <div ref={innerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// ── Apartment search modal for merge action ────────────────────────────────────
function MergeModal({ item, onMerge, onClose }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
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

  useEffect(() => { search(query); }, [query, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      {/* Solid opaque modal — no more glass transparency */}
      <div className="bg-[#141420] border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 ring-1 ring-white/5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-700">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🔗</span>
              </div>
              <h2 className="text-white font-bold text-base">Merge into Apartment</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GPS</span>
              <span className="font-mono text-xs text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1 rounded-lg">
                {item.lat.toFixed(5)},&nbsp;{item.lng.toFixed(5)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-white transition-all text-sm mt-0.5 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── Search body ─────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-3">

          {/* Search input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search apartments by name…"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            {loading && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Results list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {query.length < 2 && (
              <p className="text-slate-500 text-xs text-center py-4 italic">Type at least 2 characters to search…</p>
            )}
            {query.length >= 2 && !loading && results.length === 0 && (
              <div className="text-center py-5 space-y-1">
                <p className="text-slate-300 text-sm font-medium">No apartments found</p>
                <p className="text-slate-600 text-xs">Try a different search term</p>
              </div>
            )}
            {results.map(apt => (
              <button
                key={apt.id}
                onClick={() => setSelected(selected?.id === apt.id ? null : apt)}
                className={clsx(
                  'w-full text-left px-4 py-3 rounded-xl transition-all border',
                  selected?.id === apt.id
                    ? 'bg-brand-500/20 border-brand-500/60 shadow-md shadow-brand-500/10'
                    : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 hover:border-slate-500'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={clsx(
                    'text-sm font-semibold truncate',
                    selected?.id === apt.id ? 'text-white' : 'text-slate-200'
                  )}>
                    {apt.name}
                  </p>
                  {selected?.id === apt.id && (
                    <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  {apt.area}
                  {apt.lat && apt.lng ? ` · ${apt.lat.toFixed(4)}, ${apt.lng.toFixed(4)}` : ''}
                  {apt.verified && <span className="ml-1 text-brand-400 font-semibold">· ✓ Verified</span>}
                </p>
              </button>
            ))}
          </div>

          {/* Selected confirmation banner */}
          {selected && (
            <div className="flex items-center gap-3 bg-brand-500/15 border-2 border-brand-500/50 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-brand-400 text-[10px] font-bold uppercase tracking-widest leading-none">Selected</p>
                <p className="text-white text-sm font-semibold mt-0.5 truncate">{selected.name}</p>
                <p className="text-slate-400 text-xs leading-none mt-0.5">{selected.area}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white text-sm font-medium transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={() => onMerge(item.id, selected.id)}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-brand-500/25"
          >
            {selected ? `Merge → "${selected.name}"` : 'Select an apartment'}
          </button>
        </div>
      </div>
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

  const handleMerge = async (pendingId, apartmentId) => {
    setMergeTarget(null);
    await handleAction(pendingId, 'merge', { apartment_id: apartmentId });
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
          onClose={() => setMergeTarget(null)}
        />
      )}
    </div>
  );
}
