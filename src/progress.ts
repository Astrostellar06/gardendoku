/**
 * Style unlocks: every style but the spring garden is earned by meeting a
 * challenge. Unlocks are stored, so changing a goal later never takes a style back.
 */
import { t } from './i18n';
import type { ThemeId } from './render/themes/types';
import type { SaveData } from './ui/storage';

export interface ChallengeState {
  done: boolean;
  /** Short progress line, e.g. "1 / 3" or "Best: 72%" (in the current language). */
  progress: string;
}

export interface Challenge {
  /** What to do, e.g. "Solve 3 hard levels" (in the current language). */
  text(): string;
  state(save: SaveData): ChallengeState;
}

const reachLevel = (n: number): Challenge => ({
  text: () => t('challenge.reachLevel', { n }),
  state: (s) => ({ done: s.maxLevel >= n, progress: t('challenge.levelProgress', { level: Math.min(s.maxLevel, n), n }) }),
});

const hardLevels = (n: number): Challenge => ({
  text: () => t('challenge.hardLevels', { n }),
  state: (s) => ({ done: s.stats.hardSolved.length >= n, progress: `${Math.min(s.stats.hardSolved.length, n)} / ${n}` }),
});

const fasterThan = (pct: number): Challenge => ({
  text: () => t('challenge.fasterThan', { pct }),
  state: (s) => ({
    done: s.stats.bestFasterThan >= pct,
    progress: s.stats.bestFasterThan > 0 ? t('challenge.bestPct', { pct: s.stats.bestFasterThan }) : t('challenge.notTried'),
  }),
});

const noHelp = (tiles: number): Challenge => ({
  text: () => t('challenge.noHelp', { n: tiles }),
  state: (s) => ({
    done: s.stats.noHelpBest >= tiles,
    progress: s.stats.noHelpBest > 0 ? t('challenge.bestTiles', { n: s.stats.noHelpBest }) : t('challenge.notDone'),
  }),
});

const counted = (text: () => string, value: (s: SaveData) => number, goal: number): Challenge => ({
  text,
  state: (s) => ({ done: value(s) >= goal, progress: `${Math.min(value(s), goal)} / ${goal}` }),
});

const bigGarden = (text: () => string, value: (s: SaveData) => number, tiles: number): Challenge => ({
  text,
  state: (s) => ({
    done: value(s) >= tiles,
    progress: value(s) > 0 ? t('challenge.bestTiles', { n: value(s) }) : t('challenge.notDone'),
  }),
});

/** Every garden shape, for the "one of each" challenge. */
export const ALL_SHAPES = ['rect', 'ponds', 'cloister', 'circle', 'diamond', 'plus', 'heart', 'flower', 'hourglass'];

/** The challenge that unlocks each style (the spring garden is free). */
export const STYLE_CHALLENGES: Partial<Record<ThemeId, Challenge>> = {
  japon: reachLevel(8),
  automne: noHelp(40),
  hiver: hardLevels(3),
  ete: counted(() => t('challenge.dailies', { n: 3 }), (s) => s.stats.dailyDone, 3),
  amitie: counted(() => t('challenge.share'), (s) => s.stats.shared, 1),
  roseraie: {
    text: () => t('challenge.heart'),
    state: (s) => ({
      done: s.stats.shapesSolved.includes('heart'),
      progress: s.stats.shapesSolved.includes('heart') ? t('challenge.done') : t('challenge.notYet'),
    }),
  },
  champs: counted(() => t('challenge.noHintRun', { n: 5 }), (s) => s.stats.noHintBestStreak, 5),
  savane: reachLevel(25),
  desert: fasterThan(80),
  verger: counted(() => t('challenge.streakDays', { n: 14 }), (s) => s.streak.best, 14),
  francais: bigGarden(() => t('challenge.bigNoHint', { n: 80 }), (s) => s.stats.noHintBest, 80),
  jungle: hardLevels(10),
  urbain: bigGarden(() => t('challenge.big', { n: 100 }), (s) => s.stats.biggestSolved, 100),
  montagne: counted(() => t('challenge.streakDays', { n: 7 }), (s) => s.streak.best, 7),
  sauvage: fasterThan(95),
  canyon: hardLevels(20),
  parcs: counted(
    () => t('challenge.allShapes'),
    (s) => ALL_SHAPES.filter((shape) => s.stats.shapesSolved.includes(shape)).length,
    ALL_SHAPES.length,
  ),
};

export const RANDOM_STYLE = 'aleatoire';

/** Unlocked for good, or tried for a while after a video (save.trials). */
export function isUnlocked(save: SaveData, id: string): boolean {
  return id === 'printemps' || id === RANDOM_STYLE || save.unlocked.includes(id) || (save.trials?.[id] ?? 0) > Date.now();
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
