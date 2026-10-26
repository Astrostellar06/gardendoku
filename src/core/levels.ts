/**
 * Infinite level progression. A level is fully described by its index:
 * size, shape and generator settings are derived from a per-level seed,
 * then the garden itself is generated from that seed.
 */
import { generate, Puzzle } from './generator';
import { Rng } from './rng';
import { buildShape, ShapeId, SHAPE_NAMES } from './shapes';

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
}

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

/** Hand-picked early shapes so players discover them soon. */
const FIXED_SHAPES: Record<number, ShapeId> = { 9: 'heart', 14: 'circle', 17: 'ponds' };

const SHAPES: ShapeId[] =['circle', 'octagon', 'diamond', 'plus', 'heart', 'flower', 'hourglass', 'ponds'];

/**
 * Pick an odd box whose shape holds roughly `target` cells. Boxes stay at
 * most 9 columns wide (phones in portrait) and grow in height instead.
 */
function fitShape(shape: ShapeId, target: number, rng: Rng): [number, number, number] {
  let best: [number, number, number] = [5, 5, 0];
  let bestScore = Infinity;
  for (let w = 5; w <= 9; w += 2) {
    for (let h = w; h <= w + 6 && h <= 15; h += 2) {
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
  const band = BANDS.find((b) => index <= b.upTo)!;
  const [bw, bh] = rng.pick(band.sizes);
  const windiness = rng.float(0.25, 0.85);

  let shape: ShapeId = 'rect';
  let width = bw;
  let height = bh;
  const roll = rng.chance(band.shapeChance);
  const picked = rng.pick(SHAPES);
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
  return { index, width, height, shape, shapeName: SHAPE_NAMES[shape], windiness, seed, cells };
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
  });
  cache.set(index, puzzle);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return puzzle;
}
