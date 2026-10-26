/** Registry of garden styles and the currently selected one. */
import { applyPalette } from '../palette';
import { amitie } from './amitie';
import { automne } from './automne';
import { canyon } from './canyon';
import { champs } from './champs';
import { desert } from './desert';
import { ete } from './ete';
import { francais } from './francais';
import { hiver } from './hiver';
import { japon } from './japon';
import { jungle } from './jungle';
import { montagne } from './montagne';
import { parcs } from './parcs';
import { printemps } from './printemps';
import { roseraie } from './roseraie';
import { sauvage } from './sauvage';
import { savane } from './savane';
import { urbain } from './urbain';
import { verger } from './verger';
import type { Theme, ThemeId } from './types';

export type { Theme, ThemeId } from './types';

/** In unlock order, roughly from the easiest challenge to the hardest. */
export const THEMES: Theme[] = [
  printemps,
  japon,
  roseraie,
  amitie,
  ete,
  automne,
  hiver,
  champs,
  savane,
  desert,
  verger,
  francais,
  jungle,
  urbain,
  montagne,
  sauvage,
  canyon,
  parcs,
];

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
