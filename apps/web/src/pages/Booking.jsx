import { useState, useEffect, useRef } from 'react';
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

const IS_DEV = import.meta.env.DEV;

export default function Booking() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [step, setStep] = useState(1);
  const store = useBookingStore();
  const { selectedRoute, onwardShift, returnShift, selectedDates, selectedReturnDates, pricing } = store;
  const heldShiftIdRef = useRef(null);

  const now = new Date();
  const bookingMonth = now.getDate() >= 25 ? now.getMonth() + 1 : now.getMonth();
  const bookingYear = bookingMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
  const adjMonth = bookingMonth > 11 ? 0 : bookingMonth;

  const { inventory, loading: invLoading } = useInventory(onwardShift?.id, bookingYear, adjMonth + 1);

  useEffect(() => {
    api.get('/routes').then(setRoutes).catch(console.error).finally(() => setLoading(false));
  }, []);

  const releaseHold = async () => {
    if (heldShiftIdRef.current) {
      try { await api.delete('/inventory/hold', { data: { shift_id: heldShiftIdRef.current } }); } catch (_) {}
      heldShiftIdRef.current = null;
    }
  };

  const handlePay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      await api.post('/inventory/hold', { shift_id: onwardShift.id, dates: selectedDates });
      heldShiftIdRef.current = onwardShift.id;

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
        description: `${selectedDates.length} trip${selectedDates.length > 1 ? 's' : ''} · ${onwardShift.label}`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: '',
        },
        notes: {
          booking_id: String(orderRes.booking.id),
        },
        theme: { color: '#22c55e' },
        modal: {
          ondismiss: () => {
            setPaying(false);
            releaseHold();
          },
          confirm_close: true,
          animation: true,
        },
        handler: async (response) => {
          try {
            await api.post('/bookings/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            heldShiftIdRef.current = null;
            navigate('/booking/confirm', { state: { bookingId: orderRes.booking.id } });
          } catch (_) {
            navigate('/booking/confirm', { state: { bookingId: orderRes.booking.id } });
          }
        },
      });

      rzp.on('payment.failed', (resp) => {
        setPaying(false);
        releaseHold();
        const desc = resp?.error?.description || resp?.error?.reason || 'Payment failed';
        const code = resp?.error?.code || '';
        if (IS_DEV) {
          alert(
            `Payment failed: ${desc}\n\n` +
            `Test card for Razorpay India:\n` +
            `Card: 4718 6000 0000 0002\n` +
            `CVV: 123  Expiry: 12/29  OTP: 1234\n\n` +
            `Or use UPI: success@razorpay`
          );
        } else {
          alert(`Payment could not be completed: ${desc}`);
        }
        console.error('Razorpay payment.failed', code, desc, resp?.error);
      });

      rzp.open();
    } catch (e) {
      setPaying(false);
      releaseHold();
      console.error(e);
      alert(e.message || e.error || 'Booking failed. Please try again.');
    }
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
          <>
            {IS_DEV && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 space-y-1">
                <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">Test Mode — Use these credentials</p>
                <p className="text-yellow-300 text-xs font-mono">Card: 4718 6000 0000 0002</p>
                <p className="text-yellow-300 text-xs font-mono">CVV: 123 · Expiry: 12/29 · OTP: 1234</p>
                <p className="text-yellow-300 text-xs font-mono">UPI: success@razorpay</p>
              </div>
            )}
            <BookingReview
              booking={{ routeName: selectedRoute.name, onwardLabel: onwardShift?.label, returnLabel: returnShift?.label, onwardDates: selectedDates, returnDates: selectedReturnDates }}
              pricing={pricing} onPay={handlePay} loading={paying}
            />
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
