import { describe, expect, it } from 'vitest';
import { buildLevel } from '../src/core/levels';
import { fasterThan, normalCdf, timeModel } from '../src/core/timing';
import { isUnlocked, refreshUnlocks, STYLE_CHALLENGES } from '../src/progress';
import type { SaveData } from '../src/ui/storage';

const freshSave = (): SaveData => ({
  level: 1,
  maxLevel: 1,
  snapshot: null,
  settings: { sound: true, haptics: true, theme: 'printemps' },
  solved: 0,
  seenTutorial: true,
  seenLockTip: true,
  seenHardIntro: true,
  hints: 5,
  unlocked: ['printemps'],
  stats: { hardSolved: [], bestFasterThan: 0, noHelpBest: 0, bestTimes: {} },
});

describe('rank against other players', () => {
  it('uses a sound normal distribution', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 5);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });

  it('puts the median time at 50 % and rewards speed', () => {
    const model = timeModel(buildLevel(4));
    expect(fasterThan(model.median, model)).toBe(50);
    expect(fasterThan(model.median / 3, model)).toBeGreaterThan(95);
    expect(fasterThan(model.median * 3, model)).toBeLessThan(5);
    expect(fasterThan(model.median / 2, model)).toBeGreaterThan(fasterThan(model.median, model));
  });

  it('expects bigger and harder gardens to take longer', () => {
    expect(timeModel(buildLevel(60)).median).toBeGreaterThan(timeModel(buildLevel(2)).median);
    const hard = buildLevel(10);
    expect(hard.grid.wrap).toBe(true);
    expect(timeModel(hard).median).toBeGreaterThan(timeModel(buildLevel(11)).median * 0.9);
  });

  it('counts hints against the player', () => {
    const model = timeModel(buildLevel(7));
    expect(fasterThan(model.median, model, 2)).toBeLessThan(fasterThan(model.median, model, 0));
  });
});

describe('style unlocks', () => {
  it('starts with the spring garden only (and random)', () => {
    const save = freshSave();
    expect(isUnlocked(save, 'printemps')).toBe(true);
    expect(isUnlocked(save, 'aleatoire')).toBe(true);
    expect(isUnlocked(save, 'japon')).toBe(false);
    expect(refreshUnlocks(save)).toEqual([]);
  });

  it('unlocks styles when their challenge is met, once', () => {
    const save = freshSave();
    save.maxLevel = 8;
    expect(refreshUnlocks(save)).toEqual(['japon']);
    expect(refreshUnlocks(save)).toEqual([]);
    save.stats.hardSolved = [5, 10, 15];
    save.stats.bestFasterThan = 96;
    expect(refreshUnlocks(save).sort()).toEqual(['desert', 'hiver', 'sauvage']);
    save.stats.noHelpBest = 45;
    expect(refreshUnlocks(save)).toEqual(['automne']);
    expect(STYLE_CHALLENGES.jungle!.state(save).progress).toBe('3 / 10');
  });
});
