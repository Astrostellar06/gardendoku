/**
 * Monetization as the game sees it: rewarded videos, interstitials between
 * levels, purchases, and the analytics events. The rules live in adPolicy.ts,
 * the settings in config.ts (Remote Config), the SDKs in services.ts.
 */
import { dayKey } from '../core/daily';
import { interstitialAllowed, offerDue, type AdState } from './adPolicy';
import { DEFAULT_CONFIG, PRODUCT_CONTENT, type MonetizeConfig, type ProductId } from './config';
import * as services from './services';

export { PRODUCTS, type ProductId } from './config';
export type { Product } from './services';

/** Where a rewarded video was offered (analytics). */
export type RewardedPlacement = 'hints' | 'zones' | 'skip' | 'style_trial' | 'league_double';

/** What the game hands over: its ad state (saved) and how to give out what was bought. */
export interface MonetizeHost {
  ads: AdState;
  grant(content: { hints?: number; zones?: number }): void;
  save(): void;
}

export class Monetization {
  config: MonetizeConfig = { ...DEFAULT_CONFIG };
  /** Privacy choices must be reachable from the settings (GDPR region). */
  privacyOptions = false;
  private canRequestAds = false;

  constructor(private host: MonetizeHost) {}

  /** At launch: consent form where required, remote settings, and purchases made on another device. */
  async start(analyticsEnabled: boolean) {
    const ads = this.host.ads;
    ads.launches++;
    this.host.save();
    void services.setAnalyticsEnabled(analyticsEnabled);
    const [consent, config] = await Promise.all([services.startAds(), services.fetchConfig()]);
    this.canRequestAds = consent.canRequestAds;
    this.privacyOptions = consent.privacyOptions;
    this.config = config;
    if (this.canRequestAds && !ads.noAds) services.prepareInterstitial();
    if (!ads.noAds && (await services.ownsNoAds())) this.setNoAds();
  }

  get noAds(): boolean {
    return this.host.ads.noAds;
  }

  /** A rewarded video: true once watched to the end. It restarts the delay before the next interstitial. */
  async rewarded(placement: RewardedPlacement): Promise<boolean> {
    services.logEvent('ad_shown', { type: 'rewarded', placement });
    const done = await services.playRewarded();
    if (done) {
      this.host.ads.lastAdAt = Date.now();
      this.host.save();
      services.logEvent('rewarded_completed', { placement });
    }
    return done;
  }

  /**
   * The player taps "next level" after solving `level`: an interstitial plays
   * if the rules allow it. Resolves once it is over; true when the "no ads"
   * offer should be suggested now.
   */
  async betweenLevels(level: number): Promise<boolean> {
    const ads = this.host.ads;
    if (!this.canRequestAds || !interstitialAllowed(ads, level, Date.now(), dayKey(), this.config)) return false;
    const shown = await services.playInterstitial();
    if (!shown) return false;
    services.logEvent('ad_shown', { type: 'interstitial', placement: 'next_level', level });
    ads.lastAdAt = Date.now();
    ads.interstitials++;
    const offer = offerDue(ads, this.config);
    if (offer) ads.offerAt = ads.interstitials;
    this.host.save();
    return offer;
  }

  storeAvailable(): boolean {
    return services.storeAvailable();
  }

  loadProducts() {
    return services.loadProducts();
  }

  /** Buys a product and hands over what it holds; false if it did not go through. */
  async buy(id: ProductId): Promise<{ ok: boolean; cancelled: boolean }> {
    const result = await services.buy(id);
    if (!result.ok) return { ok: false, cancelled: result.cancelled };
    const content = PRODUCT_CONTENT[id];
    if (content.noAds) this.setNoAds();
    if (content.hints || content.zones) this.host.grant({ hints: content.hints, zones: content.zones });
    services.logEvent('iap_purchase', { product: id, value: result.product.priceValue, currency: result.product.currency });
    this.host.save();
    return { ok: true, cancelled: false };
  }

  /** "Restore purchases": true when "no ads" was found. */
  async restore(): Promise<boolean> {
    const owned = await services.ownsNoAds(true);
    if (owned) this.setNoAds();
    return owned;
  }

  showPrivacyOptions() {
    return services.showPrivacyOptions();
  }

  setAnalyticsEnabled(enabled: boolean) {
    void services.setAnalyticsEnabled(enabled);
  }

  private setNoAds() {
    this.host.ads.noAds = true;
    this.host.save();
  }
}

/** Analytics events of the game (names and parameters as listed in docs/monetization.md). */
export const track = services.logEvent;
