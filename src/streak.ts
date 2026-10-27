/**
 * Watering streak: days in a row on which at least one garden bloomed (a level
 * or the daily challenge). Each week of the streak brings rewards.
 */
import { previousDay } from './core/daily';

export interface Streak {
  /** Last day a garden bloomed. */
  last: string;
  count: number;
  best: number;
}

export interface StreakReward {
  hints: number;
  zoneHints: number;
}

/** Rewards by day of the week of the streak (days 3 and 7, then 10 and 14...). */
export const WEEK_REWARDS: Record<number, StreakReward> = {
  3: { hints: 1, zoneHints: 0 },
  7: { hints: 3, zoneHints: 1 },
};

/** Update the streak for a garden finished on day `key` (a missed day starts over). */
export function advanceStreak(streak: Streak, key: string): Streak {
  if (streak.last === key) return streak;
  const count = streak.last === previousDay(key) ? streak.count + 1 : 1;
  return { last: key, count, best: Math.max(streak.best, count) };
}

/** Streak still alive today: watered today or yesterday. */
export function liveStreak(streak: Streak, today: string): number {
  return streak.last === today || streak.last === previousDay(today) ? streak.count : 0;
}

/** Day of the current week of a streak of `count` days, 1 to 7 (0 for no streak). */
export function weekDay(count: number): number {
  return count <= 0 ? 0 : ((count - 1) % 7) + 1;
}

/** Reward earned on the day the streak reaches `count`, if any. */
export function streakReward(count: number): StreakReward | null {
  return WEEK_REWARDS[weekDay(count)] ?? null;
}

/** The next reward after a streak of `count` days, and how many more days it takes. */
export function nextReward(count: number): { inDays: number; reward: StreakReward } {
  for (let d = 1; d <= 7; d++) {
    const reward = streakReward(count + d);
    if (reward) return { inDays: d, reward };
  }
  return { inDays: 7, reward: WEEK_REWARDS[7] };
}

/** Days after a streak of `count` days until the next zone hint (1 = the next watered day). */
export function daysToZoneHint(count: number): number {
  for (let d = 1; d <= 7; d++) if (streakReward(count + d)?.zoneHints) return d;
  return 7;
}

export function rewardText(reward: StreakReward): string {
  const parts: string[] = [];
  if (reward.hints) parts.push(`${reward.hints} indice${reward.hints > 1 ? 's' : ''}`);
  if (reward.zoneHints) parts.push(`${reward.zoneHints} indice${reward.zoneHints > 1 ? 's' : ''} de zone`);
  return parts.join(' et ');
}
