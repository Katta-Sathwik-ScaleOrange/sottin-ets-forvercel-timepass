import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) return;

    const init = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: true,
      });

      // Render visible "Sign in with Google" button
      const btnContainer = document.getElementById('g_signin_btn');
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280,
        });
      }

      // Also trigger One-Tap popup
      window.google.accounts.id.prompt();
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          init();
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated]);

  const handleCredential = async ({ credential }) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/google', { credential });
      localStorage.setItem('tt_token', data.token);
      setAuth(data);
      navigate('/home', { replace: true });
    } catch (e) {
      setError(e.error || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-sm w-full"
      >
        {/* Logo + headline */}
        <div className="space-y-2">
          <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚌</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Tellapur Transit</h1>
          <p className="text-slate-400 text-base">Fixed-route corporate commute.<br />Tellapur → IT Corridor.</p>
        </div>

        {/* Feature bullets */}
        <div className="space-y-3 text-left">
          {[
            { icon: '🏠', text: 'Pickup from your apartment gate' },
            { icon: '🏢', text: 'Drop at your office door' },
            { icon: '💰', text: 'From ₹150/trip — 60% less than Uber' },
            { icon: '📅', text: 'Book your seat for the whole month' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 bg-surface-2 border border-surface-border rounded-xl px-4 py-3"
            >
              <span className="text-lg">{icon}</span>
              <span className="text-sm text-slate-300">{text}</span>
            </div>
          ))}
        </div>

        {/* Sign-in card */}
        <div className="bg-surface-1 border border-surface-border rounded-2xl p-6 space-y-4">
          <p className="text-slate-400 text-sm">Sign in with Google to get started</p>

          <div className="flex justify-center min-h-[44px] items-center">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </div>
            ) : (
              <div id="g_signin_btn" />
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
