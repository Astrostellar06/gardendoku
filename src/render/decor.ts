/**
 * Per-tile decoration (grass patches, tufts, flowers, pebbles), generated
 * deterministically in the tile's own frame so it rotates with the tile and
 * stays clear of the canals.
 */
import { DX, DY, popcount4 } from '../core/grid';
import { Rng } from '../core/rng';
import { P } from './palette';

/** Tile geometry in unit coordinates (a cell spans -0.5..0.5). */
export const G = {
  /** Half size of the tile's top face. */
  half: 0.445,
  /** Height of the tile's side: the face sits depth/2 above the cell centre. */
  depth: 0.085,
  corner: 0.15,
  rimW: 0.36,
  grooveW: 0.24,
  waterW: 0.16,
  basinR: 0.17,
  pondR: 0.3,
} as const;

export interface Blob {
  x: number;
  y: number;
  r: number;
  delay: number;
  span: number;
}

export interface Flower {
  x: number;
  y: number;
  r: number;
  petals: number;
  color: string;
  center: string;
  rot: number;
  delay: number;
}

export interface Tuft {
  x: number;
  y: number;
  s: number;
  rot: number;
  delay: number;
}

export interface Pebble {
  x: number;
  y: number;
  r: number;
  rot: number;
}

export interface Decor {
  blobs: Blob[];
  flowers: Flower[];
  tufts: Tuft[];
  pebbles: Pebble[];
  bloomColor: string;
  bloomPetals: number;
  padAngle: number;
  /** Small per-tile tint variation (-1..1). */
  tint: number;
}

/** Distance from (x, y) to the closest canal centre line of `mask`. */
function canalDistance(mask: number, x: number, y: number): number {
  let best = Math.hypot(x, y);
  for (let d = 0; d < 4; d++) {
    if (!(mask & (1 << d))) continue;
    const ex = DX[d] * 0.5;
    const ey = DY[d] * 0.5;
    // Project onto the segment (0,0) -> (ex, ey).
    const t = Math.max(0, Math.min(1, (x * ex + y * ey) / 0.25));
    best = Math.min(best, Math.hypot(x - ex * t, y - ey * t));
  }
  return best;
}

export function makeDecor(mask: number, seed: string, isSource: boolean): Decor {
  const rng = new Rng(seed);
  const arms = popcount4(mask);
  const hubClear = isSource ? G.pondR + 0.07 : arms === 1 ? G.basinR + 0.1 : G.rimW / 2 + 0.04;
  const canalClear = G.rimW / 2 + 0.035;

  const clearOf = (x: number, y: number, r: number): boolean => {
    if (Math.abs(x) > G.half - r - 0.02 || Math.abs(y) > G.half - r - 0.02) return false;
    if (Math.hypot(x, y) < hubClear + r * 0.7) return false;
    return canalDistance(mask, x, y) >= canalClear + r * 0.7;
  };

  // Grass grows from the canal outwards with a few organic patches.
  const blobs: Blob[] = [{ x: 0, y: 0, r: 0.8, delay: 0, span: 0.75 }];
  for (let k = 0; k < 5; k++) {
    blobs.push({
      x: rng.float(-0.35, 0.35),
      y: rng.float(-0.35, 0.35),
      r: rng.float(0.16, 0.3),
      delay: rng.float(0.05, 0.35),
      span: rng.float(0.25, 0.4),
    });
  }

  const flowers: Flower[] = [];
  const wanted = isSource ? rng.range(1, 2) : arms >= 3 ? rng.range(1, 3) : rng.range(2, 4);
  for (let attempt = 0; attempt < 60 && flowers.length < wanted; attempt++) {
    const r = rng.float(0.055, 0.085);
    const x = rng.float(-0.45, 0.45);
    const y = rng.float(-0.45, 0.45);
    if (!clearOf(x, y, r)) continue;
    if (flowers.some((f) => Math.hypot(f.x - x, f.y - y) < f.r + r + 0.03)) continue;
    flowers.push({
      x,
      y,
      r,
      petals: rng.chance(0.7) ? 5 : 6,
      color: rng.pick(P.petals),
      center: rng.pick(P.centers),
      rot: rng.float(0, Math.PI * 2),
      delay: rng.float(0.35, 0.7),
    });
  }

  const tufts: Tuft[] = [];
  const tuftCount = rng.range(3, 6);
  for (let attempt = 0; attempt < 60 && tufts.length < tuftCount; attempt++) {
    const s = rng.float(0.05, 0.08);
    const x = rng.float(-0.45, 0.45);
    const y = rng.float(-0.45, 0.45);
    if (!clearOf(x, y, s * 0.6)) continue;
    if (flowers.some((f) => Math.hypot(f.x - x, f.y - y) < f.r + s * 0.6)) continue;
    tufts.push({ x, y, s, rot: rng.float(-0.35, 0.35), delay: rng.float(0.2, 0.55) });
  }

  const pebbles: Pebble[] = [];
  const pebbleCount = rng.range(2, 5);
  for (let attempt = 0; attempt < 40 && pebbles.length < pebbleCount; attempt++) {
    const r = rng.float(0.018, 0.034);
    const x = rng.float(-0.44, 0.44);
    const y = rng.float(-0.44, 0.44);
    if (!clearOf(x, y, r)) continue;
    pebbles.push({ x, y, r, rot: rng.float(0, Math.PI) });
  }

  return {
    blobs,
    flowers,
    tufts,
    pebbles,
    bloomColor: rng.pick(P.lotus),
    bloomPetals: rng.chance(0.5) ? 8 : 6,
    padAngle: rng.float(0, Math.PI * 2),
    tint: rng.float(-1, 1),
  };
}
