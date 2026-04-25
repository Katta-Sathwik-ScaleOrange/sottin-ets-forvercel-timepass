import { create } from 'zustand';
import { calculatePriceFrontend } from '@/lib/pricing';

export const useBookingStore = create((set, get) => ({
  selectedRoute: null,
  onwardShift: null,
  returnShift: null,
  selectedDates: [],
  selectedReturnDates: [],
  pricing: null,

  setRoute: (route) => set({ selectedRoute: route }),
  setOnwardShift: (shift) => set({ onwardShift: shift }),
  setReturnShift: (shift) => set({ returnShift: shift }),

  toggleDate: (dateStr) => {
    const s = get();
    const exists = s.selectedDates.includes(dateStr);
    const newDates = exists
      ? s.selectedDates.filter(d => d !== dateStr)
      : [...s.selectedDates, dateStr].sort();
    const pricing = calculatePriceFrontend(newDates.length, s.selectedReturnDates.length);
    set({ selectedDates: newDates, pricing });
  },

  toggleReturnDate: (dateStr) => {
    const s = get();
    const exists = s.selectedReturnDates.includes(dateStr);
    const newDates = exists
      ? s.selectedReturnDates.filter(d => d !== dateStr)
      : [...s.selectedReturnDates, dateStr].sort();
    const pricing = calculatePriceFrontend(s.selectedDates.length, newDates.length);
    set({ selectedReturnDates: newDates, pricing });
  },

  reset: () => set({
    selectedRoute: null, onwardShift: null, returnShift: null,
    selectedDates: [], selectedReturnDates: [], pricing: null,
  }),
}));
