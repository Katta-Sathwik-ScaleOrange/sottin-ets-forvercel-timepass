export function NextTripReminder({ trip }) {
  if (!trip) return null;
  return (
    <div className="bg-surface-2 border border-surface-border rounded-2xl p-4 space-y-1">
      <p className="text-slate-400 text-xs uppercase tracking-wider">Next trip</p>
      <p className="text-white font-semibold">{new Date(trip.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
      <p className="text-slate-400 text-sm">{trip.departureTime} · {trip.stopName}</p>
    </div>
  );
}
