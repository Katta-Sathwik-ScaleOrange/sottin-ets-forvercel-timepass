import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export function GoogleOneTap({ onSuccess }) {
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    const initGoogleOneTap = () => {
      window.google?.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const data = await api.post('/auth/google', { credential });
            localStorage.setItem('tt_token', data.token);
            setAuth(data);
            onSuccess?.(data);
          } catch (e) {
            console.error('Auth failed:', e);
          }
        },
        auto_select: true,
      });
      window.google?.accounts.id.prompt();
    };

    if (window.google?.accounts) {
      initGoogleOneTap();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(interval);
          initGoogleOneTap();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
