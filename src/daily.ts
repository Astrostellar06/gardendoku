/** Daily challenge bookkeeping: result, style of the day, share text. */
import { parseDayKey } from './core/daily';
import { hashString } from './core/rng';
import { formatDate, t, tn } from './i18n';
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
  const date = formatDate(d, { day: '2-digit', month: '2-digit' });
  const flowers = Math.max(1, Math.min(5, Math.round(result.rank / 20)));
  const lines = [
    `🌸 ${t('share.title', { date })}`,
    `⏱️ ${formatTime(result.time)} · ${t('share.fasterThan', { rank: result.rank })}`,
    '🌸'.repeat(flowers) + '🌱'.repeat(5 - flowers),
    helpLine(result.hints, result.zones ?? 0),
  ];
  if (streak >= 2) lines.push(`🪴 ${t('share.streak', { n: streak })}`);
  if (url) lines.push(url);
  return lines.join('\n');
}

function helpLine(hints: number, zones: number): string {
  if (hints === 0 && zones === 0) return `💧 ${t('share.noHint')}`;
  const parts: string[] = [];
  if (hints) parts.push(tn('count.hint', hints));
  if (zones) parts.push(tn('count.zone', zones));
  return `💡 ${parts.join(' · ')}`;
}
