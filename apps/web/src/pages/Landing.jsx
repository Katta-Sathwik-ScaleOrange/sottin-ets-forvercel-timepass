import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { GoogleOneTap } from '@/components/shared/GoogleOneTap';
import { Button } from '@/components/ui/Button';

export default function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  if (isAuthenticated) { navigate('/home', { replace: true }); return null; }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 text-center">
      <GoogleOneTap onSuccess={() => navigate('/home')} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-sm">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚌</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Tellapur Transit</h1>
          <p className="text-slate-400 text-base">Fixed-route corporate commute. Tellapur → IT Corridor.</p>
        </div>
        <div className="space-y-3 text-left">
          {[
            { icon: '🏠', text: 'Pickup from your apartment gate' },
            { icon: '🏢', text: 'Drop at your office door' },
            { icon: '💰', text: 'From ₹150/trip — 60% less than Uber' },
            { icon: '📅', text: 'Book your seat for the whole month' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-surface-2 border border-surface-border rounded-xl px-4 py-3">
              <span className="text-lg">{icon}</span>
              <span className="text-sm text-slate-300">{text}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3 pt-4">
          <p className="text-slate-500 text-xs">Sign in with Google to get started</p>
          <div id="g_id_onload" />
        </div>
      </motion.div>
    </div>
  );
}
