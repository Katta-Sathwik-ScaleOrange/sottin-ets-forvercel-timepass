/**
 * ApartmentManager.jsx — Admin page
 *
 * Full CRUD for apartments:
 *   - Search / paginate all apartments
 *   - Add new apartment (name, area, lat, lng, aliases, verified)
 *   - Edit any existing apartment
 *   - Delete (blocked if used in survey responses)
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { OsmMiniMap } from '@/components/shared/OsmMiniMap';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AREAS = [
  'Tellapur', 'Gopanpalle', 'Kollur', 'Nallagandla',
  'Chandanagar', 'Manikonda', 'Narsingi', 'Other',
];

const EMPTY_FORM = {
  name: '', area: 'Tellapur', lat: '', lng: '', aliases: '', verified: false,
};

function Badge({ children, color = 'green' }) {
  const cls = {
    green:  'bg-green-900/30 text-green-400 border-green-500/40',
    amber:  'bg-amber-900/30 text-amber-400 border-amber-500/40',
    slate:  'bg-slate-800 text-slate-400 border-slate-600/40',
    blue:   'bg-blue-900/30 text-blue-400 border-blue-500/40',
  }[color];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl px-5 py-4">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function MapPreviewModal({ apt, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-1 border border-surface-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-white font-bold">{apt.name}</h2>
            <p className="text-slate-400 text-xs">{apt.area} · {apt.lat}, {apt.lng}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-2 bg-surface-2">
          <OsmMiniMap
            lat={apt.lat}
            lng={apt.lng}
            polygonGeoJson={apt.polygon_geojson}
            height="400px"
            label={apt.name}
          />
        </div>
        <div className="px-6 py-4 bg-surface-1 text-center">
          <p className="text-slate-500 text-xs italic">
            Building footprint shown in solid green. Surrounding buildings shown in faint green.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Form ───────────────────────────────────────────────────────────────

function ApartmentForm({ initial = EMPTY_FORM, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isValid = form.name.trim() && form.area && form.lat && form.lng;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="text-white font-semibold">
            {initial.id ? 'Edit Apartment' : 'Add New Apartment'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Apartment Name *</label>
            <input
              id="apt-name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. My Home Bhooja"
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
            />
          </div>

          {/* Area */}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Area *</label>
            <select
              id="apt-area"
              value={form.area}
              onChange={e => set('area', e.target.value)}
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/60"
            >
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Lat / Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Latitude *</label>
              <input
                id="apt-lat"
                type="number" step="any"
                value={form.lat}
                onChange={e => set('lat', e.target.value)}
                placeholder="17.4831"
                className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Longitude *</label>
              <input
                id="apt-lng"
                type="number" step="any"
                value={form.lng}
                onChange={e => set('lng', e.target.value)}
                placeholder="78.3100"
                className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
              />
            </div>
          </div>

          {/* Aliases */}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">
              Aliases <span className="text-slate-600">(comma-separated)</span>
            </label>
            <input
              id="apt-aliases"
              value={form.aliases}
              onChange={e => set('aliases', e.target.value)}
              placeholder="bhooja, my home bhooja, mhb"
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
            />
            <p className="text-slate-600 text-xs mt-1">Used for fuzzy search matching</p>
          </div>

          {/* Verified toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              id="apt-verified"
              type="checkbox"
              checked={form.verified}
              onChange={e => set('verified', e.target.checked)}
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-white text-sm">Mark as verified</span>
          </label>

          {/* OSM tip */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl px-4 py-3">
            <p className="text-blue-300 text-xs">
              💡 Tip: Get coordinates from <a href="https://openstreetmap.org" target="_blank" rel="noreferrer" className="underline">openstreetmap.org</a> — right-click any location → "Show address"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border text-slate-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            id="apt-save-btn"
            onClick={() => onSave(form)}
            disabled={!isValid || saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-medium text-sm transition-colors"
          >
            {saving ? 'Saving…' : (initial.id ? 'Save Changes' : 'Add Apartment')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApartmentManager() {
  const [data, setData]         = useState({ apartments: [], total: 0, verifiedCount: 0, polygonCount: 0 });
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);   // null | 'add' | apartment_obj
  const [preview, setPreview]   = useState(null);   // apartment_obj
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const LIMIT = 20;

  const fetchData = useCallback(async (q = search, p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/apartments?search=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${p * LIMIT}`);
      setData(res);
    } catch (e) {
      setError('Failed to load apartments: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchData(); }, [search, page]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSave = async (form) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        aliases: typeof form.aliases === 'string'
          ? form.aliases.split(',').map(s => s.trim()).filter(Boolean)
          : form.aliases,
      };

      if (form.id) {
        await api.patch(`/admin/apartments/${form.id}`, payload);
        showSuccess(`✅ "${form.name}" updated successfully`);
      } else {
        await api.post('/admin/apartments', payload);
        showSuccess(`✅ "${form.name}" added successfully`);
      }

      setModal(null);
      setPage(0);
      fetchData(search, 0);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (apt) => {
    if (!window.confirm(`Delete "${apt.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/admin/apartments/${apt.id}`);
      showSuccess(`🗑️ "${apt.name}" deleted`);
      fetchData(search, page);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const openEdit = (apt) => {
    setModal({
      id: apt.id,
      name: apt.name,
      area: apt.area,
      lat: apt.lat,
      lng: apt.lng,
      aliases: (apt.aliases || []).join(', '),
      verified: apt.verified,
    });
  };

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🏠 Apartments</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage all apartment complexes in the Tellapur area
          </p>
        </div>
        <button
          id="add-apartment-btn"
          onClick={() => setModal(EMPTY_FORM)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium text-sm transition-colors active:scale-95"
        >
          <span className="text-base">+</span> Add Apartment
        </button>
      </div>

      {/* Toast notifications */}
      {success && (
        <div className="bg-green-900/30 border border-green-500/40 rounded-xl px-4 py-3">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Apartments" value={data.total} />
        <StatCard label="Verified" value={data.verifiedCount}
          sub={`${data.total ? Math.round(data.verifiedCount / data.total * 100) : 0}% of total`} />
        <StatCard label="Has OSM Polygon" value={data.polygonCount}
          sub="GPS detection ready" />
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        <input
          id="apt-search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name or area…"
          className="w-full bg-surface-1 border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Name', 'Area', 'Coordinates', 'Aliases', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-400 text-xs font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : data.apartments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No apartments found{search ? ` for "${search}"` : ''}
                  </td>
                </tr>
              ) : (
                data.apartments.map(apt => (
                  <tr key={apt.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">
                      <div className="flex items-center gap-2">
                        {apt.name}
                        {apt.has_polygon && (
                          <button
                            onClick={() => setPreview(apt)}
                            className="w-6 h-6 rounded bg-brand-500/10 text-brand-500 flex items-center justify-center hover:bg-brand-500/20 transition-colors"
                            title="Preview Map"
                          >
                            🗺
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{apt.area}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                      {apt.lat?.toFixed(4)}, {apt.lng?.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(apt.aliases || []).slice(0, 3).map((a, i) => (
                          <Badge key={i} color="slate">{a}</Badge>
                        ))}
                        {(apt.aliases || []).length > 3 && (
                          <Badge color="slate">+{apt.aliases.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={apt.verified ? 'green' : 'amber'}>
                        {apt.verified ? '✓ Verified' : 'Unverified'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(apt)}
                          className="text-xs px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-500/40 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        {!apt.has_polygon && (
                           <button
                             onClick={() => setPreview(apt)}
                             className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg transition-colors"
                           >
                             Map
                           </button>
                        )}
                        <button
                          onClick={() => handleDelete(apt)}
                          className="text-xs px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/40 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <p className="text-slate-500 text-xs">
              Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-slate-400 hover:text-white disabled:opacity-30 text-xs transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-slate-400 text-xs">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-slate-400 hover:text-white disabled:opacity-30 text-xs transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forms & Previews */}
      {modal !== null && (
        <ApartmentForm
          initial={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {preview && (
        <MapPreviewModal
          apt={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
