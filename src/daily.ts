/** Daily challenge bookkeeping: result, style of the day, share text. */
import { parseDayKey } from './core/daily';
import { hashString } from './core/rng';
import { formatTime } from './core/timing';
import type { Theme } from './render/themes/types';

export interface DailyResult {
  time: number;
  moves: number;
  hints: number;
  /** Zone hints used (older results have none). */
  zones?: number;
  rank: number;
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
    helpLine(result.hints, result.zones ?? 0),
  ];
  if (streak >= 2) lines.push(`🪴 Arrosé ${streak} jours de suite`);
  if (url) lines.push(url);
  return lines.join('\n');
}

function helpLine(hints: number, zones: number): string {
  if (hints === 0 && zones === 0) return '💧 Sans indice';
  const parts: string[] = [];
  if (hints) parts.push(`${hints} indice${hints > 1 ? 's' : ''}`);
  if (zones) parts.push(`${zones} zone${zones > 1 ? 's' : ''}`);
  return `💡 ${parts.join(' · ')}`;
}
