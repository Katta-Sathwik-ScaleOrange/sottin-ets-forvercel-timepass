import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export function useAuth() {
  const { user, isAuthenticated, hasSurvey, hasBooking, setAuth, clearAuth } = useAuthStore();

  const loginWithGoogle = async (credential) => {
    const data = await api.post('/auth/google', { credential });
    setAuth(data);
    return data;
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/';
  };

  return { user, isAuthenticated, hasSurvey, hasBooking, loginWithGoogle, logout };
}
