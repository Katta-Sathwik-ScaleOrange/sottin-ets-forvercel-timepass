import { useMemo } from 'react';
import { clsx } from 'clsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getSeatColor(available, total) {
  if (available === 0) return 'unavailable';
  const pct = available / total;
  if (pct > 0.7) return 'green';
  if (pct > 0.25) return 'yellow';
  return 'red';
}

export function BookingCalendar({ year, month, inventory = [], selectedDates = [], onToggleDate, disabled = false }) {
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
        dates.push({ dateStr: d.toISOString().split('T')[0], day: d.getDate(), isPast: d < today, dow });
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

  return (
    <div className="select-none">
      <p className="text-center text-slate-400 text-sm font-medium mb-4 tracking-wide uppercase">{MONTHS[month]} {year}</p>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {['Mon','Tue','Wed','Thu','Fri'].map(d => (<div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 gap-1">
            {week.map((dateObj, di) => {
              if (!dateObj) return <div key={di} />;
              const inv = inventoryMap[dateObj.dateStr];
              const available = inv ? Number(inv.seats_available) : null;
              const total = inv ? Number(inv.seats_total) : 22;
              const isSelected = selectedDates.includes(dateObj.dateStr);
              const isPast = dateObj.isPast;
              const isFull = available === 0;
              const colorKey = available !== null ? getSeatColor(available, total) : 'unknown';
              return (
                <button key={dateObj.dateStr} onClick={() => !isPast && !isFull && !disabled && onToggleDate(dateObj.dateStr)}
                  disabled={isPast || isFull || disabled}
                  className={clsx(
                    'flex flex-col items-center justify-center rounded-xl py-2 px-1 transition-all duration-150 active:scale-95 border min-h-[52px]',
                    isSelected && 'bg-brand-500 border-brand-500 shadow-lg shadow-brand-500/30',
                    !isSelected && !isPast && !isFull && colorKey === 'green' && 'bg-surface-2 border-green-500/20 hover:border-green-500/60',
                    !isSelected && !isPast && !isFull && colorKey === 'yellow' && 'bg-surface-2 border-yellow-500/20 hover:border-yellow-500/60',
                    !isSelected && !isPast && !isFull && colorKey === 'red' && 'bg-surface-2 border-red-500/30 hover:border-red-500/60',
                    (isPast || isFull) && 'bg-surface-1 border-surface-border opacity-40 cursor-not-allowed',
                  )}>
                  <span className={clsx('text-sm font-semibold', isSelected ? 'text-white' : 'text-slate-200', (isPast || isFull) && 'text-slate-600')}>{dateObj.day}</span>
                  {!isPast && available !== null && (
                    <span className={clsx('text-[10px] mt-0.5 font-medium leading-none',
                      isSelected ? 'text-white/80' : '',
                      !isSelected && colorKey === 'green' && 'text-green-400',
                      !isSelected && colorKey === 'yellow' && 'text-yellow-400',
                      !isSelected && colorKey === 'red' && 'text-red-400',
                      isFull && 'text-slate-600',
                    )}>{isFull ? 'Full' : available}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4">
        {[{ color: 'bg-green-400', label: 'Available' },{ color: 'bg-yellow-400', label: 'Limited' },{ color: 'bg-red-400', label: 'Almost full' }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${color}`} /><span className="text-xs text-slate-500">{label}</span></div>
        ))}
      </div>
    </div>
  );
}
