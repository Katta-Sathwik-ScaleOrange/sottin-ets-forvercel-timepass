import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { TripCard } from '@/components/home/TripCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';

function useCountdown(targetDate) {
  const [secs, setSecs] = useState(() => {
    const diff = Math.floor((new Date(targetDate) - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  useEffect(() => {
    const id = setInterval(() => {
      const diff = Math.floor((new Date(targetDate) - Date.now()) / 1000);
      setSecs(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return secs;
}

function CountdownUnit({ value, label }) {
  return (
    <div className="text-center min-w-[40px]">
      <div className="text-2xl font-bold text-white tabular-nums">{String(value).padStart(2, '0')}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function NextTripBanner({ trip }) {
  if (!trip) return null;
  const dates = trip.booking_dates || [];
  const nextDate = dates.find(d => new Date(d) >= new Date(new Date().toDateString()));
  if (!nextDate) return null;

  const isToday = nextDate === new Date().toISOString().split('T')[0];
  const formatted = new Date(nextDate).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

  // Build a departure timestamp for countdown (today + departure_time if available)
  const departureTime = trip.departure_time || '08:00:00';
  const [h, m] = departureTime.split(':');
  const departureTs = new Date(nextDate + 'T' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':00');
  const secs = useCountdown(departureTs);
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
        <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Next Trip</p>
        {isToday && secs > 0 && (
          <span className="ml-auto bg-brand-500/20 text-brand-500 text-xs px-2 py-0.5 rounded-full border border-brand-500/30 font-medium">
            Today
          </span>
        )}
      </div>

      {isToday && secs > 0 ? (
        <div className="space-y-2">
          <p className="text-slate-400 text-xs">Departs in</p>
          <div className="flex items-end gap-3">
            {hrs > 0 && <CountdownUnit value={hrs} label="hr" />}
            <CountdownUnit value={mins} label="min" />
            <CountdownUnit value={sec} label="sec" />
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-white font-bold text-lg">{formatted}</p>
            <p className="text-slate-400 text-sm">{trip.shift_label || departureTime}</p>
            {trip.destination_area && (
              <p className="text-slate-500 text-xs">→ {trip.destination_area}</p>
            )}
          </div>
          <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center">
            <span className="text-xl">🚌</span>
          </div>
        </div>
      )}

      {trip.stop_name && (
        <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2">
          <span className="text-brand-500 text-xs">📍</span>
          <span className="text-slate-300 text-xs">Board at: {trip.stop_name}</span>
        </div>
      )}
    </Card>
  );
}

function SavingsBanner({ bookings }) {
  if (!bookings || bookings.length === 0) return null;
  const UBER_BASELINE = 350;
  const totalTrips = bookings.reduce((s, b) => s + (b.onward_trips || 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + parseFloat(b.amount_total || 0), 0);
  const uberCost = totalTrips * UBER_BASELINE;
  const saved = Math.max(0, uberCost - totalPaid);
  if (saved === 0) return null;
  return (
    <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl px-4 py-3">
      <span className="text-xl">💰</span>
      <div>
        <p className="text-brand-500 font-bold text-sm">₹{saved.toLocaleString('en-IN')} saved vs Uber/Ola</p>
        <p className="text-slate-500 text-xs">{totalTrips} trips booked · ₹{UBER_BASELINE}/trip baseline</p>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { hasSurvey, hasBooking } = useAuthStore();
  const [tripData, setTripData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(hasBooking);

  useEffect(() => {
    if (!hasBooking) { setLoading(false); return; }
    Promise.all([
      api.get('/trips/active').catch(() => null),
      api.get('/bookings/me').catch(() => []),
    ]).then(([tripRes, bookingRes]) => {
      setTripData(tripRes);
      setBookings(Array.isArray(bookingRes) ? bookingRes : []);
    }).finally(() => setLoading(false));
  }, [hasBooking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader />
      <div className="px-4 space-y-4 pt-2">

        {/* Trip state when user has bookings */}
        {hasBooking && tripData ? (
          <>
            {tripData.tripState === 'active' ? (
              <TripCard tripState="active" nextTrip={tripData.trip} savingsThisMonth={0} />
            ) : tripData.tripState === 'upcoming' ? (
              <NextTripBanner trip={tripData.trip} />
            ) : (
              <Card className="space-y-3">
                <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🚌</span>
                </div>
                <h2 className="text-xl font-bold text-white">All trips complete</h2>
                <p className="text-slate-400 text-sm">Booking opens on the 25th for next month's trips.</p>
              </Card>
            )}
            <SavingsBanner bookings={bookings} />
          </>
        ) : (
          /* Welcome state — no bookings yet */
          <Card glass className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚌</span>
              </div>
              {!hasSurvey && (
                <span className="bg-brand-500/20 text-brand-500 text-xs px-2.5 py-1 rounded-full border border-brand-500/30 font-medium">
                  🎯 3-min survey
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              {hasSurvey ? 'Routes coming soon!' : 'Welcome to Tellapur Transit'}
            </h2>
            <p className="text-slate-400 text-sm">
              {hasSurvey
                ? "We’re analysing survey data to plan routes. You’ll be notified when booking opens."
                : 'Join 250+ commuters on affordable fixed-route bus service from Tellapur.'}
            </p>
          </Card>
        )}

        {/* CTAs */}
        {!hasSurvey && (
          <Button size="full" onClick={() => navigate('/survey')}>
            📋 Take the Commute Survey
          </Button>
        )}
        {hasSurvey && (
          <Button size="full" variant="secondary" onClick={() => navigate('/booking')}>
            🎫 Book Your Seat
          </Button>
        )}

        {/* How it works */}
        <Card className="space-y-3">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">How it works</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Tell us your apartment & office', done: hasSurvey },
              { step: '2', text: 'We plan routes based on demand', done: false },
              { step: '3', text: 'Book your specific travel dates', done: hasBooking },
              { step: '4', text: 'Ride daily with a guaranteed seat', done: false },
            ].map(({ step, text, done }) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                  done ? 'bg-brand-500 text-white' : 'bg-brand-500/20 text-brand-500'
                }`}>
                  {done ? '✓' : step}
                </div>
                <span className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-300'}`}>{text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Service info */}
        <Card className="space-y-3">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Service Info</p>
          <div className="space-y-2">
            {[
              { icon: '🗺️', text: 'Fixed-route · Tellapur → Madhapur / FD / Gachibowli' },
              { icon: '📅', text: 'Mon–Fri only · Booking opens 25th each month' },
              { icon: '🚌', text: '22-seater AC bus · Guaranteed seat' },
              { icon: '💰', text: 'From ₹150/trip · 1–4 trips ₹250 · 16+ trips ₹150' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-sm mt-0.5">{icon}</span>
                <span className="text-slate-400 text-xs leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
