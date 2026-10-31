/**
 * Monetization settings. Every value has a default here and can be changed
 * without republishing the app through Firebase Remote Config, under the same
 * key (snake_case). Remote Config also allows A/B tests on them.
 */

export interface MonetizeConfig {
  /** No interstitial before this level. */
  ad_min_level: number;
  /** No interstitial during the player's first session (the day of install, first launch). */
  ad_skip_first_session: boolean;
  /** Minimum seconds between two ads: at first, after `ad_mid_after_days`, after `ad_late_after_days`. */
  ad_interval_first: number;
  ad_interval_mid: number;
  ad_interval_late: number;
  ad_mid_after_days: number;
  ad_late_after_days: number;
  /** Hints, and zone hints, given by a rewarded video (0: no video for zone hints). */
  reward_hints: number;
  reward_zones: number;
  /** Hours a locked style can be tried after a video (0: no trial). */
  style_trial_hours: number;
  /** A video doubles the league's prize. */
  league_double: boolean;
  /** "No ads" offer: after this many interstitials, then again every `offer_every_ads`. */
  offer_after_ads: number;
  offer_every_ads: number;
}

export const DEFAULT_CONFIG: MonetizeConfig = {
  ad_min_level: 9,
  ad_skip_first_session: true,
  ad_interval_first: 180,
  ad_interval_mid: 120,
  ad_interval_late: 90,
  ad_mid_after_days: 1,
  ad_late_after_days: 4,
  reward_hints: 1,
  reward_zones: 0,
  style_trial_hours: 24,
  league_double: true,
  offer_after_ads: 3,
  offer_every_ads: 6,
};

/** Store products (ids set in the Play Console, mirrored in RevenueCat). */
export const PRODUCTS = {
  /** Removes interstitials for good; rewarded videos stay available. */
  noAds: 'no_ads',
  /** No ads and 30 hints: the anchor offer. */
  noAdsHints: 'no_ads_hints',
  hints10: 'hints_10',
  hints40: 'hints_40',
  zones5: 'zones_5',
} as const;

export type ProductId = (typeof PRODUCTS)[keyof typeof PRODUCTS];

/** What each product gives (the hints and zone hints are added to the save). */
export const PRODUCT_CONTENT: Record<ProductId, { noAds?: boolean; hints?: number; zones?: number }> = {
  no_ads: { noAds: true },
  no_ads_hints: { noAds: true, hints: 30 },
  hints_10: { hints: 10 },
  hints_40: { hints: 40 },
  zones_5: { zones: 5 },
};

/** RevenueCat entitlement that the no-ads products unlock. */
export const NO_ADS_ENTITLEMENT = 'no_ads';
