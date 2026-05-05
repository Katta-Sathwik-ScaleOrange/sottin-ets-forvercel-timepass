import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';

export function RouteCard({ route, selected, onClick }) {
  const onwardShifts = route.shifts?.filter(s => s.direction === 'onward') || [];
  const returnShifts = route.shifts?.filter(s => s.direction === 'return') || [];
  const totalShifts = onwardShifts.length + returnShifts.length;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.99] relative overflow-hidden',
        selected
          ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
          : 'border-surface-border bg-surface-1 hover:border-slate-500'
      )}
    >
      {/* Left accent on selected */}
      {selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-2xl" />}

      <div className="space-y-2.5 pl-1">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <h3 className={clsx('font-semibold text-sm truncate', selected ? 'text-white' : 'text-slate-200')}>
            {route.name}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge label={route.status} variant={route.status === 'active' ? 'success' : 'default'} />
            <svg className={clsx('w-4 h-4 transition-colors', selected ? 'text-brand-500' : 'text-slate-600')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Origin → Destination pill */}
        <div className="flex items-center gap-2">
          <div className={clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
            selected ? 'bg-brand-500/20 border-brand-500/40' : 'bg-surface-2 border-surface-border'
          )}>
            <span className={selected ? 'text-white' : 'text-slate-300'}>{route.origin_area}</span>
            <span className="text-brand-500 font-bold text-base">→</span>
            <span className={selected ? 'text-white' : 'text-slate-300'}>{route.destination_area}</span>
          </div>
        </div>

        {/* Shift count summary */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{totalShifts} shift{totalShifts !== 1 ? 's' : ''}</span>
          {onwardShifts.length > 0 && (
            <span className="truncate">{onwardShifts.map(s => s.label).join(' · ')}</span>
          )}
        </div>
      </div>
    </button>
  );
}
