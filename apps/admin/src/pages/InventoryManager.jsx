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

function buildCalendar(year, month) {
  const rows = [];
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let week = new Array(5).fill(null);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
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

function StatCard({ icon, label, value, sub, colorClass }) {
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 flex items-start gap-3 hover:border-slate-600 transition-colors">
      <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs uppercase tracking-wider leading-none font-medium">{label}</p>
        <p className={clsx('text-2xl font-bold tabular-nums mt-1.5 leading-none', colorClass)}>{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-1 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

export default function InventoryManager() {
  const [routes, setRoutes]               = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState({ routes: true, inventory: false });
  const [error,     setError]     = useState('');

  useEffect(() => {
    api.get('/admin/routes')
      .then(data => setRoutes(Array.isArray(data) ? data : []))
      .catch(e  => setError(e.error || 'Failed to load routes'))
      .finally(()=> setLoading(l => ({ ...l, routes: false })));
  }, []);

  useEffect(() => {
    if (!selectedShiftId) { setInventory([]); return; }
    setLoading(l => ({ ...l, inventory: true }));
    setError('');
    api.get(`/admin/inventory/${selectedShiftId}/${year}/${month + 1}`)
      .then(data => setInventory(Array.isArray(data) ? data : []))
      .catch(e   => setError(e.error || 'Failed to load inventory'))
      .finally(()=> setLoading(l => ({ ...l, inventory: false })));
  }, [selectedShiftId, year, month]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const shifts        = selectedRoute?.shifts?.filter(Boolean) || [];
  const selectedShift = shifts.find(s => s.id === selectedShiftId);

  const invMap = {};
  inventory.forEach(i => {
    // pg returns DATE columns as "2026-05-01T00:00:00.000Z"; strip time so keys match "2026-05-01"
    const key = String(i.date).split('T')[0];
    invMap[key] = i;
  });

  const weeks = buildCalendar(year, month);

  const totalSeats  = inventory.reduce((s, i) => s + Number(i.seats_total),  0);
  const totalBooked = inventory.reduce((s, i) => s + Number(i.seats_booked), 0);
  const totalHeld   = inventory.reduce((s, i) => s + Number(i.seats_held),   0);
  const totalAvail  = inventory.reduce((s, i) => s + (Number(i.seats_total) - Number(i.seats_booked) - Number(i.seats_held)), 0);
  const fillRate    = totalSeats > 0 ? Math.round((totalBooked / totalSeats) * 100) : 0;
  const fillColor   = fillRate > 80 ? 'text-red-400' : fillRate > 50 ? 'text-yellow-400' : 'text-green-400';
  const fillSub     = fillRate > 80 ? 'near full — act fast' : fillRate > 50 ? 'filling up' : 'good availability';

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m > 11) { m = 0;  y++; }
    if (m <  0) { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory Manager</h1>
        <p className="text-slate-400 text-sm mt-0.5">View seat availability by shift and month</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">

          {/* Route */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Route</label>
            <select
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/60 transition-colors"
              value={selectedRouteId}
              onChange={e => { setSelectedRouteId(e.target.value); setSelectedShiftId(''); }}
              disabled={loading.routes}
            >
              <option value="">Select a route…</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.origin_area} → {r.destination_area} ({r.status})
                </option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shift</label>
            <select
              className="w-full bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/60 disabled:opacity-40 transition-colors"
              value={selectedShiftId}
              onChange={e => setSelectedShiftId(e.target.value)}
              disabled={!selectedRouteId || shifts.length === 0}
            >
              <option value="">Select a shift…</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.direction} · {s.departure_time})
                </option>
              ))}
            </select>
          </div>

          {/* Month navigator */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</label>
            <div className="flex items-center gap-2 bg-surface-2 border border-surface-border rounded-xl px-3 py-2.5">
              <button
                onClick={() => changeMonth(-1)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-3 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex-1 text-center text-sm text-white font-semibold">{MONTHS[month]} {year}</span>
              <button
                onClick={() => changeMonth(1)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-3 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Selected context pill */}
        {selectedShift && selectedRoute && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-slate-500 text-xs">Viewing:</span>
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-3 py-1 text-xs">
              <span className="text-brand-400 font-semibold">{selectedRoute.name}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">{selectedShift.label}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{selectedShift.direction}</span>
              <span className="text-slate-600">·</span>
              <span className="text-brand-500 font-mono font-semibold">{selectedShift.departure_time}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      {selectedShiftId && !loading.inventory && inventory.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon="🎫" label="Total Seats"  value={totalSeats}   sub={`${MONTHS[month]} ${year}`}       colorClass="text-white"     />
          <StatCard icon="✅" label="Available"     value={totalAvail}   sub="seats free"                       colorClass="text-green-400" />
          <StatCard icon="📌" label="Booked"        value={totalBooked}  sub="confirmed"                        colorClass="text-brand-500" />
          <StatCard icon="⏳" label="Held"           value={totalHeld}    sub="10-min hold"                      colorClass="text-yellow-400"/>
          <StatCard
            icon={fillRate > 80 ? '🔴' : fillRate > 50 ? '🟡' : '🟢'}
            label="Fill Rate"
            value={`${fillRate}%`}
            sub={fillSub}
            colorClass={fillColor}
          />
        </div>
      )}

      {/* ── Calendar ────────────────────────────────────────────────────────── */}
      {selectedShiftId ? (
        loading.inventory ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Spinner />
            <span className="text-slate-400 text-sm">Loading inventory…</span>
          </div>
        ) : (
          <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">

            {/* Calendar header row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-white font-bold text-lg leading-tight">{MONTHS[month]} {year}</h3>
                {selectedRoute && selectedShift && (
                  <p className="text-slate-500 text-xs leading-relaxed">
                    <span className="text-slate-300 font-medium">{selectedRoute.name}</span>
                    <span className="mx-1 text-slate-600">·</span>
                    <span className="text-brand-500 font-medium">{selectedShift.label}</span>
                    <span className="mx-1 text-slate-600">·</span>
                    <span>{selectedShift.direction}</span>
                    <span className="mx-1 text-slate-600">·</span>
                    <span className="font-mono">{selectedShift.departure_time}</span>
                  </p>
                )}
              </div>

              {/* Pill legend */}
              <div className="flex flex-wrap gap-2">
                {[
                  { dot: 'bg-green-400',  border: 'border-green-500/50',  bg: 'bg-green-500/15',  label: '>60% free' },
                  { dot: 'bg-yellow-400', border: 'border-yellow-500/50', bg: 'bg-yellow-500/15', label: '25–60%'    },
                  { dot: 'bg-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/15', label: '<25%'      },
                  { dot: 'bg-red-400',    border: 'border-red-500/50',    bg: 'bg-red-500/15',    label: 'Full'      },
                ].map(({ dot, border, bg, label }) => (
                  <div key={label} className={clsx('flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1', bg, border)}>
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', dot)} />
                    <span className="text-slate-200 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fill bar key */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm bg-brand-500" />
                <span>Booked seats</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm bg-yellow-400" />
                <span>Held (10-min)</span>
              </div>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-5 gap-2">
              {DAYS.map(d => (
                <div
                  key={d}
                  className="text-center text-xs font-bold text-slate-400 py-2 bg-surface-2 rounded-lg uppercase tracking-widest"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {weeks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No weekdays in this month</p>
            ) : (
              <div className="space-y-2">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-5 gap-2">
                    {week.map((dateObj, di) => {
                      if (!dateObj) return <div key={di} className="min-h-[88px]" />;

                      const inv       = invMap[dateObj.dateStr];
                      const total     = inv ? Number(inv.seats_total)  : null;
                      const booked    = inv ? Number(inv.seats_booked) : null;
                      const held      = inv ? Number(inv.seats_held)   : null;
                      const available = inv ? (total - booked - held)  : null;

                      const availPct  = (total > 0 && available !== null) ? (available / total) * 100 : 100;
                      const bookedPct = (total > 0 && booked  !== null)   ? (booked   / total) * 100 : 0;
                      const heldPct   = (total > 0 && held    !== null)   ? (held     / total) * 100 : 0;

                      const isFull = inv && available === 0;
                      const isLow  = inv && available !== null && availPct <= 25  && !isFull;
                      const isMid  = inv && available !== null && availPct > 25   && availPct <= 60;
                      const isGood = inv && available !== null && availPct > 60;

                      /* ── Cell background + border ─────────────────────── */
                      const tileClass = dateObj.past
                        ? 'bg-surface-0 border-surface-border opacity-35'
                        : !inv
                        ? 'bg-surface-2 border-surface-border'
                        : isFull
                        ? 'bg-red-500/20    border-red-500/55    shadow-sm shadow-red-900/30'
                        : isLow
                        ? 'bg-orange-500/20 border-orange-500/55 shadow-sm shadow-orange-900/30'
                        : isMid
                        ? 'bg-yellow-500/15 border-yellow-500/45'
                        : 'bg-green-500/15  border-green-500/40';

                      /* ── Seat-count text colour ────────────────────────── */
                      const seatColor = isFull
                        ? 'text-red-400'
                        : isLow
                        ? 'text-orange-400'
                        : isMid
                        ? 'text-yellow-400'
                        : inv ? 'text-green-400' : 'text-slate-600';

                      return (
                        <div
                          key={dateObj.dateStr}
                          className={clsx(
                            'rounded-xl border min-h-[88px] p-2 flex flex-col gap-0.5 transition-colors',
                            tileClass
                          )}
                        >
                          {/* Top row: day + FULL badge */}
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={clsx(
                              'text-sm font-bold leading-none',
                              dateObj.past ? 'text-slate-700' : 'text-white'
                            )}>
                              {dateObj.day}
                            </span>
                            {isFull && !dateObj.past && (
                              <span className="text-[7px] font-extrabold text-red-300 bg-red-500/30 border border-red-500/50 px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">
                                FULL
                              </span>
                            )}
                          </div>

                          {inv ? (
                            <div className="flex flex-col gap-1 flex-1">
                              {/* Available / Total */}
                              <div className="flex items-baseline gap-0.5 justify-center">
                                <span className={clsx('text-[15px] font-extrabold tabular-nums leading-none', seatColor)}>
                                  {available}
                                </span>
                                <span className="text-[9px] text-slate-600 font-medium leading-none">/{total}</span>
                              </div>

                              {/* B + H chips */}
                              {(booked > 0 || held > 0) && (
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {booked > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-brand-400 bg-brand-500/20 border border-brand-500/30 px-1.5 py-0.5 rounded-full leading-none">
                                      {booked}<span className="opacity-80 font-semibold">B</span>
                                    </span>
                                  )}
                                  {held > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 px-1.5 py-0.5 rounded-full leading-none">
                                      {held}<span className="opacity-80 font-semibold">H</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Dual fill bar: booked (brand) + held (yellow) */}
                              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden mt-auto">
                                <div className="h-full flex">
                                  {bookedPct > 0 && (
                                    <div
                                      className="h-full bg-brand-500 transition-all duration-300"
                                      style={{ width: `${bookedPct}%` }}
                                    />
                                  )}
                                  {heldPct > 0 && (
                                    <div
                                      className="h-full bg-yellow-400 transition-all duration-300"
                                      style={{ width: `${heldPct}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* No inventory record for this date */
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-sm text-slate-700 font-medium">—</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Empty-month message */}
            {inventory.length === 0 && weeks.length > 0 && (
              <div className="text-center py-10 border-t border-surface-border mt-4 space-y-2">
                <div className="text-4xl">📭</div>
                <p className="text-slate-300 text-sm font-semibold">
                  No inventory data yet for {MONTHS[month]} {year}
                </p>
                <p className="text-slate-600 text-xs max-w-sm mx-auto leading-relaxed">
                  Seat inventory rows are auto-created when the first booking hold is placed
                  by a rider. They will populate here once the booking window opens on the&nbsp;25th.
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        /* Nothing selected */
        <div className="bg-surface-1 border border-surface-border rounded-2xl flex items-center justify-center min-h-[320px]">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-3xl">🎫</span>
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold text-sm">Select a route and shift</p>
              <p className="text-slate-500 text-xs">to view the seat inventory calendar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
