import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/shared/BottomNav';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function addToGoogleCalendar(selectedDates, routeName, shiftLabel, departureTime) {
  if (!selectedDates || selectedDates.length === 0) return;
  const firstDate = selectedDates[0].replace(/-/g, '');
  const title = encodeURIComponent(`Tellapur Transit — ${routeName}`);
  const details = encodeURIComponent(`${shiftLabel} bus. Booked via Tellapur Transit.`);
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${firstDate}/${firstDate}`;
  window.open(url, '_blank', 'noopener');
}

export default function BookingConfirm() {
  const navigate = useNavigate();
  useLocation(); // keep for potential future state reads
  const setBookingDone = useAuthStore(s => s.setBookingDone);
  const store = useBookingStore();
  const { selectedRoute, onwardShift, returnShift, selectedDates, selectedReturnDates, pricing, reset } = store;

  useEffect(() => {
    setBookingDone();
    // clear booking store after a delay so details are still visible
    const t = setTimeout(() => reset(), 30000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-surface-0 pb-20 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 max-w-sm w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="text-7xl"
          >
            🎉
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Booking Confirmed!</h1>
            <p className="text-slate-400 text-sm">Your seats are reserved. See you on the bus!</p>
          </div>

          {/* Booking Summary */}
          {selectedRoute && (
            <Card className="space-y-3 text-left">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚌</span>
                <p className="text-white font-semibold text-sm">{selectedRoute.name}</p>
              </div>

              {onwardShift && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Onward shift</span>
                    <span className="text-white font-medium">{onwardShift.label}</span>
                  </div>
                  {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDates.slice(0, 6).map(d => (
                        <span key={d} className="text-xs bg-surface-3 text-slate-300 px-1.5 py-0.5 rounded">
                          {formatDate(d)}
                        </span>
                      ))}
                      {selectedDates.length > 6 && (
                        <span className="text-xs text-slate-500">+{selectedDates.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {returnShift && selectedReturnDates.length > 0 && (
                <div className="space-y-1 border-t border-surface-border pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Return shift</span>
                    <span className="text-white font-medium">{returnShift.label}</span>
                  </div>
                </div>
              )}

              {pricing && (
                <div className="border-t border-surface-border pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Total paid</span>
                    <span className="text-brand-500 font-bold text-lg">
                      ₹{pricing.total?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button size="full" onClick={() => navigate('/trips')}>
              📋 View My Bookings
            </Button>
            {selectedDates.length > 0 && (
              <Button
                size="full"
                variant="secondary"
                onClick={() => addToGoogleCalendar(selectedDates, selectedRoute?.name || 'Commute', onwardShift?.label || '', onwardShift?.departure_time || '')}
              >
                📅 Add to Google Calendar
              </Button>
            )}
            <Button
              size="full"
              variant="secondary"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Tellapur Transit',
                    text: 'I just booked my corporate commute on Tellapur Transit! ₹150/trip from your apartment.',
                    url: window.location.origin,
                  });
                }
              }}
            >
              📤 Tell a neighbour
            </Button>
            <Button size="full" variant="ghost" onClick={() => navigate('/home')}>
              Go to Home
            </Button>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
