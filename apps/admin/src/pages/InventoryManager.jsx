import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import api from '@/lib/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri'];

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function availabilityColor(available, total) {
  if (available === 0) return 'text-red-400 bg-red-500/10 border-red-500/20';
  const pct = available / total;
  if (pct > 0.6) return 'text-green-400 bg-green-500/10 border-green-500/20';
  if (pct > 0.25) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
}

function buildCalendar(year, month) {
  const rows = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let week = new Array(5).fill(null);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); // 0=Sun..6=Sat
    if (dow === 0 || dow === 6) continue;
    const col = dow - 1;
    week[col] = {
      dateStr: d.toISOString().split('T')[0],
      day: d.getDate(),
      past: d < new Date(new Date().toDateString()),
    };
    if (dow === 5 || d.toDateString() === lastDay.toDateString()) {
      rows.push([...week]);
      week = new Array(5).fill(null);
    }
  }
  return rows;
}

export default function InventoryManager() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState({ routes: true, inventory: false });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/routes')
      .then(data => { setRoutes(Array.isArray(data) ? data : []); })
      .catch(e => setError(e.error || 'Failed to load routes'))
      .finally(() => setLoading(l => ({ ...l, routes: false })));
  }, []);

  useEffect(() => {
    if (!selectedShiftId) { setInventory([]); return; }
    setLoading(l => ({ ...l, inventory: true }));
    setError('');
    api.get(`/admin/inventory/${selectedShiftId}/${year}/${month + 1}`)
      .then(data => setInventory(Array.isArray(data) ? data : []))
      .catch(e => setError(e.error || 'Failed to load inventory'))
      .finally(() => setLoading(l => ({ ...l, inventory: false })));
  }, [selectedShiftId, year, month]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const shifts = selectedRoute?.shifts?.filter(Boolean) || [];
  const selectedShift = shifts.find(s => s.id === selectedShiftId);

  const invMap = {};
  inventory.forEach(i => { invMap[i.date] = i; });

  const weeks = buildCalendar(year, month);

  const totalSeats = inventory.reduce((s, i) => s + Number(i.seats_total), 0);
  const totalBooked = inventory.reduce((s, i) => s + Number(i.seats_booked), 0);
  const totalHeld = inventory.reduce((s, i) => s + Number(i.seats_held), 0);
  const totalAvail = inventory.reduce((s, i) => s + (Number(i.seats_total) - Number(i.seats_booked) - Number(i.seats_held)), 0);
  const fillRate = totalSeats > 0 ? Math.round((totalBooked / totalSeats) * 100) : 0;

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory Manager</h1>
        <p className="text-slate-400 text-sm mt-0.5">View seat availability by shift and month</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Route</label>
            <select
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
              value={selectedRouteId}
              onChange={e => { setSelectedRouteId(e.target.value); setSelectedShiftId(''); }}
              disabled={loading.routes}
            >
              <option value="">Select a route...</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Shift</label>
            <select
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 disabled:opacity-40"
              value={selectedShiftId}
              onChange={e => setSelectedShiftId(e.target.value)}
              disabled={!selectedRouteId || shifts.length === 0}
            >
              <option value="">Select a shift...</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.label} ({s.direction} · {s.departure_time})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Month</label>
            <div className="flex items-center gap-2 bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5">
              <button onClick={() => changeMonth(-1)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex-1 text-center text-sm text-white font-medium">{MONTHS[month]} {year}</span>
              <button onClick={() => changeMonth(1)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {selectedShiftId && !loading.inventory && inventory.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Seats', value: totalSeats, color: 'text-white' },
            { label: 'Booked', value: totalBooked, color: 'text-brand-500' },
            { label: 'Held', value: totalHeld, color: 'text-yellow-400' },
            { label: 'Fill Rate', value: `${fillRate}%`, color: fillRate > 70 ? 'text-green-400' : 'text-slate-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-1 border border-surface-border rounded-xl p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
              <p className={clsx('text-2xl font-bold tabular-nums mt-1', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      {selectedShiftId ? (
        loading.inventory ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Spinner />
            <span className="text-slate-400 text-sm">Loading inventory...</span>
          </div>
        ) : (
          <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">
                {MONTHS[month]} {year}
                {selectedShift && <span className="text-slate-400 font-normal text-sm ml-2">· {selectedShift.label}</span>}
              </h3>
              <div className="flex items-center gap-3 text-xs">
                {[{ color: 'bg-green-400', label: '>60%' }, { color: 'bg-yellow-400', label: '25–60%' }, { color: 'bg-orange-400', label: '<25%' }, { color: 'bg-red-400', label: 'Full' }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={clsx('w-2 h-2 rounded-full', color)} />
                    <span className="text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-5 gap-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            {weeks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No weekdays in this month</p>
            ) : (
              <div className="space-y-2">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-5 gap-2">
                    {week.map((dateObj, di) => {
                      if (!dateObj) return <div key={di} />;
                      const inv = invMap[dateObj.dateStr];
                      const available = inv
                        ? Number(inv.seats_total) - Number(inv.seats_booked) - Number(inv.seats_held)
                        : null;
                      const total = inv ? Number(inv.seats_total) : null;
                      const booked = inv ? Number(inv.seats_booked) : null;
                      const held = inv ? Number(inv.seats_held) : null;

                      return (
                        <div
                          key={dateObj.dateStr}
                          className={clsx(
                            'rounded-xl p-2 border text-center transition-all',
                            dateObj.past ? 'opacity-40 bg-surface-0 border-surface-border' : 'bg-surface-2 border-surface-border',
                            inv && !dateObj.past && clsx('border', availabilityColor(available, total))
                          )}
                        >
                          <p className={clsx('text-sm font-semibold', dateObj.past ? 'text-slate-600' : 'text-white')}>
                            {dateObj.day}
                          </p>
                          {inv ? (
                            <div className="mt-1 space-y-0.5">
                              <p className={clsx('text-[10px] font-semibold leading-none',
                                available === 0 ? 'text-red-400' : available <= total * 0.25 ? 'text-orange-400' : available <= total * 0.6 ? 'text-yellow-400' : 'text-green-400'
                              )}>
                                {available}/{total}
                              </p>
                              {booked > 0 && <p className="text-[9px] text-brand-500 leading-none">{booked} bkd</p>}
                              {held > 0 && <p className="text-[9px] text-yellow-400 leading-none">{held} held</p>}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-600 mt-1">—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {inventory.length === 0 && weeks.length > 0 && (
              <p className="text-slate-500 text-sm text-center py-4">
                No inventory records for this month/shift. Inventory is created when the first booking hold is placed.
              </p>
            )}
          </div>
        )
      ) : (
        <div className="bg-surface-1 border border-surface-border rounded-2xl flex items-center justify-center min-h-[300px] text-slate-500">
          <div className="text-center space-y-2">
            <p className="text-3xl">🎫</p>
            <p className="text-sm">Select a route and shift to view inventory</p>
          </div>
        </div>
      )}
    </div>
  );
}
