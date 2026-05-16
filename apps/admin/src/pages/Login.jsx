import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('tt_admin_token')) {
      navigate('/', { replace: true });
      return;
    }

    const init = () => {
      window.google?.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: true,
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('g_signin_btn'),
        { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', width: 260 }
      );
      window.google?.accounts.id.prompt();
    };

    if (window.google?.accounts) {
      init();
    } else {
      const id = setInterval(() => {
        if (window.google?.accounts) { clearInterval(id); init(); }
      }, 100);
      return () => clearInterval(id);
    }
  }, []);

  const handleCredential = async ({ credential }) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/google', { credential });
      if (data.user.role !== 'admin' && data.user.role !== 'ops') {
        setError('Access denied — this account does not have admin privileges.');
        return;
      }
      localStorage.setItem('tt_admin_token', data.token);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">🚌</span>
          </div>
          <h1 className="text-2xl font-bold text-white">TT Admin</h1>
          <p className="text-slate-400 text-sm">Sign in with your admin Google account</p>
        </div>

        <div className="bg-surface-1 border border-surface-border rounded-2xl p-8 space-y-6">
          <div className="flex justify-center min-h-[44px] items-center">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying credentials...
              </div>
            ) : (
              <div id="g_signin_btn" />
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        <p className="text-slate-600 text-xs text-center">
          Admin access only. Unauthorized attempts are logged.
        </p>
      </div>
    </div>
  );
}
