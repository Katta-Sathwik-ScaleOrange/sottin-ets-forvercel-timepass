import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { SavingsTicker } from '@/components/home/SavingsTicker';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';

export default function MyTrips() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/me').then(setBookings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.booking_dates?.[b.booking_dates.length - 1]) >= new Date());
  const past = bookings.filter(b => b.status === 'confirmed' && new Date(b.booking_dates?.[b.booking_dates.length - 1]) < new Date());
  const totalSaved = upcoming.reduce((sum, b) => sum + (350 - (b.per_trip_rate_onward || 250)) * b.onward_trips, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader title="My Trips" />
      <div className="px-4 space-y-4 pt-2">
        <SavingsTicker amount={totalSaved} />
        {upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Upcoming</h2>
            {upcoming.map(b => (
              <Card key={b.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{b.route_name}</span>
                  <Badge label="Confirmed" variant="success" />
                </div>
                <p className="text-slate-400 text-sm">{b.onward_label} · {b.onward_trips} trips</p>
                <div className="flex flex-wrap gap-1">
                  {b.booking_dates?.map(d => (<span key={d} className="bg-surface-3 text-slate-300 text-xs px-2 py-0.5 rounded">{formatDate(d)}</span>))}
                </div>
                <p className="text-brand-500 font-semibold text-sm">₹{Number(b.amount_total).toLocaleString('en-IN')}</p>
              </Card>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Past</h2>
            {past.map(b => (
              <Card key={b.id} className="space-y-1 opacity-60">
                <div className="flex justify-between"><span className="text-white text-sm">{b.route_name}</span><span className="text-slate-400 text-sm">₹{Number(b.amount_total).toLocaleString('en-IN')}</span></div>
                <p className="text-slate-500 text-xs">{b.month_year} · {b.onward_trips} trips</p>
              </Card>
            ))}
          </div>
        )}
        {bookings.length === 0 && (
          <div className="text-center pt-12 space-y-3">
            <div className="text-5xl">🎫</div>
            <p className="text-slate-400">No bookings yet</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
