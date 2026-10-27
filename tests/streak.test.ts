import { describe, expect, it } from 'vitest';
import { shareText } from '../src/daily';
import { nextReward, rewardText, streakReward, weekDay } from '../src/streak';

describe('watering streak', () => {
  it('walks through weeks of seven days', () => {
    expect([0, 1, 6, 7, 8, 14, 15].map(weekDay)).toEqual([0, 1, 6, 7, 1, 7, 1]);
  });

  it('rewards the 3rd and 7th day of every week, the 7th with a zone hint', () => {
    expect(streakReward(1)).toBeNull();
    expect(streakReward(3)).toEqual({ hints: 1, zoneHints: 0 });
    expect(streakReward(7)).toEqual({ hints: 3, zoneHints: 1 });
    expect(streakReward(10)).toEqual(streakReward(3));
    expect(streakReward(14)).toEqual(streakReward(7));
    expect(nextReward(0)).toEqual({ inDays: 3, reward: { hints: 1, zoneHints: 0 } });
    expect(nextReward(4).inDays).toBe(3);
    expect(nextReward(7).inDays).toBe(3);
    expect(rewardText({ hints: 3, zoneHints: 1 })).toBe('3 indices et 1 indice de zone');
  });

  it('mentions zone hints in the shared result', () => {
    const text = shareText('2026-10-27', { time: 80, moves: 30, hints: 2, zones: 1, rank: 40 }, 0);
    expect(text).toContain('2 indices · 1 zone');
    expect(text).not.toContain('Arrosé');
  });
});
