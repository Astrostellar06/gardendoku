/** Small rendered sample of a garden style, for the style menu. */
import { DX, DY, E, N, S, W } from '../core/grid';
import { G, makeDecor } from './decor';
import { P } from './palette';
import { withTheme } from './themes';
import type { ThemeId } from './themes/types';
import { drawTile, drawTileProps, drawTileWater, roundRectPath } from './tileArt';

/** A tiny 2x2 watered network: corner, end, corner, end. */
const SAMPLE: Array<{ x: number; y: number; mask: number; inflow: number }> = [
  { x: 0, y: 0, mask: E | S, inflow: -1 },
  { x: 1, y: 0, mask: W, inflow: 3 },
  { x: 0, y: 1, mask: N | E, inflow: 0 },
  { x: 1, y: 1, mask: W, inflow: 3 },
];

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
      ctx.fillStyle = P.grassSideDark;
      ctx.fill();
      ctx.restore();
      const decor = makeDecor(tile.mask, `preview:${k}`, false, k === 1 ? 0 : 1);
      const st = { mask: tile.mask, decor, isSource: false, bloom: 1, water: 1, inflow: tile.inflow, loop: 0, rot: 0 };
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
      const st = { mask: tile.mask, decor, isSource: false, bloom: 1, water: 1, inflow: tile.inflow, loop: 0, rot: 0 };
      ctx.save();
      ctx.translate(cx, cy - (G.depth * t) / 2);
      ctx.scale(t, t);
      drawTileProps(ctx, st);
      ctx.restore();
    });
    // Join the canals across the gaps.
    for (const [a, d] of [
      [0, 1],
      [0, 2],
      [2, 1],
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
