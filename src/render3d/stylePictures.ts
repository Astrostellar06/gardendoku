/**
 * Style menu previews in 3D, as pictures saved in public/previews/: the menu
 * opens at once, without building 18 small gardens. They are made from the
 * live previews (Garden3D.stylePreview) by `__game.savePreviews()` in the
 * console of the dev build; do it again whenever the 3D look changes.
 */
import { P } from '../render/palette';
import { THEMES, withTheme } from '../render/themes';
import type { ThemeId } from '../render/themes/types';
import { Garden3D } from './garden3d';

/** Size of the saved pictures, in pixels (the menu shows them 112 px wide, up to 3 pixels a point). */
const PICTURE = 336;

const pictures = new Map<ThemeId, Promise<HTMLImageElement | null>>();

function load(id: ThemeId): Promise<HTMLImageElement | null> {
  let p = pictures.get(id);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `previews/${id}.webp`;
    });
    pictures.set(id, p);
  }
  return p;
}

/** A style's preview: its saved picture, or the live 3D preview when there is none. */
export function stylePicture(id: ThemeId, size: number, dpr: number, ready?: () => void): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.round(size * dpr);
  out.height = Math.round(size * dpr);
  const ctx = out.getContext('2d')!;
  // The style's sky until the picture is in (a moment, the first time).
  withTheme(id, () => {
    const sky = ctx.createLinearGradient(0, 0, 0, out.height);
    sky.addColorStop(0, P.bgTop);
    sky.addColorStop(1, P.bgBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, out.width, out.height);
  });
  void load(id).then((img) => {
    if (img) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, out.width, out.height);
      ready?.();
      return;
    }
    const live = Garden3D.stylePreview(id, size, dpr, () => {
      ctx.drawImage(live, 0, 0, out.width, out.height);
      ready?.();
    });
  });
  return out;
}

/** Development aid: renders every style's live preview and saves it to public/previews/. */
export async function savePreviews(): Promise<string[]> {
  const saved: string[] = [];
  for (const theme of THEMES) {
    const canvas = await new Promise<HTMLCanvasElement>((resolve) => {
      // The 3D canvas goes up to 2 pixels a point: draw it twice as large instead.
      const c = Garden3D.stylePreview(theme.id, PICTURE / 2, 2, () => resolve(c));
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob) continue;
    const res = await fetch(`/__save?path=public/previews/${theme.id}.webp`, { method: 'POST', body: blob });
    if (res.ok) saved.push(theme.id);
  }
  return saved;
}
