/** Static scenery, rendered once per resize / style change: sky gradient, bokeh, then the style's landscape. */
import { Rng } from '../core/rng';
import { P } from './palette';
import { currentTheme } from './themes';

export function renderBackground(width: number, height: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width * dpr));
  c.height = Math.max(1, Math.round(height * dpr));
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, P.bgTop);
  sky.addColorStop(0.55, P.bgMid);
  sky.addColorStop(1, P.bgBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const rng = new Rng('background');
  const big = Math.max(width, height);
  for (let k = 0; k < 9; k++) {
    const x = rng.float(0, width);
    const y = rng.float(0, height);
    const r = rng.float(0.12, 0.3) * big;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tint = rng.pick(P.bokeh);
    g.addColorStop(0, `rgba(${tint},0.32)`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  currentTheme().scenery(ctx, width, height);
  return c;
}
