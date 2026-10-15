/**
 * Each landed flight briefly boosts footfall for businesses near Airport City.
 * Data-only — pure function for tests / tick hooks.
 */

export const AIRPORT_CITY_ZONE = 'airport' as const;

/** Extra customers (fractional) granted to airport-zone businesses after a landing. */
export function visitorBoostFromLanding(
  landingsThisHour: number,
  baseBoost = 0.35,
): number {
  if (landingsThisHour <= 0) return 0;
  // diminishing returns after the 4th landing in the hour
  const effective = Math.min(landingsThisHour, 4) + Math.max(0, landingsThisHour - 4) * 0.25;
  return effective * baseBoost;
}

export function countLandingsInWindow(
  events: readonly { t: number; kind: string }[],
  now: number,
  windowSec = 3600,
): number {
  return events.filter((e) => e.kind === 'landing' && now - e.t <= windowSec && now >= e.t).length;
}
