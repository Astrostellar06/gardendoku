/**
 * Infinite level progression. A level is fully described by its index:
 * size, shape and generator settings are derived from a per-level seed,
 * then the garden itself is generated from that seed.
 *
 * Every fifth level is a "hard" one: a square or rectangular garden whose
 * opposite edges are joined (water leaving one side comes back on the other).
 * About one normal level in five is hexagonal: tiles with six sides.
 */
import { generate, Puzzle } from './generator';
import { Rng } from './rng';
import { buildShape, heartHeight, ShapeId } from './shapes';

export interface LevelInfo {
  index: number;
  width: number;
  height: number;
  /** Shape of the garden (its display name is translated by the HUD). */
  shape: ShapeId;
  windiness: number;
  seed: string;
  /** Number of tiles in the garden. */
  cells: number;
  /** Hard level: opposite edges are joined (torus). */
  wrap: boolean;
  /** Share of tiles that need hypothesis reasoning (0: plain deductions are enough). */
  advanced: number;
  /** Hexagonal tiles. */
  hex: boolean;
}

/**
 * Bump whenever generation changes: saved games from another version are not
 * restored (they would land on a different garden).
 */
export const GENERATOR_VERSION = 8;

/** From these levels on, gardens require hypothesis reasoning on part of the tiles. */
export const ADVANCED_FROM = 21;
export const ADVANCED_HARD_FROM = 50;

/** Hexagonal gardens are harder to read: they ask for hypotheses later, and less. */
export const ADVANCED_HEX_FROM = 43;

function advancedShare(index: number, wrap: boolean, hex = false): number {
  if (wrap) return index >= ADVANCED_HARD_FROM ? 0.05 : 0;
  if (hex) return index >= ADVANCED_HEX_FROM ? 0.04 + Math.min(1, (index - ADVANCED_HEX_FROM) / 60) * 0.04 : 0;
  if (index < ADVANCED_FROM) return 0;
  const t = Math.min(1, (index - ADVANCED_FROM) / (80 - ADVANCED_FROM));
  return 0.06 + t * 0.06;
}

/** Hard levels: every 10 levels up to HARD_EVERY_5_FROM, then every 5. */
export const HARD_EVERY_5_FROM = 50;

export function isHardLevel(index: number): boolean {
  return index % (index <= HARD_EVERY_5_FROM ? 10 : 5) === 0;
}

/** Which hard level this is: 1 for level 10, 2 for level 20... */
function hardOrdinal(index: number): number {
  return index <= HARD_EVERY_5_FROM ? index / 10 : HARD_EVERY_5_FROM / 10 + (index - HARD_EVERY_5_FROM) / 5;
}

/**
 * Chance for a normal level to be drawn hexagonal. Above 1/4 so that, once a
 * level right after a hexagonal one is skipped, one normal level in four ends
 * up hexagonal.
 */
export const HEX_CHANCE = 0.31;

/** hexFlags[n]: level n is hexagonal; hexBefore[n]: hexagonal levels before it. Filled in order, on demand. */
const hexFlags: boolean[] = [false];
const hexBefore: number[] = [0];

/** The first levels are set by hand: hexagonal gardens at 4 (a small one) and 8. */
const SET_HEX: Record<number, boolean> = { 1: false, 2: false, 3: false, 4: true, 5: false, 6: false, 7: false, 8: true, 9: false };

function drawHex(index: number, afterHex: boolean): boolean {
  if (index in SET_HEX) return SET_HEX[index];
  if (isHardLevel(index) || afterHex || FIXED_SHAPES[index]) return false;
  return new Rng(`ruche-${index}`).chance(HEX_CHANCE);
}

function extendHex(index: number) {
  for (let n = hexFlags.length; n <= index; n++) {
    hexBefore.push(hexBefore[n - 1] + (hexFlags[n - 1] ? 1 : 0));
    hexFlags.push(drawHex(n, hexFlags[n - 1]));
  }
}

/** About one normal level in five has hexagonal tiles, never two levels in a row. */
export function isHexLevel(index: number): boolean {
  if (index < 1) return false;
  extendHex(index);
  return hexFlags[index];
}

/**
 * Sizes [w, h] of the hard levels' gardens, square or portrait: the first
 * one (level 10) is tiny (4x4), and each rung adds one row or one column.
 */
const WRAP_LADDER: Array<[number, number]> = [
  [4, 4],
  [4, 5],
  [5, 5],
  [5, 6],
  [6, 6],
  [6, 7],
  [7, 7],
  [7, 8],
  [8, 8],
  [8, 9],
  [8, 10],
];
/** Hard level (1st, 2nd...) reaching each rung: quickly at first, then more and more slowly. */
const WRAP_RUNG_FROM = [1, 2, 3, 4, 6, 8, 11, 14, 18, 23, 29];

