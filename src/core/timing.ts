/**
 * Offline estimate of how a solve time compares with other players.
 *
 * No server: each garden gets an estimated median solve time from its size,
 * the tiles that need hypothesis reasoning, joined edges and hexagonal tiles.
 * Players' times on a garden are assumed log-normal (a bell curve on the
 * logarithm of the time): nobody takes a negative time, and a few players
 * take much longer.
 */
import type { Puzzle } from './generator';

export interface TimeModel {
  /** Median solve time (seconds). */
  median: number;
  /** Spread of log(time). */
  sigma: number;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Seconds added to the player's time for each hint used. */
export const HINT_PENALTY = 25;
/** A zone hint fixes up to 9 tiles: it weighs as much as 3 hints. */
export const ZONE_HINT_WEIGHT = 3;
/** Joined edges are much harder to read: every border hides a neighbour on the other side. */
export const WRAP_FACTOR = 2.5;
/** Hexagonal tiles have six orientations and six neighbours to check. */
export const HEX_FACTOR = 1.4;

export function timeModel(puzzle: Puzzle): TimeModel {
  const tiles = puzzle.grid.cells.length;
  // Bigger gardens take more than proportionally longer to read.
  let median = 0.8 * tiles ** 1.3;
  median += (puzzle.deepCells ?? 0) * 7;
  if (puzzle.grid.wrap) median *= WRAP_FACTOR;
  if (puzzle.grid.hex) median *= HEX_FACTOR;
  return { median: Math.max(20, median), sigma: 0.55 };
}

/** Standard normal cumulative distribution (Abramowitz & Stegun 7.1.26 on erf). */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** Share of players (1..99 %) slower than `seconds` on this garden. */
export function fasterThan(seconds: number, model: TimeModel, hints = 0): number {
  const t = Math.max(1, seconds + hints * HINT_PENALTY);
  const z = (Math.log(t) - Math.log(model.median)) / model.sigma;
  return Math.round(Math.min(99, Math.max(1, 100 * (1 - normalCdf(z)))));
}
