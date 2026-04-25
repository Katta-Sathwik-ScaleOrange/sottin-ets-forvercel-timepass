const STAGE3_FEATURES = [
  { icon: '🗺️', title: 'Live Bus Tracking', desc: 'Real-time GPS location of all buses on a MapLibre map' },
  { icon: '📋', title: 'Trip Manifests', desc: 'Passenger list per bus with boarding confirmations' },
  { icon: '🔔', title: 'Rider Notifications', desc: 'WhatsApp + push alerts for bus approach and delays' },
  { icon: '⏱️', title: 'ETA Engine', desc: 'Dynamic ETA calculation per stop using GPS and traffic' },
  { icon: '📊', title: 'Daily Ops Report', desc: 'Automated summary of ridership, on-time rate, no-shows' },
];

export default function LiveOps() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Live Ops</h1>
        <p className="text-slate-400 text-sm mt-0.5">Real-time bus tracking and trip management</p>
      </div>

      {/* Stage banner */}
      <div className="bg-surface-1 border border-yellow-500/20 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-xl">🚧</div>
          <div>
            <p className="text-white font-semibold">Stage 3 — Coming after booking launch</p>
            <p className="text-slate-400 text-sm">Live Ops is built after ridership data exists from Stage 2 bookings</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-4 py-2.5 w-fit">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-sm text-slate-300">Currently live: Stage 1 (Survey) + Stage 2 (Booking)</span>
        </div>
      </div>

      {/* Planned features */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-semibold">Planned Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STAGE3_FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-surface-2 border border-surface-border rounded-xl p-4 space-y-2 opacity-60">
              <span className="text-2xl">{icon}</span>
              <p className="text-white text-sm font-medium">{title}</p>
              <p className="text-slate-400 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack for stage 3 */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm">Stage 3 Tech Stack</h3>
        <div className="flex flex-wrap gap-2">
          {['MapLibre GL', 'Socket.io', 'MQTT', 'Firebase Cloud Messaging', 'WhatsApp Business API'].map(t => (
            <span key={t} className="text-xs bg-surface-3 text-slate-400 border border-surface-border px-3 py-1.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
