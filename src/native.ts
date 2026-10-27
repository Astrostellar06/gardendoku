/**
 * Native app (Capacitor, iOS / Android): haptics, share sheet, back button,
 * status bar, and saving when the app goes to the background. In a browser,
 * everything falls back to the web APIs.
 */
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

export const isNativeApp = Capacitor.isNativePlatform();

/** Short buzz (a number, in ms) or a celebration pattern (an array). */
export function vibrate(pattern: number | number[]) {
  if (!isNativeApp) {
    navigator.vibrate?.(pattern);
    return;
  }
  if (!Array.isArray(pattern)) {
    // iOS has no vibration API in its web view: use the Taptic Engine instead.
    Haptics.impact({ style: pattern <= 8 ? ImpactStyle.Light : ImpactStyle.Medium }).catch(() => undefined);
    return;
  }
  // A pattern (on, off, on... in ms): each pulse in turn, a real buzz on
  // Android, a strong tap on iOS (where vibrate() ignores the duration).
  const android = Capacitor.getPlatform() === 'android';
  let at = 0;
  pattern.forEach((ms, k) => {
    if (k % 2 === 0) {
      setTimeout(() => {
        const done = android ? Haptics.vibrate({ duration: ms }) : Haptics.impact({ style: ImpactStyle.Heavy });
        done.catch(() => undefined);
      }, at);
    }
    at += ms;
  });
}

/** Celebration when a garden is won. */
export const WIN_BUZZ = [40, 70, 40, 70, 90];

/** System share sheet in the app; false when the player closed it. */
export async function nativeShare(text: string): Promise<boolean> {
  try {
    await Share.share({ text });
    return true;
  } catch {
    return false;
  }
}

export interface NativeHost {
  /** Back button: close what is open; false when there is nothing left (home screen). */
  back(): boolean;
  /** Save now: the app may be killed while in the background. */
  persist(): void;
  /** An invitation link was opened: gardendoku://ami/CODE. */
  friendLink(code: string): void;
}

export function setupNativeApp(host: NativeHost) {
  if (!isNativeApp) return;
  // Dark icons: the garden's background is always light, even in dark mode.
  SystemBars.setStyle({ style: SystemBarsStyle.Light }).catch(() => undefined);
  App.addListener('pause', () => host.persist());
  App.addListener('appUrlOpen', ({ url }) => {
    const code = /^gardendoku:\/\/ami\/([A-Za-z0-9]{6})/.exec(url)?.[1];
    if (code) host.friendLink(code);
  });
  // Android: from the home screen, back sends the app to the background (it keeps its state).
  App.addListener('backButton', () => {
    if (!host.back()) App.minimizeApp();
  });
}
