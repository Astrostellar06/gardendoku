/** Static pastel scenery, rendered once per resize: sky gradient, bokeh, clouds and hills. */
import { Rng } from '../core/rng';
import { P } from './palette';

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
  const tints = ['255,160,196', '255,214,110', '140,200,255', '150,226,170', '196,168,250'];
  const big = Math.max(width, height);
  for (let k = 0; k < 9; k++) {
    const x = rng.float(0, width);
    const y = rng.float(0, height);
    const r = rng.float(0.12, 0.3) * big;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tint = rng.pick(tints);
    g.addColorStop(0, `rgba(${tint},0.32)`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Soft clouds near the top.
  const cloud = (cx: number, cy: number, s: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, 22 * s, 0, Math.PI * 2);
    ctx.arc(cx + 26 * s, cy - 10 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(cx + 56 * s, cy, 20 * s, 0, Math.PI * 2);
    ctx.rect(cx, cy, 56 * s, 20 * s);
    ctx.fill();
  };
  cloud(width * 0.08, height * 0.07, 0.7);
  cloud(width * 0.7, height * 0.04, 0.55);

  // Rolling hills at the bottom.
  const hill = (base: number, amp: number, color: string, phase: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 8) {
      const y = base + Math.sin(x / width * Math.PI * 1.6 + phase) * amp + Math.sin(x / 60 + phase) * amp * 0.15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  };
  hill(height * 0.9, 16, 'rgba(172, 230, 176, 0.85)', 0.4);
  hill(height * 0.95, 12, 'rgba(136, 212, 146, 0.9)', 2.2);
  return c;
}
