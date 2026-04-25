import { motion, AnimatePresence } from 'framer-motion';
import { getNextTierNudge } from '@/lib/pricing';

export function PriceTicker({ onwardTrips = 0, returnTrips = 0, pricing }) {
  if (onwardTrips === 0) {
    return (<div className="rounded-2xl bg-surface-2 border border-surface-border p-4 text-center"><p className="text-slate-400 text-sm">Select travel dates to see pricing</p></div>);
  }
  const nextTier = getNextTierNudge(onwardTrips);
  return (
    <div className="rounded-2xl bg-surface-2 border border-surface-border p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total</p>
          <AnimatePresence mode="wait">
            <motion.p key={pricing?.total} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
              className="text-2xl font-bold text-white">₹{pricing?.total?.toLocaleString('en-IN') || 0}</motion.p>
          </AnimatePresence>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">₹{pricing?.perTripOnward}/trip onward</p>
          {returnTrips > 0 && <p className="text-slate-400 text-xs">₹{pricing?.perTripReturn}/trip return</p>}
        </div>
      </div>
      <div className="text-xs text-slate-500 space-y-1 border-t border-surface-border pt-3">
        <div className="flex justify-between"><span>{onwardTrips} onward × ₹{pricing?.perTripOnward}</span><span>₹{(onwardTrips * (pricing?.perTripOnward || 0)).toLocaleString('en-IN')}</span></div>
        {returnTrips > 0 && <div className="flex justify-between"><span>{returnTrips} return × ₹{pricing?.perTripReturn}</span><span>₹{(returnTrips * (pricing?.perTripReturn || 0)).toLocaleString('en-IN')}</span></div>}
      </div>
      {nextTier && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-3 py-2">
          <p className="text-brand-500 text-xs font-medium">Add {nextTier.tripsNeeded} more {nextTier.tripsNeeded === 1 ? 'day' : 'days'} to unlock ₹{nextTier.rate}/trip →</p>
        </div>
      )}
    </div>
  );
}