function wrapSize(index: number, rng: Rng): [number, number] {
  const k = hardOrdinal(index);
  let rung = 0;
  while (rung + 1 < WRAP_RUNG_FROM.length && k >= WRAP_RUNG_FROM[rung + 1]) rung++;
  // Now and then a garden one size smaller, for variety (never a bigger one).
  if (rung >= 3 && rng.chance(0.3)) rung--;
  return WRAP_LADDER[rung];
}

/**
 * Hexagonal gardens [shape, w, h], the first one, the second one... (odd
 * widths keep them symmetrical, and a shape never comes twice in a row),
 * then a cycle of the biggest ones.
 */
const HEX_LADDER: Array<[ShapeId, number, number]> = [
  ['comb', 3, 4],
  ['hexagon', 5, 5],
  ['comb', 5, 5],
  ['crown', 7, 7],
  ['comb', 5, 7],
  ['hexagon', 7, 7],
  ['comb', 7, 6],
  ['crown', 9, 9],
  ['comb', 7, 7],
  ['hexagon', 9, 9],
  ['comb', 7, 8],
];
const HEX_CYCLE: Array<[ShapeId, number, number]> = [
  ['crown', 9, 9],
  ['comb', 7, 9],
  ['hexagon', 9, 9],
  ['comb', 9, 8],
];

function hexPlan(index: number): [ShapeId, number, number] {
  extendHex(index);
  const k = hexBefore[index];
  return k < HEX_LADDER.length ? HEX_LADDER[k] : HEX_CYCLE[(k - HEX_LADDER.length) % HEX_CYCLE.length];
}

interface Band {
  upTo: number;
  /** Candidate rectangle sizes [w, h]; the active-cell target for shapes derives from them. */
  sizes: Array<[number, number]>;
  shapeChance: number;
}

/** The very first gardens, one size at a time: 3x3 to 5x5 by level 9. */
const FIRST_SIZES: Record<number, [number, number]> = {
  1: [3, 3],
  2: [3, 4],
  3: [4, 4],
  5: [4, 4],
  6: [4, 5],
  7: [4, 5],
  9: [5, 5],
};

const BANDS: Band[] = [
  { upTo: 9, sizes: [[5, 5]], shapeChance: 0 },
  { upTo: 14, sizes: [[5, 5], [5, 6]], shapeChance: 0.2 },
  { upTo: 20, sizes: [[5, 6], [6, 6], [6, 7]], shapeChance: 0.3 },
  { upTo: 28, sizes: [[6, 7], [7, 7], [6, 8]], shapeChance: 0.4 },
  { upTo: 36, sizes: [[7, 8], [7, 9], [8, 8]], shapeChance: 0.45 },
  { upTo: 48, sizes: [[8, 10], [8, 9], [9, 9]], shapeChance: 0.5 },
  { upTo: 70, sizes: [[8, 11], [9, 10], [9, 11]], shapeChance: 0.5 },
  { upTo: Infinity, sizes: [[8, 12], [9, 11], [9, 12]], shapeChance: 0.5 },
];

/** Hand-picked shapes so players meet every one of them early on. */
const FIXED_SHAPES: Record<number, ShapeId> = {
  9: 'heart',
  11: 'flower',
  14: 'circle',
  17: 'ponds',
  22: 'cloister',
  27: 'diamond',
  36: 'hourglass',
  44: 'heart',
};

export const SHAPES: ShapeId[] = ['circle', 'cloister', 'diamond', 'plus', 'heart', 'flower', 'hourglass', 'ponds'];

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
  hexagon: 0,
  comb: 6,
  crown: 0,
};

/**
 * Pick an odd box whose shape holds roughly `target` cells. Boxes stay at
 * most 9 columns wide (phones in portrait) and grow in height instead, as far
 * as the shape still looks right.
 */
export function fitShape(shape: ShapeId, target: number, rng: Rng): [number, number, number] {
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
    const [width, height] = wrapSize(index, rng);
    return {
      index,
      width,
      height,
      shape: 'rect',
      windiness: rng.float(0.3, 0.8),
      seed,
      cells: width * height,
      wrap: true,
      advanced: advancedShare(index, true),
      hex: false,
    };
  }
  if (isHexLevel(index)) {
    const [shape, width, height] = hexPlan(index);
    const cells = buildShape(shape, width, height, undefined, true).reduce((a, b) => a + b, 0);
    return {
      index,
      width,
      height,
      shape,
      windiness: rng.float(0.25, 0.85),
      seed,
      cells,
      wrap: false,
      advanced: advancedShare(index, false, true),
      hex: true,
    };
  }
  const band = BANDS.find((b) => index <= b.upTo)!;
  const picked0 = rng.pick(band.sizes);
  const [bw, bh] = FIRST_SIZES[index] ?? picked0;
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
  return { index, width, height, shape, windiness, seed, cells, wrap: false, advanced: advancedShare(index, false), hex: false };
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
    hex: info.hex,
  });
  cache.set(index, puzzle);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return puzzle;
}
