import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export function BookingReview({ booking, pricing, onPay, loading }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Review booking</h2>
      <Card className="space-y-3">
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Route</span><span className="text-white text-sm font-medium">{booking.routeName}</span></div>
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Onward</span><span className="text-white text-sm">{booking.onwardLabel}</span></div>
        {booking.returnLabel && <div className="flex justify-between"><span className="text-slate-400 text-sm">Return</span><span className="text-white text-sm">{booking.returnLabel}</span></div>}
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-medium text-slate-400">Onward dates ({booking.onwardDates.length})</p>
        <div className="flex flex-wrap gap-1">
          {booking.onwardDates.map(d => (<span key={d} className="bg-surface-3 text-white text-xs px-2 py-1 rounded-lg">{formatDate(d)}</span>))}
        </div>
        {booking.returnDates?.length > 0 && (
          <>
            <p className="text-sm font-medium text-slate-400 mt-2">Return dates ({booking.returnDates.length})</p>
            <div className="flex flex-wrap gap-1">
              {booking.returnDates.map(d => (<span key={d} className="bg-surface-3 text-white text-xs px-2 py-1 rounded-lg">{formatDate(d)}</span>))}
            </div>
          </>
        )}
      </Card>
      <Card className="space-y-2">
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Onward</span><span className="text-white text-sm">{booking.onwardDates.length} × ₹{pricing?.perTripOnward}</span></div>
        {booking.returnDates?.length > 0 && <div className="flex justify-between"><span className="text-slate-400 text-sm">Return</span><span className="text-white text-sm">{booking.returnDates.length} × ₹{pricing?.perTripReturn}</span></div>}
        <div className="flex justify-between border-t border-surface-border pt-2 mt-2"><span className="text-white font-semibold">Total</span><span className="text-white font-bold text-lg">₹{pricing?.total?.toLocaleString('en-IN')}</span></div>
      </Card>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        <p className="text-red-400 text-xs">Booked seats cannot be cancelled or refunded. No-show = seat forfeited.</p>
      </div>
      <Button size="full" loading={loading} onClick={onPay}>Pay ₹{pricing?.total?.toLocaleString('en-IN')}</Button>
    </div>
  );
}
