import { clsx } from 'clsx';

export function ShiftSelector({ shifts, selected, onSelect, direction = 'onward' }) {
  const filtered = shifts?.filter(s => s.direction === direction) || [];
  const isReturn = direction === 'return';

  if (filtered.length === 0) return (
    <p className="text-slate-500 text-sm">No {direction} shifts available</p>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-slate-300 capitalize">{direction} shift</p>
        {isReturn && (
          <span className="text-xs bg-surface-3 text-slate-500 border border-surface-border px-2 py-0.5 rounded-full">
            Optional
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {filtered.map(shift => {
          const isSelected = selected?.id === shift.id;
          return (
            <button
              key={shift.id}
              onClick={() => onSelect(isSelected ? null : shift)}
              className={clsx(
                'flex items-center gap-4 w-full rounded-xl border px-4 py-3 transition-all active:scale-[0.99] text-left',
                isSelected
                  ? 'bg-brand-500/15 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-surface-2 border-surface-border hover:border-slate-500'
              )}
            >
              {/* Clock icon */}
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                isSelected ? 'bg-brand-500/20' : 'bg-surface-3'
              )}>
                {isReturn ? '🔙' : '🕐'}
              </div>

              {/* Label + time */}
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-semibold', isSelected ? 'text-white' : 'text-slate-200')}>
                  {shift.label}
                </p>
                <p className={clsx('text-xs mt-0.5 font-mono', isSelected ? 'text-brand-500' : 'text-slate-500')}>
                  {shift.departure_time}
                </p>
              </div>

              {/* Direction badge */}
              <span className={clsx(
                'text-[11px] px-2 py-0.5 rounded-full border capitalize flex-shrink-0',
                isSelected
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-500'
                  : 'bg-surface-3 border-surface-border text-slate-500'
              )}>
                {direction}
              </span>

              {/* Checkmark */}
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
