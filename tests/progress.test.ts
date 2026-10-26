import { describe, expect, it } from 'vitest';
import { buildLevel } from '../src/core/levels';
import { fasterThan, normalCdf, timeModel } from '../src/core/timing';
import { isUnlocked, refreshUnlocks, STYLE_CHALLENGES } from '../src/progress';
import { THEMES } from '../src/render/themes';
import { newSave } from '../src/ui/storage';

const freshSave = newSave;

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

  it('unlocks the garden styles tied to the daily challenge, shapes and big gardens', () => {
    const save = freshSave();
    save.stats.shared = 1;
    save.stats.dailyDone = 3;
    save.stats.shapesSolved = ['heart'];
    expect(refreshUnlocks(save).sort()).toEqual(['amitie', 'ete', 'roseraie']);
    save.stats.biggestSolved = 120;
    save.stats.noHintBest = 79;
    save.streak.best = 7;
    expect(refreshUnlocks(save).sort()).toEqual(['montagne', 'urbain']);
    expect(STYLE_CHALLENGES.francais!.state(save).progress).toBe('Meilleur : 79 parcelles');
    expect(STYLE_CHALLENGES.parcs!.state(save).progress).toBe('1 / 9');
    save.stats.shapesSolved = ['rect', 'ponds', 'cloister', 'circle', 'diamond', 'plus', 'heart', 'flower', 'hourglass'];
    expect(refreshUnlocks(save)).toEqual(['parcs']);
  });

  it('has a challenge for every style but the free one', () => {
    for (const theme of THEMES) {
      if (theme.id === 'printemps') expect(STYLE_CHALLENGES[theme.id]).toBeUndefined();
      else expect(STYLE_CHALLENGES[theme.id], theme.id).toBeDefined();
    }
  });
});
