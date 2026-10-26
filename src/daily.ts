/** Daily challenge bookkeeping: streak of consecutive days, style of the day, share text. */
import { parseDayKey, previousDay } from './core/daily';
import { hashString } from './core/rng';
import { formatTime } from './core/timing';
import type { Theme } from './render/themes/types';

export interface DailyResult {
  time: number;
  moves: number;
  hints: number;
  rank: number;
}

export interface Streak {
  /** Last day the challenge was won. */
  last: string;
  count: number;
  best: number;
}

/** Update the streak for a challenge won on day `key` (a missed day starts over). */
export function advanceStreak(streak: Streak, key: string): Streak {
  if (streak.last === key) return streak;
  const count = streak.last === previousDay(key) ? streak.count + 1 : 1;
  return { last: key, count, best: Math.max(streak.best, count) };
}

/** Streak still alive today: won today or yesterday. */
export function liveStreak(streak: Streak, today: string): number {
  return streak.last === today || streak.last === previousDay(today) ? streak.count : 0;
}

/** Style of the day, picked among every style (even locked ones: a glimpse of what to unlock). */
export function dailyThemeId(key: string, themes: Theme[]): string {
  return themes[hashString(`jour-style:${key}`) % themes.length].id;
}

/** A few lines to paste in a chat, Wordle-style. */
export function shareText(key: string, result: DailyResult, streak: number, url = ''): string {
  const d = parseDayKey(key);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const flowers = Math.max(1, Math.min(5, Math.round(result.rank / 20)));
  const lines = [
    `🌸 Jardin des Sources · défi du ${date}`,
    `⏱️ ${formatTime(result.time)} · plus rapide que ${result.rank} % des joueurs`,
    '🌸'.repeat(flowers) + '🌱'.repeat(5 - flowers),
    result.hints === 0 ? '💧 Sans indice' : `💡 ${result.hints} indice${result.hints > 1 ? 's' : ''}`,
  ];
  if (streak >= 2) lines.push(`🔥 ${streak} jours de suite`);
  if (url) lines.push(url);
  return lines.join('\n');
}
