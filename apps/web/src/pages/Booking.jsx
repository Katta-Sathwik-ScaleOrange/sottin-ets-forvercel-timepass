import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { RouteCard } from '@/components/booking/RouteCard';
import { ShiftSelector } from '@/components/booking/ShiftSelector';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { PriceTicker } from '@/components/booking/PriceTicker';
import { BookingReview } from '@/components/booking/BookingReview';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useInventory } from '@/hooks/useInventory';
import api from '@/lib/api';

export default function Booking() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const store = useBookingStore();
  const { selectedRoute, onwardShift, returnShift, selectedDates, selectedReturnDates, pricing } = store;

  const now = new Date();
  const bookingMonth = now.getDate() >= 25 ? now.getMonth() + 1 : now.getMonth();
  const bookingYear = bookingMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
  const adjMonth = bookingMonth > 11 ? 0 : bookingMonth;

  const { inventory, loading: invLoading } = useInventory(onwardShift?.id, bookingYear, adjMonth + 1);

  useEffect(() => {
    api.get('/routes').then(setRoutes).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handlePay = async () => {
    try {
      const holdRes = await api.post('/inventory/hold', { shift_id: onwardShift.id, dates: selectedDates });
      const orderRes = await api.post('/bookings', {
        onward_shift_id: onwardShift.id,
        return_shift_id: returnShift?.id,
        booking_dates: selectedDates,
        return_dates: selectedReturnDates,
      });
      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: orderRes.razorpayOrder.id,
        amount: orderRes.razorpayOrder.amount,
        currency: 'INR',
        name: 'Tellapur Transit',
        description: 'Seat booking',
        theme: { color: '#22c55e' },
        handler: () => navigate('/booking/confirm', { state: { bookingId: orderRes.booking.id } }),
      });
      rzp.open();
    } catch (e) { console.error(e); alert(e.error || 'Booking failed'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  if (routes.length === 0) {
    return (
      <div className="min-h-screen bg-surface-0 pb-20">
        <AppHeader title="Book" />
        <div className="px-4 pt-8 text-center space-y-4">
          <div className="text-5xl">🚧</div>
          <h2 className="text-xl font-bold text-white">Routes coming soon</h2>
          <p className="text-slate-400 text-sm">We're analyzing survey responses to determine the best routes. Check back soon!</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader title="Book" />
      <div className="px-4 space-y-4 pt-2">
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-white">Select route & shift</h2>
            <div className="space-y-3">
              {routes.map(r => (<RouteCard key={r.id} route={r} selected={selectedRoute?.id === r.id} onClick={() => store.setRoute(r)} />))}
            </div>
            {selectedRoute && (
              <div className="space-y-4">
                <ShiftSelector shifts={selectedRoute.shifts} selected={onwardShift} onSelect={store.setOnwardShift} direction="onward" />
                <ShiftSelector shifts={selectedRoute.shifts} selected={returnShift} onSelect={store.setReturnShift} direction="return" />
              </div>
            )}
            <Button size="full" disabled={!onwardShift} onClick={() => setStep(2)}>Select Dates</Button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-white">Select travel dates</h2>
            {invLoading ? <Spinner /> : <BookingCalendar year={bookingYear} month={adjMonth} inventory={inventory} selectedDates={selectedDates} onToggleDate={store.toggleDate} />}
            <PriceTicker onwardTrips={selectedDates.length} returnTrips={selectedReturnDates.length} pricing={pricing} />
            <Button size="full" disabled={selectedDates.length === 0} onClick={() => setStep(3)}>Review Booking</Button>
          </>
        )}
        {step === 3 && (
          <BookingReview
            booking={{ routeName: selectedRoute.name, onwardLabel: onwardShift?.label, returnLabel: returnShift?.label, onwardDates: selectedDates, returnDates: selectedReturnDates }}
            pricing={pricing} onPay={handlePay} loading={false}
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
}
