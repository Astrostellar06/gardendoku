import { describe, expect, it } from 'vitest';
import { buildDaily, dailyInfo, dayKey, parseDayKey, previousDay } from '../src/core/daily';
import { shareText } from '../src/daily';
import { advanceStreak, liveStreak } from '../src/streak';
import { solve } from '../src/core/solver';

describe('daily challenge', () => {
  it('formats and walks day keys', () => {
    expect(dayKey(new Date(2026, 9, 7))).toBe('2026-10-07');
    expect(previousDay('2026-11-01')).toBe('2026-10-31');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(parseDayKey('2026-10-27').getDate()).toBe(27);
  });

  it('gives the same garden to everyone on a day, a different one the next day', () => {
    const a = buildDaily('2026-10-27');
    const b = buildDaily('2026-10-27');
    const c = buildDaily('2026-10-28');
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(Array.from(a.tiles)).not.toEqual(Array.from(c.tiles));
  });

  it('follows the week: joined edges on Saturday, biggest on Sunday', () => {
    // 2026-10-31 is a Saturday, 2026-11-01 a Sunday, 2026-10-26 a Monday.
    expect(dailyInfo('2026-10-31').wrap).toBe(true);
    expect(dailyInfo('2026-11-01').cells).toBeGreaterThan(dailyInfo('2026-10-26').cells);
  });

  it('is uniquely solvable every day for a month', () => {
    const start = new Date(2026, 9, 1);
    for (let k = 0; k < 31; k++) {
      const key = dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + k));
      const p = buildDaily(key);
      expect(p.unique, key).toBe(true);
      expect(solve(p.grid, p.tiles, 1).status, key).toBe('solved');
    }
  });

  it('counts streaks of consecutive days', () => {
    let s = { last: '', count: 0, best: 0 };
    s = advanceStreak(s, '2026-10-27');
    s = advanceStreak(s, '2026-10-28');
    s = advanceStreak(s, '2026-10-28');
    expect(s).toEqual({ last: '2026-10-28', count: 2, best: 2 });
    s = advanceStreak(s, '2026-10-30');
    expect(s.count).toBe(1);
    expect(s.best).toBe(2);
    expect(liveStreak(s, '2026-10-31')).toBe(1);
    expect(liveStreak(s, '2026-11-02')).toBe(0);
  });

  it('writes a short text to share', () => {
    const text = shareText('2026-10-27', { time: 102, moves: 40, hints: 0, rank: 88 }, 3);
    expect(text).toContain('défi du 27/10');
    expect(text).toContain('1:42');
    expect(text).toContain('88 %');
    expect(text).toContain('🌸🌸🌸🌸🌱');
    expect(text).toContain('3 jours de suite');
    expect(text).toContain('Sans indice');
  });
});
