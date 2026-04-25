import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

function Countdown({ departureTime }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    const target = new Date();
    const [h, m] = departureTime.split(':');
    target.setHours(parseInt(h), parseInt(m), 0, 0);
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((target - new Date()) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [departureTime]);
  const h = Math.floor(secondsLeft / 3600), m = Math.floor((secondsLeft % 3600) / 60), s = secondsLeft % 60;
  return (<div className="flex gap-2 items-end">{h > 0 && <Unit value={h} label="hr" />}<Unit value={m} label="min" /><Unit value={s} label="sec" /></div>);
}

function Unit({ value, label }) {
  return (<div className="text-center"><div className="text-2xl font-bold text-white tabular-nums">{String(value).padStart(2, '0')}</div><div className="text-xs text-slate-500">{label}</div></div>);
}

export function TripCard({ tripState, activeTrip, nextTrip, savingsThisMonth }) {
  if (tripState === 'active') {
    return (
      <Card glass className="space-y-3">
        <div className="flex items-center gap-2">
          <motion.div className="w-2 h-2 rounded-full bg-green-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <span className="text-green-400 text-sm font-medium">Live — Bus approaching</span>
        </div>
        <p className="text-white text-xl font-bold">Your stop in {activeTrip?.etaMinutes} min</p>
        <p className="text-slate-400 text-sm">{activeTrip?.stopName}</p>
        <div className="h-36 bg-surface-3 rounded-xl flex items-center justify-center text-slate-500 text-sm">Live map</div>
      </Card>
    );
  }
  if (tripState === 'today') {
    return (
      <Card glass className="space-y-4">
        <p className="text-slate-400 text-sm">Your bus departs in</p>
        <Countdown departureTime={nextTrip?.departureTime || '08:00'} />
        <div className="border-t border-surface-border pt-3 space-y-1">
          <p className="text-white font-medium">{nextTrip?.stopName}</p>
          <p className="text-slate-400 text-sm">→ {nextTrip?.destination}</p>
        </div>
      </Card>
    );
  }
  return (
    <Card glass className="space-y-4">
      <div>
        <p className="text-slate-400 text-sm">Next trip</p>
        <p className="text-white text-xl font-semibold mt-1">{nextTrip ? new Date(nextTrip.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : 'No trips booked'}</p>
        {nextTrip && <p className="text-slate-400 text-sm">{nextTrip.departureTime} · {nextTrip.stopName}</p>}
      </div>
      {savingsThisMonth > 0 && (
        <div className="flex items-center gap-3 bg-brand-500/10 rounded-xl px-3 py-2.5">
          <span className="text-xl">💰</span>
          <div><p className="text-brand-500 font-semibold text-sm">₹{savingsThisMonth.toLocaleString('en-IN')} saved this month</p><p className="text-slate-400 text-xs">vs Uber/Ola</p></div>
        </div>
      )}
    </Card>
  );
}
