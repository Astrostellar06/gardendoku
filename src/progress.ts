/**
 * Style unlocks: every style but the spring garden is earned by meeting a
 * challenge. Unlocks are stored, so changing a goal later never takes a style back.
 */
import type { ThemeId } from './render/themes/types';
import type { SaveData } from './ui/storage';

export interface ChallengeState {
  done: boolean;
  /** Short progress line, e.g. "1 / 3" or "Meilleur : 72 %". */
  progress: string;
}

export interface Challenge {
  /** What to do, e.g. "Réussir 3 niveaux difficiles". */
  text: string;
  state(save: SaveData): ChallengeState;
}

const reachLevel = (n: number): Challenge => ({
  text: `Atteindre le niveau ${n}`,
  state: (s) => ({ done: s.maxLevel >= n, progress: `Niveau ${Math.min(s.maxLevel, n)} / ${n}` }),
});

const hardLevels = (n: number): Challenge => ({
  text: `Réussir ${n} niveaux difficiles`,
  state: (s) => ({ done: s.stats.hardSolved.length >= n, progress: `${Math.min(s.stats.hardSolved.length, n)} / ${n}` }),
});

const fasterThan = (pct: number): Challenge => ({
  text: `Finir un niveau plus vite que ${pct} % des joueurs`,
  state: (s) => ({
    done: s.stats.bestFasterThan >= pct,
    progress: s.stats.bestFasterThan > 0 ? `Meilleur : ${s.stats.bestFasterThan} %` : 'Pas encore tenté',
  }),
});

const noHelp = (tiles: number): Challenge => ({
  text: `Finir un jardin d'au moins ${tiles} parcelles sans verrou ni indice`,
  state: (s) => ({
    done: s.stats.noHelpBest >= tiles,
    progress: s.stats.noHelpBest > 0 ? `Meilleur : ${s.stats.noHelpBest} parcelles` : 'Pas encore réussi',
  }),
});

/** The challenge that unlocks each style (the spring garden is free). */
export const STYLE_CHALLENGES: Partial<Record<ThemeId, Challenge>> = {
  japon: reachLevel(8),
  automne: noHelp(40),
  hiver: hardLevels(3),
  savane: reachLevel(25),
  desert: fasterThan(80),
  jungle: hardLevels(10),
  sauvage: fasterThan(95),
};

export const RANDOM_STYLE = 'aleatoire';

export function isUnlocked(save: SaveData, id: string): boolean {
  return id === 'printemps' || id === RANDOM_STYLE || save.unlocked.includes(id);
}

/** Record every challenge now met; returns the styles unlocked by this call. */
export function refreshUnlocks(save: SaveData): ThemeId[] {
  const fresh: ThemeId[] = [];
  for (const [id, challenge] of Object.entries(STYLE_CHALLENGES) as Array<[ThemeId, Challenge]>) {
    if (save.unlocked.includes(id) || !challenge.state(save).done) continue;
    save.unlocked.push(id);
    fresh.push(id);
  }
  return fresh;
}
