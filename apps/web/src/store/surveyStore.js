import { create } from 'zustand';

export const useSurveyStore = create((set, get) => ({
  step: 1,
  totalSteps: 5, // 4 data steps + 1 confirm
  apartment: null,
  office: null,
  preferredDays: [],
  estimatedDays: null,
  morningBand: null,
  eveningBand: null,

  setApartment: (apartment) => set({ apartment }),
  setOffice: (office) => set({ office }),
  setPreferredDays: (days) => set({ preferredDays: days }),
  setEstimatedDays: (days) => set({ estimatedDays: days }),
  setMorningBand: (band) => set({ morningBand: band }),
  setEveningBand: (band) => set({ eveningBand: band }),

  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, s.totalSteps) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  goToStep: (n) => set({ step: n }),
  reset: () => set({ step: 1, apartment: null, office: null, preferredDays: [], estimatedDays: null, morningBand: null, eveningBand: null }),

  toPayload: () => {
    const s = get();
    return {
      apartment_id: s.apartment?.id,
      apartment_name_raw: s.apartment?.name,
      office_id: s.office?.id,
      office_name_raw: s.office?.name,
      preferred_days: s.preferredDays,
      estimated_days_month: s.estimatedDays,
      morning_band: s.morningBand,
      evening_band: s.eveningBand,
    };
  },
}));
