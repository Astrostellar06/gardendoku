/**
 * Daily challenge: the same garden for every player on a given day, built from
 * the date. Difficulty follows the week: small on Monday, joined edges on
 * Saturday, the biggest garden on Sunday.
 */
import { generate, Puzzle } from './generator';
import { fitShape, LevelInfo, SHAPES } from './levels';
import { Rng } from './rng';
import { buildShape, ShapeId, SHAPE_NAMES } from './shapes';

export interface DailyInfo extends LevelInfo {
  /** Day key, 'YYYY-MM-DD' (local time). */
  key: string;
  /** "lundi 27 octobre". */
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date key of `date`, e.g. '2026-10-27'. */
export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Key of the day before `key`. */
export function previousDay(key: string): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Milliseconds until the next local midnight. */
export function msUntilTomorrow(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

interface DayPlan {
  sizes: Array<[number, number]>;
  shapeChance: number;
  wrap: boolean;
  advanced: number;
}

/** Sunday = 0 ... Saturday = 6, as in Date.getDay(). */
const WEEK: DayPlan[] = [
  { sizes: [[9, 11], [9, 12]], shapeChance: 0.4, wrap: false, advanced: 0.1 },
  { sizes: [[6, 7], [6, 6]], shapeChance: 0.5, wrap: false, advanced: 0 },
  { sizes: [[7, 7], [7, 8]], shapeChance: 0.5, wrap: false, advanced: 0 },
  { sizes: [[7, 9], [8, 8]], shapeChance: 0.5, wrap: false, advanced: 0.05 },
  { sizes: [[8, 9], [8, 10]], shapeChance: 0.5, wrap: false, advanced: 0.07 },
  { sizes: [[8, 10], [9, 10]], shapeChance: 0.5, wrap: false, advanced: 0.09 },
  { sizes: [[6, 7], [7, 7], [7, 8]], shapeChance: 0, wrap: true, advanced: 0.04 },
];

export function dailyInfo(key: string): DailyInfo {
  const date = parseDayKey(key);
  const plan = WEEK[date.getDay()];
  const seed = `jour-${key}`;
  const rng = new Rng(seed + ':params');
  const [bw, bh] = rng.pick(plan.sizes);
  const windiness = rng.float(0.3, 0.8);
  let shape: ShapeId = 'rect';
  let width = bw;
  let height = bh;
  if (!plan.wrap && rng.chance(plan.shapeChance)) {
    shape = rng.pick(SHAPES.filter((s) => s !== 'heart' || bw * bh <= 80));
    if (shape !== 'ponds') [width, height] = fitShape(shape, bw * bh, rng.fork('fit'));
  }
  const cells = buildShape(shape, width, height, new Rng(seed).fork('shape')).reduce((a, b) => a + b, 0);
  const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return {
    key,
    label,
    index: 0,
    width,
    height,
    shape,
    shapeName: plan.wrap ? 'Bords reliés' : SHAPE_NAMES[shape],
    windiness,
    seed,
    cells,
    wrap: plan.wrap,
    advanced: plan.advanced,
    hex: false,
  };
}

const cache = new Map<string, Puzzle>();

export function buildDaily(key: string): Puzzle {
  const hit = cache.get(key);
  if (hit) return hit;
  const info = dailyInfo(key);
  const puzzle = generate({
    width: info.width,
    height: info.height,
    shape: info.shape,
    seed: info.seed,
    windiness: info.windiness,
    wrap: info.wrap,
    advanced: info.advanced,
  });
  cache.set(key, puzzle);
  if (cache.size > 4) cache.delete(cache.keys().next().value!);
  return puzzle;
}
