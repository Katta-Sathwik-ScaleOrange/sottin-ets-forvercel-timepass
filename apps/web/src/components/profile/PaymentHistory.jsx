import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/BottomSheet';

export default function PaymentHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    api.get('/bookings/me')
      .then(data => {
        // Only confirmed bookings with amounts
        const confirmed = (Array.isArray(data) ? data : [])
          .filter(b => b.status === 'confirmed')
          .sort((a, b) => new Date(b.confirmed_at || b.created_at) - new Date(a.confirmed_at || a.created_at));
        setBookings(confirmed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="flex justify-center p-8">
        <Spinner />
      </Card>
    );
  }

  if (bookings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-white px-1">Payment History</h3>
      <Card className="divide-y divide-surface-border p-0 overflow-hidden">
        {bookings.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBooking(b)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-2 transition-colors active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{b.month_year}</p>
                <p className="text-slate-500 text-xs">
                  {b.confirmed_at ? formatDate(b.confirmed_at) : formatDate(b.created_at)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-semibold text-sm">{formatCurrency(b.amount_total)}</p>
              <Badge label="Paid" variant="success" />
            </div>
          </button>
        ))}
      </Card>

      <BottomSheet
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Payment Details"
      >
        {selectedBooking && (
          <div className="space-y-6 pb-4">
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm font-medium">Amount Paid</p>
              <h2 className="text-white text-3xl font-bold">{formatCurrency(selectedBooking.amount_total)}</h2>
              <Badge label="Payment Successful" variant="success" className="mt-2" />
            </div>

            <div className="space-y-4 bg-surface-3/30 rounded-2xl p-4 border border-surface-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Transaction ID</span>
                <span className="text-slate-300 font-mono text-xs">{selectedBooking.razorpay_payment_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Order ID</span>
                <span className="text-slate-300 font-mono text-xs">{selectedBooking.razorpay_order_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-300">{selectedBooking.confirmed_at ? formatDate(selectedBooking.confirmed_at) : formatDate(selectedBooking.created_at)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-semibold text-sm">Booking Summary</h4>
              <div className="space-y-3 bg-surface-1 rounded-2xl p-4 border border-surface-border">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Route</span>
                  <span className="text-slate-200 font-medium">{selectedBooking.route_name || 'Tellapur Transit'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Service</span>
                  <span className="text-slate-200 font-medium">Onward Commute</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Trips</span>
                  <span className="text-slate-200 font-medium">{selectedBooking.booking_dates?.length || selectedBooking.onward_trips} dates booked</span>
                </div>
                {selectedBooking.return_trips > 0 && (
                  <div className="flex justify-between text-sm border-t border-surface-border pt-3">
                    <span className="text-slate-500">Return Service</span>
                    <span className="text-slate-200 font-medium">{selectedBooking.return_dates?.length || selectedBooking.return_trips} dates booked</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full py-4 bg-surface-3 hover:bg-surface-4 text-white font-bold rounded-2xl active:scale-[0.98] transition-all"
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
