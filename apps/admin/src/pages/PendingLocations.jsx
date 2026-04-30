import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';

// Tiny inline Leaflet map for a single lat/lng point (amber pin)
function PinMap({ lat, lng }) {
  const innerRef = useRef(null);
  const mapRef   = useRef(null);

  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;

    // Tear down previous instance (React Strict Mode safe)
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
      html: `<div style="width:12px;height:12px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(245,158,11,0.4);"></div>`,
      iconSize: [12, 12], iconAnchor: [6, 6],
    });
    L.marker([lat, lng], { icon }).addTo(map);

    const t = setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 150);

    return () => {
      clearTimeout(t);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [lat, lng]);

  return (
    <div style={{ height: '120px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}
         className="w-full border border-gray-700">
      <div ref={innerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// Status colour mapping
const STATUS_STYLES = {
  pending  : 'bg-amber-900/30 text-amber-400 border-amber-500/40',
  reviewed : 'bg-blue-900/30 text-blue-400 border-blue-500/40',
  merged   : 'bg-green-900/30 text-green-400 border-green-500/40',
  rejected : 'bg-red-900/30 text-red-400 border-red-500/40',
};

export default function PendingLocations() {
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id of item being actioned

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
      // Remove from list or refresh
      setItems((prev) => prev.filter((it) => it.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      console.error('Action failed:', e);
      alert('Action failed: ' + (e.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Locations</h1>
          <p className="text-slate-400 text-sm mt-1">
            GPS hits that didn't match any apartment polygon — {total} {filterStatus}
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2">
          {['pending', 'reviewed', 'merged', 'rejected'].map((s) => (
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

      {/* Grid of pending location cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 text-lg">No {filterStatus} locations</p>
          <p className="text-slate-600 text-sm mt-1">All GPS hits have been reviewed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id}
                 className="bg-surface-1 border border-surface-border rounded-2xl p-4 space-y-3">

              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_STYLES[item.status]}`}>
                  {item.status}
                </span>
                <span className="text-slate-500 text-xs">
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Mini-map */}
              <PinMap lat={item.lat} lng={item.lng} />

              {/* Coordinates */}
              <div className="bg-surface-2 rounded-lg px-3 py-2 font-mono text-xs text-slate-400">
                {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
              </div>

              {/* User info */}
              {item.user_name && (
                <div className="space-y-0.5">
                  <p className="text-white text-sm font-medium">{item.user_name}</p>
                  <p className="text-slate-400 text-xs">{item.user_email}</p>
                </div>
              )}

              {/* User-suggested name (typed by user in the suggest field) */}
              {item.suggested_name && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg px-3 py-2">
                  <p className="text-amber-300 text-xs">
                    <span className="text-slate-500">User suggested: </span>
                    {item.suggested_name}
                  </p>
                </div>
              )}

              {/* Merged into apartment name */}
              {item.merged_apartment_name && (
                <p className="text-green-400 text-xs">
                  ✔ Merged into: {item.merged_apartment_name}
                </p>
              )}

              {/* Action buttons — only for pending/reviewed */}
              {(item.status === 'pending' || item.status === 'reviewed') && (
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={actionLoading === item.id}
                    onClick={() => {
                      const aptId = prompt('Enter Apartment ID to merge into:');
                      if (aptId) handleAction(item.id, 'merge', { apartment_id: aptId });
                    }}
                    className="flex-1 text-xs px-3 py-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-500/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Merge →
                  </button>
                  <button
                    disabled={actionLoading === item.id}
                    onClick={() => handleAction(item.id, 'reviewed')}
                    className="flex-1 text-xs px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-500/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Mark Reviewed
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

              {/* Loading overlay */}
              {actionLoading === item.id && (
                <div className="flex items-center justify-center py-2">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
