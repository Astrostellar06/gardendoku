/** Registry of garden styles and the currently selected one. */
import { applyPalette } from '../palette';
import { automne } from './automne';
import { desert } from './desert';
import { hiver } from './hiver';
import { japon } from './japon';
import { jungle } from './jungle';
import { printemps } from './printemps';
import { sauvage } from './sauvage';
import { savane } from './savane';
import type { Theme, ThemeId } from './types';

export type { Theme, ThemeId } from './types';

export const THEMES: Theme[] = [printemps, japon, automne, hiver, savane, desert, jungle, sauvage];

let current: Theme = printemps;

export function currentTheme(): Theme {
  return current;
}

export function findTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? printemps;
}

/** Make `id` the active style (palette included). Returns the theme actually applied. */
export function setTheme(id: ThemeId | string): Theme {
  current = findTheme(id);
  applyPalette(current.palette);
  return current;
}

/** Run `fn` with another style active, then restore the current one (used for previews). */
export function withTheme<T>(id: ThemeId, fn: () => T): T {
  const previous = current;
  setTheme(id);
  try {
    return fn();
  } finally {
    current = previous;
    applyPalette(previous.palette);
  }
}
