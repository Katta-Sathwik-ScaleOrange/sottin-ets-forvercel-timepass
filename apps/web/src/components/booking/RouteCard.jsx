import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function RouteCard({ route, selected, onClick }) {
  const onwardShifts = route.shifts?.filter(s => s.direction === 'onward') || [];
  const returnShifts = route.shifts?.filter(s => s.direction === 'return') || [];

  return (
    <Card onClick={onClick} className={selected ? 'border-brand-500' : ''}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">{route.name}</h3>
          <Badge label={route.status} variant={route.status === 'active' ? 'success' : 'default'} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">{route.origin_area}</span>
          <span className="text-brand-500">→</span>
          <span className="text-slate-400">{route.destination_area}</span>
        </div>
        {onwardShifts.length > 0 && (
          <div className="text-xs text-slate-500">
            {onwardShifts.map(s => s.label).join(' · ')}
          </div>
        )}
      </div>
    </Card>
  );
}
