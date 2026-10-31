/**
 * The outside services behind monetization, each loaded on demand:
 * - ads: AdMob (rewarded videos and interstitials) and its consent form (Google UMP, for the GDPR);
 * - store: in-app purchases through RevenueCat (Play Billing underneath);
 * - analytics and remote settings: Firebase.
 *
 * In the Android app they are the real SDKs. On the web (and in development)
 * ads are the placeholder video of ui/ads.ts, there is no store, and events
 * only go to the console in development. Every call is safe: a missing SDK,
 * key or network only turns the feature off.
 */
import { Capacitor } from '@capacitor/core';
import { showRewardedAd as placeholderVideo } from '../ui/ads';
import { DEFAULT_CONFIG, NO_ADS_ENTITLEMENT, PRODUCTS, type MonetizeConfig, type ProductId } from './config';

const native = Capacitor.isNativePlatform();
const env = import.meta.env;

/** Ad units: Google's test units until real ones are set in .env (VITE_ADMOB_*). */
const AD_UNITS = {
  rewarded: (env.VITE_ADMOB_REWARDED as string | undefined) || 'ca-app-pub-3940256099942544/5224354917',
  interstitial: (env.VITE_ADMOB_INTERSTITIAL as string | undefined) || 'ca-app-pub-3940256099942544/1033173712',
};
/** Test ads unless real units are configured. */
const AD_TESTING = !env.VITE_ADMOB_REWARDED;

// ---------------------------------------------------------------- consent and ads

export interface Consent {
  /** Ads may be requested (consent given, or not needed where the player lives). */
  canRequestAds: boolean;
  /** The player must be able to change their choice from the settings (GDPR). */
  privacyOptions: boolean;
}

let admob: Promise<typeof import('@capacitor-community/admob')> | null = null;
const loadAdmob = () => (admob ??= import('@capacitor-community/admob'));

/**
 * Starts AdMob and asks for consent where the law requires it (the form is
 * set up in the AdMob console, "Privacy & messaging"). Call once at launch.
 */
export async function startAds(): Promise<Consent> {
  if (!native) return { canRequestAds: true, privacyOptions: false };
  try {
    const { AdMob, AdmobConsentStatus, RewardAdPluginEvents } = await loadAdmob();
    await AdMob.initialize({ initializeForTesting: AD_TESTING });
    void AdMob.addListener(RewardAdPluginEvents.adClicked, () => logEvent('ad_clicked', { type: 'rewarded' }));
    let info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) info = await AdMob.showConsentForm();
    return { canRequestAds: info.canRequestAds, privacyOptions: String(info.privacyOptionsRequirementStatus) === 'REQUIRED' };
  } catch {
    return { canRequestAds: false, privacyOptions: false };
  }
}

/** The consent form again, from the settings. */
export async function showPrivacyOptions(): Promise<void> {
  if (!native) return;
  try {
    const { AdMob } = await loadAdmob();
    await AdMob.showPrivacyOptionsForm();
  } catch {
    // Not available: nothing to change.
  }
}

/** Plays a rewarded video; true when the player earned the reward. */
export async function playRewarded(): Promise<boolean> {
  if (!native) return placeholderVideo();
  try {
    const { AdMob } = await loadAdmob();
    await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, isTesting: AD_TESTING });
    const reward = await AdMob.showRewardVideoAd();
    return !!reward;
  } catch {
    return false;
  }
}

let interstitialReady: Promise<boolean> | null = null;

/** Loads the next interstitial ahead of time, so it shows at once. */
export function prepareInterstitial() {
  if (!native || interstitialReady) return;
  interstitialReady = loadAdmob()
    .then(({ AdMob }) => AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: AD_TESTING }))
    .then(() => true)
    .catch(() => {
      interstitialReady = null;
      return false;
    });
}

/** Plays an interstitial if one is ready; true when it was shown. */
export async function playInterstitial(): Promise<boolean> {
  if (!native) return import.meta.env.DEV ? placeholderVideo(2000) : false;
  prepareInterstitial();
  const ready = await interstitialReady;
  interstitialReady = null;
  if (!ready) return false;
  try {
    const { AdMob } = await loadAdmob();
    await AdMob.showInterstitial();
    return true;
  } catch {
    return false;
  } finally {
    prepareInterstitial();
  }
}

// ---------------------------------------------------------------- store

export interface Product {
  id: ProductId;
  /** Price as the store shows it, in the player's currency ("3,99 €"). */
  price: string;
  priceValue: number;
  currency: string;
}

export type Purchase = { ok: true; product: Product } | { ok: false; cancelled: boolean };

type RC = typeof import('@revenuecat/purchases-capacitor');
let revenuecat: Promise<RC['Purchases'] | null> | null = null;

