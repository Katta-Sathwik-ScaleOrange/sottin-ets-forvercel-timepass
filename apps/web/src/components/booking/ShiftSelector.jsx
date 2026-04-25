import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';

export function ShiftSelector({ shifts, selected, onSelect, direction = 'onward' }) {
  const filtered = shifts?.filter(s => s.direction === direction) || [];

  if (filtered.length === 0) return <p className="text-slate-500 text-sm">No {direction} shifts available</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-400 capitalize">{direction} shift</p>
      <div className="flex flex-wrap gap-2">
        {filtered.map(shift => (
          <button key={shift.id} onClick={() => onSelect(shift)}
            className={clsx(
              'px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95',
              selected?.id === shift.id
                ? 'bg-brand-500/20 border-brand-500 text-brand-500'
                : 'bg-surface-2 border-surface-border text-slate-300 hover:border-slate-500'
            )}>
            {shift.label}
          </button>
        ))}
      </div>
    </div>
  );
}
