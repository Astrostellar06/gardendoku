import { afterEach, describe, expect, it } from 'vitest';
import { fr } from '../src/i18n/fr';
import { detectLang, DICTS, LANGS, listJoin, ordinal, setLang, t, tn } from '../src/i18n';
import { shareText } from '../src/daily';
import { THEMES } from '../src/render/themes';
import { rewardText } from '../src/streak';
import { AVATARS } from '../src/ui/avatars';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (text: string) => [...text.matchAll(/<\/?(\w+)/g)].map((m) => m[0]).sort();

describe('translations', () => {
  afterEach(() => setLang('fr'));

  const others = LANGS.filter((l) => l !== 'fr');

  it.each(others)('%s: the same keys as French', (l) => {
    expect(Object.keys(DICTS[l]).sort()).toEqual(Object.keys(fr).sort());
  });

  it.each(LANGS)('%s: no empty text', (l) => {
    for (const [key, text] of Object.entries(DICTS[l])) expect(text.trim(), key).not.toBe('');
  });

  it.each(others)('%s: the same placeholders and tags as French', (l) => {
    for (const key of Object.keys(fr) as Array<keyof typeof fr>) {
      expect(placeholders(DICTS[l][key]), key).toEqual(placeholders(fr[key]));
      expect(tags(DICTS[l][key]), key).toEqual(tags(fr[key]));
    }
  });

  it('give both plural forms of every plural key', () => {
    for (const key of Object.keys(fr)) {
      if (key.endsWith('_one')) expect(fr, key).toHaveProperty(key.replace(/_one$/, '_other'));
      if (key.endsWith('_other')) expect(fr, key).toHaveProperty(key.replace(/_other$/, '_one'));
    }
  });

  it('name every style and every avatar', () => {
    for (const theme of THEMES) {
      expect(fr, theme.id).toHaveProperty(`theme.${theme.id}.name`);
      expect(fr, theme.id).toHaveProperty(`theme.${theme.id}.blurb`);
    }
    for (const a of AVATARS) expect(fr, a.key).toHaveProperty(`avatar.${a.key}`);
  });

  it.each(others)('%s: keeps French typography out', (l) => {
    for (const [key, text] of Object.entries(DICTS[l])) expect(text, key).not.toMatch(/[  ]/);
  });

  it('fill placeholders, plurals, lists and ordinals', () => {
    expect(t('level.title', { n: 7 })).toBe('Niveau 7');
    expect([tn('count.hint', 0), tn('count.hint', 1), tn('count.hint', 2)]).toEqual(['0 indice', '1 indice', '2 indices']);
    expect(listJoin(['1 zone', '3 indices'])).toBe('1 zone et 3 indices');
    expect([1, 2, 11].map(ordinal)).toEqual(['1er', '2e', '11e']);
    setLang('en');
    expect(t('level.title', { n: 7 })).toBe('Level 7');
    expect([tn('count.hint', 0), tn('count.hint', 1), tn('count.hint', 2)]).toEqual(['0 hints', '1 hint', '2 hints']);
    expect(listJoin(['1 zone', '3 hints'])).toBe('1 zone and 3 hints');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th',
    ]);
  });

  it('writes the shared daily result in English too', () => {
    setLang('en');
    const text = shareText('2026-10-27', { time: 102, moves: 40, hints: 2, zones: 1, rank: 88 }, 3);
    expect(text).toContain('faster than 88% of players');
    expect(text).toContain('2 hints · 1 zone');
    expect(text).toContain('Watered 3 days in a row');
    expect(rewardText({ hints: 3, zoneHints: 1 })).toBe('3 hints and 1 zone hint');
  });

  it('pick the saved language, else the device language', () => {
    expect(detectLang('en', 'fr-FR')).toBe('en');
    expect(detectLang(undefined, 'fr-CA')).toBe('fr');
    expect(detectLang(undefined, 'de-DE')).toBe('de');
    expect(detectLang(undefined, 'pt-BR')).toBe('pt');
    expect(detectLang(undefined, 'ja-JP')).toBe('en');
    expect(detectLang('xx', 'en-US')).toBe('en');
  });
});