/** RevenueCat, configured once; null without the app or without a key (VITE_REVENUECAT_ANDROID_KEY). */
function store(): Promise<RC['Purchases'] | null> {
  const key = env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;
  if (!native || !key) return Promise.resolve(null);
  revenuecat ??= import('@revenuecat/purchases-capacitor')
    .then(async ({ Purchases }) => {
      await Purchases.configure({ apiKey: key });
      return Purchases;
    })
    .catch(() => null);
  return revenuecat;
}

const storeProducts = new Map<ProductId, { product: unknown; info: Product }>();

/** The products on sale, with their local prices (empty when the store is unavailable). */
export async function loadProducts(): Promise<Product[]> {
  const p = await store();
  if (!p) return [];
  try {
    const ids = Object.values(PRODUCTS);
    const { products } = await p.getProducts({ productIdentifiers: ids, type: 'NON_SUBSCRIPTION' as never });
    for (const sp of products) {
      const id = sp.identifier as ProductId;
      if (!ids.includes(id)) continue;
      storeProducts.set(id, { product: sp, info: { id, price: sp.priceString, priceValue: sp.price, currency: sp.currencyCode } });
    }
  } catch {
    return [];
  }
  return [...storeProducts.values()].map((x) => x.info);
}

export async function buy(id: ProductId): Promise<Purchase> {
  const p = await store();
  const entry = storeProducts.get(id);
  if (!p || !entry) return { ok: false, cancelled: false };
  try {
    await p.purchaseStoreProduct({ product: entry.product as never });
    return { ok: true, product: entry.info };
  } catch (e) {
    const cancelled = !!(e as { userCancelled?: boolean; code?: string })?.userCancelled || (e as { code?: string })?.code === '1';
    return { ok: false, cancelled };
  }
}

/** True when the player owns "no ads" (bought earlier, on this device or another one with the same account). */
export async function ownsNoAds(restore = false): Promise<boolean> {
  const p = await store();
  if (!p) return false;
  try {
    const { customerInfo } = restore ? await p.restorePurchases() : await p.getCustomerInfo();
    return !!customerInfo.entitlements.active[NO_ADS_ENTITLEMENT];
  } catch {
    return false;
  }
}

export function storeAvailable(): boolean {
  return native && !!env.VITE_REVENUECAT_ANDROID_KEY;
}

// ---------------------------------------------------------------- analytics and remote settings

type Params = Record<string, string | number | boolean>;

let analytics: Promise<typeof import('@capacitor-firebase/analytics')['FirebaseAnalytics'] | null> | null = null;
const loadAnalytics = () =>
  (analytics ??= native
    ? import('@capacitor-firebase/analytics').then((m) => m.FirebaseAnalytics).catch(() => null)
    : Promise.resolve(null));

/** Turns event collection on or off (the player's choice in the settings). Ads data is never shared. */
export async function setAnalyticsEnabled(enabled: boolean) {
  const a = await loadAnalytics();
  if (!a) return;
  try {
    await a.setEnabled({ enabled });
    const { ConsentType, ConsentStatus } = await import('@capacitor-firebase/analytics');
    await a.setConsent({ type: ConsentType.AnalyticsStorage, status: enabled ? ConsentStatus.Granted : ConsentStatus.Denied });
    for (const type of [ConsentType.AdStorage, ConsentType.AdUserData, ConsentType.AdPersonalization]) {
      await a.setConsent({ type, status: ConsentStatus.Denied });
    }
  } catch {
    // Firebase not set up (no google-services.json): no analytics.
  }
}

/** One event (Firebase limits: 40-character names, 25 parameters, 100-character strings). */
export function logEvent(name: string, params: Params = {}) {
  if (import.meta.env.DEV) console.debug('[analytics]', name, params);
  void loadAnalytics().then((a) => a?.logEvent({ name, params }).catch(() => undefined));
}

/** Remote settings fetched at launch; the defaults when offline or without Firebase. */
export async function fetchConfig(): Promise<MonetizeConfig> {
  const config = { ...DEFAULT_CONFIG };
  if (!native) return config;
  try {
    const { FirebaseRemoteConfig, GetValueSource } = await import('@capacitor-firebase/remote-config');
    await FirebaseRemoteConfig.setMinimumFetchInterval({ minimumFetchIntervalInSeconds: 3600 });
    await FirebaseRemoteConfig.fetchAndActivate();
    for (const key of Object.keys(config) as Array<keyof MonetizeConfig>) {
      const { value, source } = typeof config[key] === 'boolean'
        ? await FirebaseRemoteConfig.getBoolean({ key })
        : await FirebaseRemoteConfig.getNumber({ key });
      // A key missing from Remote Config keeps its default here.
      if (source === GetValueSource.Remote) (config as Record<string, unknown>)[key] = value;
    }
  } catch {
    // Offline or no Firebase: the defaults.
  }
  return config;
}
