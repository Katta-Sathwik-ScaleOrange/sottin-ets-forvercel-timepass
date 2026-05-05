import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { SavingsTicker } from '@/components/home/SavingsTicker';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';

const UBER_BASELINE = 350;

function DateChips({ dates, max = 5 }) {
  const visible = dates.slice(0, max);
  const overflow = dates.length - max;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {visible.map(d => (
        <span key={d} className="bg-surface-3 text-slate-300 text-xs px-2 py-0.5 rounded-lg border border-surface-border">
          {formatDate(d)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="bg-brand-500/10 text-brand-500 text-xs px-2 py-0.5 rounded-lg border border-brand-500/20">
          +{overflow} more
        </span>
      )}
    </div>
  );
}

function UpcomingCard({ booking }) {
  const tripCount = booking.booking_dates?.length || 0;
  const perTrip = booking.per_trip_rate_onward || 250;
  const saved = Math.max(0, (UBER_BASELINE - perTrip) * tripCount);

  return (
    <Card className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🚌</span>
          <span className="text-white font-semibold text-sm truncate">{booking.route_name}</span>
        </div>
        <Badge label="Confirmed" variant="success" />
      </div>

      {/* Route corridor */}
      {(booking.origin_area || booking.destination_area) && (
        <div className="inline-flex items-center gap-2 bg-surface-2 border border-surface-border rounded-full px-3 py-1 text-xs">
          <span className="text-slate-400">{booking.origin_area || '—'}</span>
          <span className="text-brand-500 font-bold">→</span>
          <span className="text-slate-400">{booking.destination_area || '—'}</span>
        </div>
      )}

      {/* Shift label */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>🕐</span>
        <span>{booking.onward_label || booking.shift_label || '—'}</span>
        <span className="text-slate-600">·</span>
        <span>{tripCount} trip{tripCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Date chips */}
      {booking.booking_dates?.length > 0 && (
        <DateChips dates={booking.booking_dates} max={6} />
      )}

      {/* Footer: amount + savings */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border">
        <div>
          <p className="text-brand-500 font-bold text-lg">₹{Number(booking.amount_total).toLocaleString('en-IN')}</p>
          {saved > 0 && (
            <p className="text-slate-500 text-xs">₹{saved.toLocaleString('en-IN')} saved vs Uber</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-green-400 text-xs font-medium">Seat guaranteed</span>
        </div>
      </div>
    </Card>
  );
}

function PastCard({ booking }) {
  const tripCount = booking.booking_dates?.length || booking.onward_trips || 0;
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl px-4 py-3 opacity-60 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-slate-300 text-sm font-medium">{booking.route_name}</span>
        <span className="text-slate-400 text-sm font-semibold">₹{Number(booking.amount_total).toLocaleString('en-IN')}</span>
      </div>
      <p className="text-slate-500 text-xs">{booking.month_year || ''} · {tripCount} trip{tripCount !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function MyTrips() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/me').then(data => setBookings(Array.isArray(data) ? data : [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const now = new Date();

  // ── Only confirmed bookings count for stats and display ──────────────────
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  const upcoming = confirmedBookings.filter(b => {
    const lastDate = b.booking_dates?.[b.booking_dates.length - 1];
    return lastDate && new Date(lastDate) >= now;
  });
  const past = confirmedBookings.filter(b => {
    const lastDate = b.booking_dates?.[b.booking_dates.length - 1];
    return lastDate && new Date(lastDate) < now;
  });

  // Stats — derived from confirmed bookings only so pending/expired orders
  // don't inflate trip count or total paid.
  const totalTrips = confirmedBookings.reduce(
    (s, b) => s + (b.booking_dates?.length || b.onward_trips || 0), 0
  );
  const totalPaid = confirmedBookings.reduce(
    (s, b) => s + parseFloat(b.amount_total || 0), 0
  );
  const totalSaved = confirmedBookings.reduce((s, b) => {
    const trips  = b.booking_dates?.length || b.onward_trips || 0;
    const perTrip = b.per_trip_rate_onward || 250;
    return s + Math.max(0, (UBER_BASELINE - perTrip) * trips);
  }, 0);
  const monthsSet = new Set(confirmedBookings.map(b => b.month_year).filter(Boolean));

  if (loading) return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader title="My Trips" />
      <div className="px-4 space-y-4 pt-2">

        {confirmedBookings.length > 0 ? (
          <>
            {/* Savings ticker */}
            <SavingsTicker amount={totalSaved} />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Trips', value: totalTrips },
                { label: 'Months',      value: monthsSet.size > 0 ? monthsSet.size : (upcoming.length > 0 ? 1 : 0) },
                {
                  label: 'Total Paid',
                  value: totalPaid >= 10000
                    ? `₹${(totalPaid / 1000).toFixed(0)}k`
                    : `₹${totalPaid.toLocaleString('en-IN')}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-1 border border-surface-border rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-xl tabular-nums">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-white">Upcoming</h2>
                {upcoming.map(b => <UpcomingCard key={b.id} booking={b} />)}
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-white">Past Trips</h2>
                {past.map(b => <PastCard key={b.id} booking={b} />)}
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center pt-16 space-y-5 text-center">
            <div className="text-6xl">🎫</div>
            <div className="space-y-2">
              <p className="text-white font-semibold text-lg">No trips yet</p>
              <p className="text-slate-400 text-sm">Booking opens on the 25th of each month</p>
              <p className="text-slate-600 text-xs">Mon–Fri · 22-seater AC bus · From ₹150/trip</p>
            </div>
            <button
              onClick={() => navigate('/booking')}
              className="mt-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-2xl transition-colors active:scale-95"
            >
              🎫 Book Your Seat
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
