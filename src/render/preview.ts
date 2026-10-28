/** Small rendered sample of a garden style, for the style menu. */
import { DX, DY, E, N, S, W } from '../core/grid';
import { G, makeDecor } from './decor';
import { P } from './palette';
import { withTheme } from './themes';
import type { ThemeId } from './themes/types';
import { drawTile, drawTileProps, drawTileWater, roundRectPath } from './tileArt';

/** A tiny 2x2 watered network: corner, end, corner, end. */
/** Three watered tiles, and one turned away (bottom right) to show a dry one. */
const SAMPLE: Array<{ x: number; y: number; mask: number; inflow: number; dry?: boolean }> = [
  { x: 0, y: 0, mask: E | S, inflow: -1 },
  { x: 1, y: 0, mask: W, inflow: 3 },
  { x: 0, y: 1, mask: N | E, inflow: 0 },
  { x: 1, y: 1, mask: N, inflow: -1, dry: true },
];

/** The "random" style: four unlocked styles side by side, with a die on top. */
export function renderRandomPreview(
  ids: ThemeId[],
  size: number,
  dpr: number,
  tile: (id: ThemeId, size: number, dpr: number, ready?: () => void) => HTMLCanvasElement = renderThemePreview,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  // Painted again as each quarter's own preview becomes ready.
  const paint = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    tiles.forEach((t, k) => ctx.drawImage(t, (k % 2) * half * dpr, Math.floor(k / 2) * half * dpr, half * dpr, half * dpr));
    ctx.scale(dpr, dpr);
    drawDie(ctx, size);
  };
  const tiles: HTMLCanvasElement[] = [];
  for (let k = 0; k < 4; k++) tiles.push(tile(ids[k % ids.length], half, dpr, () => tiles.length === 4 && paint()));
  paint();
  return c;
}

/** The die on top of the "random" preview. */
function drawDie(ctx: CanvasRenderingContext2D, size: number) {
  const d = size * 0.36;
  const x = (size - d) / 2;
  const y = (size - d) / 2;
  ctx.shadowColor = 'rgba(120, 70, 110, 0.35)';
  ctx.shadowBlur = 8;
  roundRectPath(ctx, x, y, d, d, d * 0.22);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#F06C9C';
  for (const [px, py] of [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.5, 0.5],
    [0.27, 0.73],
    [0.73, 0.73],
  ]) {
    ctx.beginPath();
    ctx.arc(x + px * d, y + py * d, d * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderThemePreview(id: ThemeId, size: number, dpr: number): HTMLCanvasElement {
  return withTheme(id, () => {
    const c = document.createElement('canvas');
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, P.bgTop);
    sky.addColorStop(1, P.bgBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    const t = size / 2.25;
    const ox = (size - t * 2) / 2;
    const oy = (size - t * 2) / 2 - t * 0.03;
    const center = (x: number, y: number): [number, number] => [ox + (x + 0.5) * t, oy + (y + 0.5) * t];
    SAMPLE.forEach((tile, k) => {
      const [cx, cy] = center(tile.x, tile.y);
      const depth = G.depth * t;
      ctx.save();
      ctx.translate(cx, cy + depth / 2);
      ctx.scale(t, t);
      roundRectPath(ctx, -G.half, -G.half, G.half * 2, G.half * 2, G.corner);
      ctx.fillStyle = tile.dry ? P.soilSideDark : P.grassSideDark;
      ctx.fill();
      ctx.restore();
      const decor = makeDecor(tile.mask, `preview:${k}`, false, k === 1 ? 0 : 1);
      const wet = tile.dry ? 0 : 1;
      const st = { mask: tile.mask, decor, isSource: false, bloom: wet, water: wet, inflow: tile.inflow, loop: 0, rot: 0, sides: 4 };
      ctx.save();
      ctx.translate(cx, cy - depth / 2);
      ctx.scale(t, t);
      drawTile(ctx, st);
      drawTileWater(ctx, st, 0.6);
      ctx.restore();
    });
    // Props go on top of everything (they may rise above their tile).
    SAMPLE.forEach((tile, k) => {
      const [cx, cy] = center(tile.x, tile.y);
      const decor = makeDecor(tile.mask, 'preview:' + k, false, k === 1 ? 0 : 1);
      const wet = tile.dry ? 0 : 1;
      const st = { mask: tile.mask, decor, isSource: false, bloom: wet, water: wet, inflow: tile.inflow, loop: 0, rot: 0, sides: 4 };
      ctx.save();
      ctx.translate(cx, cy - (G.depth * t) / 2);
      ctx.scale(t, t);
      drawTileProps(ctx, st);
      ctx.restore();
    });
    // Join the canals across the gaps (none toward the dry tile, turned away).
    for (const [a, d] of [
      [0, 1],
      [0, 2],
    ] as const) {
      const [cx, cy] = center(SAMPLE[a].x, SAMPLE[a].y);
      const fx = cx + DX[d] * G.half * t;
      const fy = cy - (G.depth * t) / 2 + DY[d] * G.half * t;
      const len = t * (1 - G.half * 2) + 2;
      for (const [w, color] of [
        [G.rimW, P.rim],
        [G.waterW, P.waterDeep],
        [G.waterW - 0.045, P.water],
      ] as const) {
        ctx.fillStyle = color;
        if (d === 1) ctx.fillRect(fx - 1, fy - (w * t) / 2, len, w * t);
        else ctx.fillRect(fx - (w * t) / 2, fy - 1, w * t, len);
      }
    }
    return c;
  });
}
