/**
 * Infinite level progression. A level is fully described by its index:
 * size, shape and generator settings are derived from a per-level seed,
 * then the garden itself is generated from that seed.
 *
 * Every fifth level is a "hard" one: a square or rectangular garden whose
 * opposite edges are joined (water leaving one side comes back on the other).
 */
import { generate, Puzzle } from './generator';
import { Rng } from './rng';
import { buildShape, heartHeight, ShapeId, SHAPE_NAMES } from './shapes';

export interface LevelInfo {
  index: number;
  width: number;
  height: number;
  shape: ShapeId;
  shapeName: string;
  windiness: number;
  seed: string;
  /** Number of tiles in the garden. */
  cells: number;
  /** Hard level: opposite edges are joined (torus). */
  wrap: boolean;
  /** Share of tiles that need hypothesis reasoning (0: plain deductions are enough). */
  advanced: number;
}

/**
 * Bump whenever generation changes: saved games from another version are not
 * restored (they would land on a different garden).
 */
export const GENERATOR_VERSION = 4;

/** From these levels on, gardens require hypothesis reasoning on part of the tiles. */
export const ADVANCED_FROM = 21;
export const ADVANCED_HARD_FROM = 50;

function advancedShare(index: number, wrap: boolean): number {
  if (wrap) return index >= ADVANCED_HARD_FROM ? 0.05 : 0;
  if (index < ADVANCED_FROM) return 0;
  const t = Math.min(1, (index - ADVANCED_FROM) / (80 - ADVANCED_FROM));
  return 0.06 + t * 0.06;
}

/** Hard levels come back every HARD_EVERY levels. */
export const HARD_EVERY = 5;

export function isHardLevel(index: number): boolean {
  return index % HARD_EVERY === 0;
}

/** Candidate sizes [w, h] of the hard levels' gardens, square or portrait. */
const WRAP_SIZES: Array<{ upTo: number; sizes: Array<[number, number]> }> = [
  { upTo: 10, sizes: [[5, 5], [5, 6]] },
  { upTo: 25, sizes: [[5, 7], [6, 6], [6, 7]] },
  { upTo: 50, sizes: [[6, 8], [7, 7], [7, 8]] },
  { upTo: Infinity, sizes: [[7, 9], [8, 8], [8, 10]] },
];

interface Band {
  upTo: number;
  /** Candidate rectangle sizes [w, h]; the active-cell target for shapes derives from them. */
  sizes: Array<[number, number]>;
  shapeChance: number;
}

const BANDS: Band[] = [
  { upTo: 2, sizes: [[5, 5]], shapeChance: 0 },
  { upTo: 6, sizes: [[5, 5], [5, 6], [6, 6]], shapeChance: 0 },
  { upTo: 12, sizes: [[6, 6], [6, 7], [7, 7]], shapeChance: 0.3 },
  { upTo: 20, sizes: [[6, 8], [7, 8], [7, 7]], shapeChance: 0.4 },
  { upTo: 32, sizes: [[7, 9], [8, 8], [8, 9]], shapeChance: 0.45 },
  { upTo: 48, sizes: [[8, 10], [8, 9], [9, 9]], shapeChance: 0.5 },
  { upTo: 70, sizes: [[8, 11], [9, 10], [9, 11]], shapeChance: 0.5 },
  { upTo: Infinity, sizes: [[8, 12], [9, 11], [9, 12]], shapeChance: 0.5 },
];

/** Hand-picked shapes so players meet every one of them early on. */
const FIXED_SHAPES: Record<number, ShapeId> = {
  9: 'heart',
  12: 'flower',
  14: 'circle',
  17: 'ponds',
  22: 'cloister',
  27: 'diamond',
  33: 'hourglass',
  44: 'heart',
};

const SHAPES: ShapeId[] = ['circle', 'cloister', 'diamond', 'plus', 'heart', 'flower', 'hourglass', 'ponds'];

/** How many rows taller than wide a shape may get before it looks stretched. */
const MAX_EXTRA_ROWS: Record<ShapeId, number> = {
  rect: 6,
  ponds: 6,
  cloister: 4,
  circle: 2,
  diamond: 6,
  plus: 6,
  heart: 2,
  flower: 2,
  hourglass: 6,
};

/**
 * Pick an odd box whose shape holds roughly `target` cells. Boxes stay at
 * most 9 columns wide (phones in portrait) and grow in height instead, as far
 * as the shape still looks right.
 */
function fitShape(shape: ShapeId, target: number, rng: Rng): [number, number, number] {
  let best: [number, number, number] = [5, 5, 0];
  let bestScore = Infinity;
  if (shape === 'heart') {
    // A heart has one natural height per width (5x5, 7x6, 9x8).
    for (const w of [5, 7, 9]) {
      const h = heartHeight(w);
      const count = buildShape('heart', w, h).reduce((a, b) => a + b, 0);
      if (Math.abs(count - target) < bestScore) {
        bestScore = Math.abs(count - target);
        best = [w, h, count];
      }
    }
    return best;
  }
  for (let w = 5; w <= 9; w += 2) {
    for (let h = w; h <= w + MAX_EXTRA_ROWS[shape] && h <= 15; h += 2) {
      const count = buildShape(shape, w, h, rng.fork('probe')).reduce((a, b) => a + b, 0);
      const score = Math.abs(count - target) + (h - w) * 0.6;
      if (score < bestScore) {
        bestScore = score;
        best = [w, h, count];
      }
    }
  }
  return best;
}

export function levelInfo(index: number): LevelInfo {
  const seed = `jardin-${index}`;
  const rng = new Rng(seed + ':params');
  if (isHardLevel(index)) {
    const [width, height] = rng.pick(WRAP_SIZES.find((b) => index <= b.upTo)!.sizes);
    return {
      index,
      width,
      height,
      shape: 'rect',
      shapeName: 'Bords reliés',
      windiness: rng.float(0.3, 0.8),
      seed,
      cells: width * height,
      wrap: true,
      advanced: advancedShare(index, true),
    };
  }
  const band = BANDS.find((b) => index <= b.upTo)!;
  const [bw, bh] = rng.pick(band.sizes);
  const windiness = rng.float(0.25, 0.85);

  let shape: ShapeId = 'rect';
  let width = bw;
  let height = bh;
  const roll = rng.chance(band.shapeChance);
  // Hearts top out at 46 tiles (9x8): keep them for gardens not much bigger.
  const pool = bw * bh > 80 ? SHAPES.filter((s) => s !== 'heart') : SHAPES;
  const picked = rng.pick(pool);
  if (FIXED_SHAPES[index] || roll) {
    shape = FIXED_SHAPES[index] ?? picked;
    if (shape === 'ponds') {
      // Ponds keep the rectangle, they just dig a few holes in it.
      width = bw;
      height = bh;
    } else {
      [width, height] = fitShape(shape, bw * bh, rng.fork('fit'));
    }
  }
  const cells = buildShape(shape, width, height, new Rng(seed).fork('shape')).reduce((a, b) => a + b, 0);
  return { index, width, height, shape, shapeName: SHAPE_NAMES[shape], windiness, seed, cells, wrap: false, advanced: advancedShare(index, false) };
}

const cache = new Map<number, Puzzle>();

export function buildLevel(index: number): Puzzle {
  const hit = cache.get(index);
  if (hit) return hit;
  const info = levelInfo(index);
  const puzzle = generate({
    width: info.width,
    height: info.height,
    shape: info.shape,
    seed: info.seed,
    windiness: info.windiness,
    wrap: info.wrap,
    advanced: info.advanced,
  });
  cache.set(index, puzzle);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return puzzle;
}
