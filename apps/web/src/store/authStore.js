import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasSurvey: false,
      hasBooking: false,
      isAuthenticated: false,

      setAuth: ({ user, token, hasSurvey, hasBooking }) => {
        localStorage.setItem('tt_token', token);
        set({ user, token, hasSurvey, hasBooking: hasBooking || false, isAuthenticated: true });
      },

      setSurveyDone: () => set({ hasSurvey: true }),
      setBookingDone: () => set({ hasBooking: true }),

      clearAuth: () => {
        localStorage.removeItem('tt_token');
        set({ user: null, token: null, hasSurvey: false, hasBooking: false, isAuthenticated: false });
      },
    }),
    { name: 'tt_auth' }
  )
);
