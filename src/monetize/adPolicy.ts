/**
 * When an interstitial may play. Pure functions over the saved ad state, so
 * the rules are easy to test and to tune (see config.ts).
 *
 * - Only when the player taps "next level", never during the victory, while
 *   admiring the garden, or in the daily challenge (the game asks at that moment only).
 * - Never before `ad_min_level`, nor during the first session.
 * - A minimum delay between two ads, shrinking as the player keeps coming back:
 *   a garden solved quickly simply falls within the delay. A rewarded video
 *   watched restarts the delay too.
 * - Never once the player bought "no ads".
 */
import type { MonetizeConfig } from './config';

export interface AdState {
  /** Day of the first launch (YYYY-MM-DD). */
  firstDay: string;
  /** Launches of the app so far (1 during the first session). */
  launches: number;
  /** When the last ad (interstitial or rewarded) ended, in ms since 1970; 0 for never. */
  lastAdAt: number;
  /** Interstitials shown so far. */
  interstitials: number;
  /** Interstitial count when the "no ads" offer was last shown (0: never). */
  offerAt: number;
  /** Bought "no ads". */
  noAds: boolean;
}

export function newAdState(today: string): AdState {
  return { firstDay: today, launches: 0, lastAdAt: 0, interstitials: 0, offerAt: 0, noAds: false };
}

/** Whole days between two YYYY-MM-DD days. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 86_400_000)) : 0;
}

/** Minimum seconds between two ads, for a player who installed `days` days ago. */
export function adInterval(days: number, c: MonetizeConfig): number {
  if (days >= c.ad_late_after_days) return c.ad_interval_late;
  if (days >= c.ad_mid_after_days) return c.ad_interval_mid;
  return c.ad_interval_first;
}

/** May an interstitial play now, as the player leaves `level` for the next one? */
export function interstitialAllowed(s: AdState, level: number, now: number, today: string, c: MonetizeConfig): boolean {
  if (s.noAds) return false;
  if (level < c.ad_min_level) return false;
  if (c.ad_skip_first_session && s.launches <= 1 && s.firstDay === today) return false;
  const days = daysBetween(s.firstDay, today);
  // The first ad of all may come once the other conditions hold.
  if (s.lastAdAt === 0) return true;
  return now - s.lastAdAt >= adInterval(days, c) * 1000;
}

/** After an interstitial: time to suggest the "no ads" purchase? */
export function offerDue(s: AdState, c: MonetizeConfig): boolean {
  if (s.noAds || s.interstitials < c.offer_after_ads) return false;
  if (s.offerAt === 0) return true;
  return s.interstitials - s.offerAt >= c.offer_every_ads;
}
