/** Progress persistence (localStorage). Levels themselves are never stored: only the seed index. */
import type { BoardSnapshot } from '../core/board';

const KEY = 'jardin-des-sources:v1';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Garden style id. */
  theme: string;
}

export interface SaveData {
  /** Level currently being played. */
  level: number;
  /** Highest level unlocked. */
  maxLevel: number;
  /** In-progress state of `level`, restored when coming back. */
  snapshot: (BoardSnapshot & { level: number }) | null;
  settings: Settings;
  solved: number;
  seenTutorial: boolean;
  seenLockTip: boolean;
  seenHardIntro: boolean;
}

const DEFAULTS: SaveData = {
  level: 1,
  maxLevel: 1,
  snapshot: null,
  settings: { sound: true, haptics: true, theme: 'printemps' },
  solved: 0,
  seenTutorial: false,
  seenLockTip: false,
  seenHardIntro: false,
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
