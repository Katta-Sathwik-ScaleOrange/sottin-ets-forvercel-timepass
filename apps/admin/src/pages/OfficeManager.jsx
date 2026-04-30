/**
 * OfficeManager.jsx — Admin page
 *
 * Full CRUD for offices:
 *   - Search / paginate all offices
 *   - Add new office (name, short_name, area, lat, lng, building_name, aliases, gates, verified)
 *   - Edit any existing office
 *   - Delete (blocked if used in survey responses)
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AREAS = [
  'Madhapur', 'Financial District', 'Gachibowli',
  'Nanakramguda', 'Hitech City', 'Kondapur', 'Other',
];

const EMPTY_FORM = {
  name: '', short_name: '', area: 'Financial District',
  lat: '', lng: '', building_name: '', aliases: '',
  gates: '', verified: false,
};

function Badge({ children, color = 'green' }) {
  const cls = {
    green: 'bg-green-900/30 text-green-400 border-green-500/40',
    amber: 'bg-amber-900/30 text-amber-400 border-amber-500/40',
    slate: 'bg-slate-800 text-slate-400 border-slate-600/40',
    blue:  'bg-blue-900/30 text-blue-400 border-blue-500/40',
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

// ─── Gates Helper ─────────────────────────────────────────────────────────────

function parseGates(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── Modal Form ───────────────────────────────────────────────────────────────

function OfficeForm({ initial = EMPTY_FORM, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial);
  const [gatesError, setGatesError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isValid = form.name.trim() && form.area && form.lat && form.lng;

  const validateGates = (val) => {
    if (!val.trim()) { setGatesError(null); return; }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error('Must be an array');
      setGatesError(null);
    } catch {
      setGatesError('Invalid JSON — must be an array like [{"label":"Main Gate","lat":17.4,"lng":78.3}]');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-surface-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <h2 className="text-white font-semibold">
            {initial.id ? 'Edit Office' : 'Add New Office'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Name + Short Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Office Name *</label>
              <input
                id="off-name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Amazon Development Centre"
                className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Short Name</label>
              <input
                id="off-short-name"
                value={form.short_name}
                onChange={e => set('short_name', e.target.value)}
                placeholder="e.g. Amazon"
                className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
              />
            </div>
          </div>

          {/* Building Name */}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">
              Building / Campus Name
              <span className="text-slate-600 ml-1">(for dual-key search)</span>
            </label>
            <input
              id="off-building"
              value={form.building_name}
              onChange={e => set('building_name', e.target.value)}
              placeholder="e.g. Galleria Corporate Centre, Mindspace, DivyaSree"
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
            />
          </div>

          {/* Area */}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Area *</label>
            <select
              id="off-area"
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
                id="off-lat"
                type="number" step="any"
                value={form.lat}
                onChange={e => set('lat', e.target.value)}
                placeholder="17.4250"
                className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Longitude *</label>
              <input
                id="off-lng"
                type="number" step="any"
                value={form.lng}
                onChange={e => set('lng', e.target.value)}
                placeholder="78.3400"
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
              id="off-aliases"
              value={form.aliases}
              onChange={e => set('aliases', e.target.value)}
              placeholder="amazon dev centre, amazon hyd, adc"
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
            />
          </div>

          {/* Gates JSON */}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">
              Gate Coordinates <span className="text-slate-600">(JSON array, optional)</span>
            </label>
            <textarea
              id="off-gates"
              rows={3}
              value={form.gates}
              onChange={e => { set('gates', e.target.value); validateGates(e.target.value); }}
              placeholder={`[{"label":"Main Gate","lat":17.4251,"lng":78.3401},{"label":"East Gate","lat":17.4252,"lng":78.3405}]`}
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60 resize-none"
            />
            {gatesError && <p className="text-red-400 text-xs mt-1">{gatesError}</p>}
            {!gatesError && <p className="text-slate-600 text-xs mt-1">Leave empty if no specific gates. Used for gate-level selection chips in the app.</p>}
          </div>

          {/* Verified toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              id="off-verified"
              type="checkbox"
              checked={form.verified}
              onChange={e => set('verified', e.target.checked)}
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-white text-sm">Mark as verified</span>
          </label>

          {/* Tip */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl px-4 py-3">
            <p className="text-blue-300 text-xs">
              💡 Get gate coordinates: open <a href="https://openstreetmap.org" target="_blank" rel="noreferrer" className="underline">OSM</a> → navigate to the gate → right-click → copy lat/lng
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-surface-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border text-slate-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            id="off-save-btn"
            onClick={() => onSave(form)}
            disabled={!isValid || saving || !!gatesError}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-medium text-sm transition-colors"
          >
            {saving ? 'Saving…' : (initial.id ? 'Save Changes' : 'Add Office')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfficeManager() {
  const [data, setData]         = useState({ offices: [], total: 0, verifiedCount: 0, polygonCount: 0 });
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const LIMIT = 20;

  const fetchData = useCallback(async (q = search, p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/offices?search=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${p * LIMIT}`);
      setData(res);
    } catch (e) {
      setError('Failed to load offices: ' + (e.message || 'Unknown error'));
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
      const gatesArr = form.gates?.trim()
        ? JSON.parse(form.gates)
        : parseGates(form._rawGates);

      const payload = {
        name:          form.name.trim(),
        short_name:    form.short_name.trim() || null,
        area:          form.area,
        lat:           parseFloat(form.lat),
        lng:           parseFloat(form.lng),
        building_name: form.building_name?.trim() || null,
        aliases: typeof form.aliases === 'string'
          ? form.aliases.split(',').map(s => s.trim()).filter(Boolean)
          : form.aliases,
        gates:    gatesArr,
        verified: Boolean(form.verified),
      };

      if (form.id) {
        await api.patch(`/admin/offices/${form.id}`, payload);
        showSuccess(`✅ "${form.name}" updated successfully`);
      } else {
        await api.post('/admin/offices', payload);
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

  const handleDelete = async (off) => {
    if (!window.confirm(`Delete "${off.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/admin/offices/${off.id}`);
      showSuccess(`🗑️ "${off.name}" deleted`);
      fetchData(search, page);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const openEdit = (off) => {
    setModal({
      id:            off.id,
      name:          off.name,
      short_name:    off.short_name || '',
      area:          off.area,
      lat:           off.lat,
      lng:           off.lng,
      building_name: off.building_name || '',
      aliases:       (off.aliases || []).join(', '),
      gates:         off.gates && off.gates.length > 0
                       ? JSON.stringify(off.gates, null, 2)
                       : '',
      _rawGates:     off.gates || [],
      verified:      off.verified,
    });
  };

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🏢 Offices</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage all office/campus records in Madhapur, FD, Gachibowli
          </p>
        </div>
        <button
          id="add-office-btn"
          onClick={() => setModal(EMPTY_FORM)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium text-sm transition-colors active:scale-95"
        >
          <span className="text-base">+</span> Add Office
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
        <StatCard label="Total Offices" value={data.total} />
        <StatCard label="Verified" value={data.verifiedCount}
          sub={`${data.total ? Math.round(data.verifiedCount / data.total * 100) : 0}% of total`} />
        <StatCard label="Has OSM Polygon" value={data.polygonCount}
          sub="GPS boundary ready" />
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        <input
          id="off-search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name, building, or area…"
          className="w-full bg-surface-1 border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Name', 'Building', 'Area', 'Coords', 'Selections', 'Gates', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-400 text-xs font-medium uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : data.offices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No offices found{search ? ` for "${search}"` : ''}
                  </td>
                </tr>
              ) : (
                data.offices.map(off => (
                  <tr key={off.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{off.name}</p>
                      {off.short_name && (
                        <p className="text-slate-500 text-xs">{off.short_name}</p>
                      )}
                      {off.has_polygon && <span className="text-xs text-brand-500">🗺</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {off.building_name || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{off.area}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                      {off.lat?.toFixed(4)}, {off.lng?.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs text-center">
                      {off.selection_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {parseGates(off.gates).length > 0 ? (
                        <Badge color="blue">{parseGates(off.gates).length} gates</Badge>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={off.verified ? 'green' : 'amber'}>
                        {off.verified ? '✓ Verified' : 'Unverified'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(off)}
                          className="text-xs px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-500/40 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(off)}
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
              <span className="px-3 py-1.5 text-slate-400 text-xs">{page + 1} / {totalPages}</span>
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

      {/* Modal */}
      {modal !== null && (
        <OfficeForm
          initial={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
