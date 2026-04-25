const ONWARD_TIERS = [
  { min: 1,  max: 4,  rate: 250, label: 'Standard' },
  { min: 5,  max: 9,  rate: 210, label: 'Saver' },
  { min: 10, max: 15, rate: 175, label: 'Value' },
  { min: 16, max: 22, rate: 150, label: 'Best Value' },
];
const RETURN_RATE = 130;

function getOnwardRate(trips) {
  const tier = ONWARD_TIERS.find(t => trips >= t.min && trips <= t.max);
  return tier ? tier.rate : 150;
}

export function calculatePriceFrontend(onwardTrips, returnTrips = 0) {
  if (onwardTrips === 0) return null;
  const perTripOnward = getOnwardRate(onwardTrips);
  const perTripReturn = returnTrips > 0 ? RETURN_RATE : 0;
  const total = (onwardTrips * perTripOnward) + (returnTrips * perTripReturn);
  return { perTripOnward, perTripReturn: perTripReturn || null, total, tiers: ONWARD_TIERS };
}

export function getNextTierNudge(onwardTrips) {
  for (const tier of ONWARD_TIERS) {
    if (onwardTrips < tier.min) return { tripsNeeded: tier.min - onwardTrips, rate: tier.rate, label: tier.label };
  }
  return null;
}

export { ONWARD_TIERS, RETURN_RATE };
