import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/shared/BottomNav';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Generates a Google Calendar "TEMPLATE" URL for a single event.
 * Since multiple discrete dates can't be added in one link without recurrence rules,
 * we focus on the first upcoming trip and list summary of others in the description.
 */
function getGoogleCalendarUrl(store) {
  const { selectedRoute, onwardShift, returnShift, selectedDates, selectedReturnDates } = store;
  
  const hasOnward = selectedDates && selectedDates.length > 0;
  const hasReturn = selectedReturnDates && selectedReturnDates.length > 0;
  
  if (!hasOnward && !hasReturn) return null;

  // Use the earliest onward trip, or earliest return trip if no onward
  const tripDate = hasOnward ? selectedDates[0] : selectedReturnDates[0];
  const shift = hasOnward ? onwardShift : returnShift;
  const type = hasOnward ? 'Onward' : 'Return';

  if (!shift || !selectedRoute) return null;

  // Create start/end dates in IST (UTC+5:30)
  // Format: YYYY-MM-DDTHH:mm:ss+05:30
  const start = new Date(`${tripDate}T${shift.departure_time}:00+05:30`);
  // Assume 1 hour trip duration if not specified
  const end = new Date(start.getTime() + 60 * 60 * 1000); 

  // Google TEMPLATE URL expects UTC format: YYYYMMDDTHHMMSSZ
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const title = `Tellapur Transit: ${type} — ${selectedRoute.name}`;
  
  // Find stops for location
  const stops = selectedRoute.stops || [];
  const pickup = stops.find(s => s.stop_type === 'pickup')?.label || selectedRoute.origin_area;
  const drop = [...stops].reverse().find(s => s.stop_type === 'drop')?.label || selectedRoute.destination_area;
  const location = `${pickup} to ${drop}`;
  
  const totalTrips = (selectedDates?.length || 0) + (selectedReturnDates?.length || 0);
  
  let details = `Bus Shift: ${shift.label}\n`;
  details += `Departure Time: ${shift.departure_time}\n\n`;
  
  if (totalTrips > 1) {
    details += `Note: This event is for your FIRST booked trip on ${formatDate(tripDate)}. \n`;
    details += `You have ${totalTrips} total trips booked this month. \n`;
    details += `Check the "My Trips" section in the app for your full schedule.\n\n`;
  }
  
  details += `Booked via Tellapur Transit. Track your bus live in the app on the day of travel.`;

  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  return `${baseUrl}&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&dates=${fmt(start)}/${fmt(end)}`;
}

export default function BookingConfirm() {
  const navigate = useNavigate();
  const setBookingDone = useAuthStore(s => s.setBookingDone);
  const store = useBookingStore();
  const { selectedRoute, onwardShift, returnShift, selectedDates, selectedReturnDates, pricing, reset } = store;

  useEffect(() => {
    setBookingDone();
    // clear booking store after a delay so details are still visible
    // Increased to 60s to give user time to interact
    const t = setTimeout(() => reset(), 60000);
    return () => clearTimeout(t);
  }, []);

  const calendarUrl = getGoogleCalendarUrl(store);

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

          {/* Booking Summary Card */}
          {selectedRoute && (
            <Card className="space-y-4 text-left border-brand-500/30 bg-brand-500/5 shadow-xl shadow-brand-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-xl flex-shrink-0">
                  🚌
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm leading-tight truncate">{selectedRoute.name}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mt-0.5">Confirmed Route</p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {onwardShift && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Onward Shift</span>
                      <span className="text-brand-400 text-xs font-bold px-2 py-0.5 bg-brand-500/10 rounded-md border border-brand-500/20">
                        {onwardShift.label}
                      </span>
                    </div>
                    {selectedDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDates.slice(0, 8).map(d => (
                          <span key={d} className="text-[10px] bg-surface-3 text-slate-300 px-2 py-1 rounded-md border border-surface-border font-medium">
                            {formatDate(d)}
                          </span>
                        ))}
                        {selectedDates.length > 8 && (
                          <span className="text-[10px] text-slate-500 font-bold ml-1 self-center">
                            +{selectedDates.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {returnShift && selectedReturnDates.length > 0 && (
                  <div className="space-y-2 border-t border-surface-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Return Shift</span>
                      <span className="text-brand-400 text-xs font-bold px-2 py-0.5 bg-brand-500/10 rounded-md border border-brand-500/20">
                        {returnShift.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedReturnDates.slice(0, 8).map(d => (
                        <span key={d} className="text-[10px] bg-surface-3 text-slate-300 px-2 py-1 rounded-md border border-surface-border font-medium">
                          {formatDate(d)}
                        </span>
                      ))}
                      {selectedReturnDates.length > 8 && (
                        <span className="text-[10px] text-slate-500 font-bold ml-1 self-center">
                          +{selectedReturnDates.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {pricing && (
                <div className="border-t border-surface-border pt-3 flex justify-between items-center">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Total Paid</span>
                  <span className="text-brand-500 font-black text-xl">
                    ₹{pricing.total?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button 
              size="full" 
              onClick={() => navigate('/trips')} 
              className="shadow-lg shadow-brand-500/20"
            >
              📋 View My Bookings
            </Button>
            
            {calendarUrl && (
              <Button
                size="full"
                variant="secondary"
                onClick={() => window.open(calendarUrl, '_blank', 'noopener')}
              >
                📅 Add to Google Calendar
              </Button>
            )}

            <Button
              size="full"
              variant="secondary"
              onClick={() => {
                const shareData = {
                  title: 'Tellapur Transit',
                  text: `I just booked my commute to ${selectedRoute?.destination_area || 'work'} on Tellapur Transit! 🚌 No more driving stress. Check if they have a route for you!`,
                  url: window.location.origin,
                };

                if (navigator.share) {
                  navigator.share(shareData).catch(() => {});
                } else {
                  // Fallback: Copy to clipboard
                  navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                  alert('Referral link copied to clipboard!');
                }
              }}
            >
              📤 Tell a neighbor
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
