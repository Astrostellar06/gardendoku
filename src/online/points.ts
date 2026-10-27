/**
 * Weekly league scoring, shared by the game (to show what a garden earns) and
 * by scripts/level-points.ts, which writes the same values into the server's
 * level_points table: the server never takes the player's word for points.
 */
import type { LevelInfo } from '../core/levels';

/** Gardens at least this big earn one point more. */
export const BIG_GARDEN = 100;
export const DAILY_POINTS = 3;
/** Points a player can score in one day (Paris time), against runaway or scripted sessions. */
export const DAILY_CAP = 60;
export const LEAGUE_SIZE = 20;

/** Prizes of the five best of each league, rank 1 first. */
export const LEAGUE_PRIZES: ReadonlyArray<{ zones: number; hints: number }> = [
  { zones: 3, hints: 5 },
  { zones: 1, hints: 3 },
  { zones: 1, hints: 0 },
  { zones: 0, hints: 2 },
  { zones: 0, hints: 1 },
];

/** +1 for a normal garden, +2 for a hexagonal one, +4 for joined edges, +1 more if it is very big. */
export function levelPoints(info: LevelInfo): number {
  const base = info.wrap ? 4 : info.hex ? 2 : 1;
  return base + (info.cells >= BIG_GARDEN ? 1 : 0);
}
