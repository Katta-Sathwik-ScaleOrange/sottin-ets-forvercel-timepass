import { useMemo } from 'react';
import { clsx } from 'clsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getSeatInfo(available, total) {
  if (available === null) return { key: 'unknown', bg: '', border: '', bar: '', text: '' };
  if (available === 0)    return { key: 'full',    bg: 'bg-red-500/5',    border: 'border-red-500/30',    bar: 'bg-red-400',    text: 'text-red-400' };
  const pct = available / total;
  if (pct > 0.7) return { key: 'green',  bg: 'bg-green-500/5',  border: 'border-green-500/25',  bar: 'bg-green-400',  text: 'text-green-400' };
  if (pct > 0.25) return { key: 'yellow', bg: 'bg-yellow-500/5', border: 'border-yellow-500/30', bar: 'bg-yellow-400', text: 'text-yellow-400' };
  return { key: 'red', bg: 'bg-red-500/5', border: 'border-red-500/30', bar: 'bg-red-400', text: 'text-red-400' };
}

export function BookingCalendar({ year, month, inventory = [], selectedDates = [], onToggleDate, disabled = false, pricing = null, preferredDays = [] }) {
  const inventoryMap = useMemo(() => {
    const map = {};
    inventory.forEach(i => { map[i.date] = i; });
    return map;
  }, [inventory]);

  const calendarDates = useMemo(() => {
    const dates = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date(); today.setHours(0,0,0,0);
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        const yearStr = d.getFullYear();
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
        dates.push({ dateStr, day: d.getDate(), isPast: d.getTime() < today.getTime(), dow });
      }
    }
    return dates;
  }, [year, month]);

  const weeks = useMemo(() => {
    const rows = [];
    let week = new Array(5).fill(null);
    calendarDates.forEach((dateObj) => {
      const col = dateObj.dow - 1;
      week[col] = dateObj;
      if (dateObj.dow === 5 || dateObj === calendarDates[calendarDates.length - 1]) {
        rows.push([...week]);
        week = new Array(5).fill(null);
      }
    });
    return rows;
  }, [calendarDates]);

  const selectedCount = selectedDates.length;
  const totalPrice = pricing?.total;

  return (
    <div className="select-none space-y-3">
      {/* Month header */}
      <p className="text-center text-slate-400 text-sm font-medium tracking-wide uppercase">
        {MONTHS[month]} {year}
      </p>

      {/* Selected summary */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/20 rounded-xl px-3 py-2">
          <span className="text-brand-500 text-sm font-medium">
            {selectedCount} date{selectedCount !== 1 ? 's' : ''} selected
          </span>
          {totalPrice !== undefined && (
            <span className="text-white text-sm font-bold">₹{totalPrice?.toLocaleString('en-IN')}</span>
          )}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-5 gap-1.5">
        {['Mon','Tue','Wed','Thu','Fri'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 gap-1.5">
            {week.map((dateObj, di) => {
              if (!dateObj) return <div key={di} />;
              const inv = inventoryMap[dateObj.dateStr];
              const available = inv ? Number(inv.seats_available) : null;
              const total = inv ? Number(inv.seats_total) : 22;
              
              const isSelected = selectedDates.includes(dateObj.dateStr);
              const isPast = dateObj.isPast;
              const isFull = available === 0;
              const { key: colorKey, bg, border, bar, text } = getSeatInfo(available, total);
              const bookedPct = inv ? (Number(inv.seats_booked) / total) * 100 : 0;
              
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const isPreferred = preferredDays.length === 0 || preferredDays.includes(dayNames[dateObj.dow]);
              const isDisabled = isPast || isFull || disabled || !isPreferred;

              return (
                <button
                  key={dateObj.dateStr}
                  onClick={() => !isDisabled && onToggleDate(dateObj.dateStr)}
                  disabled={isDisabled}
                  className={clsx(
                    'flex flex-col items-center justify-between rounded-xl pt-2 pb-1 px-1 transition-all duration-150 active:scale-95 border min-h-[64px] relative overflow-hidden',
                    isSelected && 'bg-brand-500 border-brand-500 shadow-lg shadow-brand-500/25',
                    !isSelected && !isDisabled && clsx(bg, border, 'hover:brightness-110'),
                    isDisabled && 'bg-surface-1 border-surface-border opacity-35 cursor-not-allowed',
                    !isSelected && !isDisabled && colorKey === 'unknown' && 'bg-surface-2 border-surface-border',
                  )}
                >
                  {/* Day number */}
                  <span className={clsx(
                    'text-sm font-bold',
                    isSelected ? 'text-white' : isDisabled ? 'text-slate-600' : 'text-slate-200'
                  )}>
                    {dateObj.day}
                  </span>

                  {/* Availability / checkmark */}
                  <span className={clsx(
                    'text-[10px] mt-0.5 font-semibold leading-none',
                    isSelected ? 'text-white text-sm' : '',
                    !isSelected && text,
                    isFull && 'text-slate-600',
                  )}>
                    {isSelected ? '✓' : isFull ? 'Full' : !isPreferred ? '—' : available !== null ? available : ''}
                  </span>

                  {/* Bottom fill bar */}
                  {!isPast && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-xl overflow-hidden">
                      {isSelected ? (
                        <div className="h-full w-full bg-white/40" />
                      ) : inv && !isFull ? (
                        <div className={clsx('h-full transition-all', bar)} style={{ width: `${Math.max(bookedPct, 2)}%` }} />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {[
          { color: 'bg-green-400', label: 'Available' },
          { color: 'bg-yellow-400', label: 'Limited' },
          { color: 'bg-red-400', label: 'Almost full' },
          { color: 'bg-brand-500', label: 'Selected' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
