// Pricing tiers based on number of onward trips
const ONWARD_TIERS = [
  { min: 1,  max: 4,  rate: 250 },
  { min: 5,  max: 9,  rate: 210 },
  { min: 10, max: 15, rate: 175 },
  { min: 16, max: 22, rate: 150 },
];
const RETURN_RATE = 130;

function getOnwardRate(trips) {
  const tier = ONWARD_TIERS.find(t => trips >= t.min && trips <= t.max);
  return tier ? tier.rate : 150;
}

function calculatePrice(onwardTrips, returnTrips = 0) {
  const perTripOnward = getOnwardRate(onwardTrips);
  const perTripReturn = returnTrips > 0 ? RETURN_RATE : 0;
  const total = (onwardTrips * perTripOnward) + (returnTrips * perTripReturn);

  return {
    perTripOnward,
    perTripReturn: perTripReturn || null,
    total,
    breakdown: {
      onward: `${onwardTrips} trips × ₹${perTripOnward} = ₹${onwardTrips * perTripOnward}`,
      return: returnTrips ? `${returnTrips} trips × ₹${RETURN_RATE} = ₹${returnTrips * RETURN_RATE}` : null,
    },
    tiers: ONWARD_TIERS,
  };
}

module.exports = { calculatePrice, getOnwardRate, ONWARD_TIERS, RETURN_RATE };
