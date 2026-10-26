/** Progress persistence (localStorage). Levels themselves are never stored: only the seed index. */
import type { BoardSnapshot } from '../core/board';

const KEY = 'jardin-des-sources:v1';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Garden style id, or 'aleatoire' for a random unlocked style on each level. */
  theme: string;
}

/** Numbers behind the style challenges. */
export interface Stats {
  /** Hard (joined-edge) levels solved, by index. */
  hardSolved: number[];
  /** Best "faster than X % of players" reached on a level. */
  bestFasterThan: number;
  /** Biggest garden (in tiles) solved without any lock or hint. */
  noHelpBest: number;
  /** Best time (seconds) per level index. */
  bestTimes: Record<string, number>;
}

/** In-progress level: rotations and locks, plus what the challenges need to know. */
export type LevelSnapshot = BoardSnapshot & { level: number; hints?: number; usedLock?: boolean };

export interface SaveData {
  /** Level currently being played. */
  level: number;
  /** Highest level unlocked. */
  maxLevel: number;
  /** In-progress state of `level`, restored when coming back. */
  snapshot: LevelSnapshot | null;
  settings: Settings;
  solved: number;
  seenTutorial: boolean;
  seenLockTip: boolean;
  seenHardIntro: boolean;
  /** Hints left. */
  hints: number;
  /** Styles unlocked so far. */
  unlocked: string[];
  stats: Stats;
}

/** Hints a new player starts with. */
export const STARTING_HINTS = 5;

const DEFAULTS: SaveData = {
  level: 1,
  maxLevel: 1,
  snapshot: null,
  settings: { sound: true, haptics: true, theme: 'printemps' },
  solved: 0,
  seenTutorial: false,
  seenLockTip: false,
  seenHardIntro: false,
  hints: STARTING_HINTS,
  unlocked: ['printemps'],
  stats: { hardSolved: [], bestFasterThan: 0, noHelpBest: 0, bestTimes: {} },
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...structuredClone(DEFAULTS),
      ...data,
      settings: { ...DEFAULTS.settings, ...(data.settings ?? {}) },
      stats: { ...structuredClone(DEFAULTS.stats), ...(data.stats ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private mode or quota exceeded: the game keeps working without saving.
  }
}
