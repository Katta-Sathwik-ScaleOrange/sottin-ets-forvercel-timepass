import { useMemo } from 'react';
import { calculatePriceFrontend, getNextTierNudge } from '@/lib/pricing';

export function usePricing(onwardTrips, returnTrips) {
  return useMemo(() => {
    const pricing = calculatePriceFrontend(onwardTrips, returnTrips);
    const nextTier = getNextTierNudge(onwardTrips);
    return { pricing, nextTier };
  }, [onwardTrips, returnTrips]);
}
