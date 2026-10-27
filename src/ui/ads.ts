/**
 * Rewarded video ads.
 *
 * PLACEHOLDER: no ad network is wired yet. This shows a fake "ad" for a few
 * seconds and always rewards the player. To ship, replace the body of
 * showRewardedAd with a real SDK call (e.g. AdMob through a Capacitor plugin)
 * and resolve true only when the network reports the reward as earned.
 */

import { t } from '../i18n';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

export function showRewardedAd(durationMs = 3000): Promise<boolean> {
  const overlay = $('ad');
  const bar = $('ad-progress');
  const close = $('ad-close') as HTMLButtonElement;
  overlay.classList.remove('hidden', 'closing');
  close.disabled = true;
  close.textContent = t('ad.wait');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  void bar.offsetWidth;
  bar.style.transition = `width ${durationMs}ms linear`;
  bar.style.width = '100%';
  return new Promise((resolve) => {
    window.setTimeout(() => {
      close.disabled = false;
      close.textContent = t('ad.claim');
      close.onclick = () => {
        close.onclick = null;
        overlay.classList.add('closing');
        window.setTimeout(() => {
          overlay.classList.remove('closing');
          overlay.classList.add('hidden');
        }, 260);
        resolve(true);
      };
    }, durationMs);
  });
}
