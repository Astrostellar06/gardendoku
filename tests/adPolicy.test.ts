import { describe, expect, it } from 'vitest';
import { adInterval, daysBetween, interstitialAllowed, newAdState, offerDue } from '../src/monetize/adPolicy';
import { DEFAULT_CONFIG as C } from '../src/monetize/config';

const MIN = 60_000;

describe('interstitials', () => {
  it('wait for level 9 and for a second session', () => {
    const s = { ...newAdState('2026-11-01'), launches: 1 };
    expect(interstitialAllowed(s, 20, 0, '2026-11-01', C)).toBe(false);
    expect(interstitialAllowed({ ...s, launches: 2 }, 8, 0, '2026-11-01', C)).toBe(false);
    expect(interstitialAllowed({ ...s, launches: 2 }, 9, 0, '2026-11-01', C)).toBe(true);
    // The next day, the first launch of the day is not the first session any more.
    expect(interstitialAllowed(s, 12, 0, '2026-11-02', C)).toBe(true);
  });

  it('keep a delay between two ads, shorter as the days go by', () => {
    const s = { ...newAdState('2026-11-01'), launches: 5, lastAdAt: 1_000 * MIN };
    expect(interstitialAllowed(s, 30, 1_000 * MIN + 2.9 * MIN, '2026-11-01', C)).toBe(false);
    expect(interstitialAllowed(s, 30, 1_000 * MIN + 3 * MIN, '2026-11-01', C)).toBe(true);
    expect(interstitialAllowed(s, 30, 1_000 * MIN + 2 * MIN, '2026-11-02', C)).toBe(true);
    expect(interstitialAllowed(s, 30, 1_000 * MIN + 1.4 * MIN, '2026-11-05', C)).toBe(false);
    expect(interstitialAllowed(s, 30, 1_000 * MIN + 1.5 * MIN, '2026-11-05', C)).toBe(true);
    expect([0, 1, 3, 4, 30].map((d) => adInterval(d, C))).toEqual([180, 120, 120, 90, 90]);
  });

  it('never play once "no ads" is bought', () => {
    const s = { ...newAdState('2026-11-01'), launches: 9, noAds: true };
    expect(interstitialAllowed(s, 50, 0, '2026-12-01', C)).toBe(false);
  });

  it('suggest buying "no ads" after the 3rd interstitial, then every 6', () => {
    const s = newAdState('2026-11-01');
    expect(offerDue({ ...s, interstitials: 2 }, C)).toBe(false);
    expect(offerDue({ ...s, interstitials: 3 }, C)).toBe(true);
    expect(offerDue({ ...s, interstitials: 5, offerAt: 3 }, C)).toBe(false);
    expect(offerDue({ ...s, interstitials: 9, offerAt: 3 }, C)).toBe(true);
    expect(offerDue({ ...s, interstitials: 9, noAds: true }, C)).toBe(false);
  });

  it('count days between dates', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('', '2026-11-02')).toBe(0);
  });
});
