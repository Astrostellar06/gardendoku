/**
 * Translations: French, English, Spanish, German, Dutch, Italian, Portuguese. French is the source language and the
 * default until `setLang` is called (main.ts does it before anything is built),
 * which also keeps the tests in French.
 *
 * - `t('home.play')`, `t('level.title', { n: 4 })`: a text, `{x}` placeholders filled in.
 * - `tn('count.hint', 3)`: plural forms, from the keys `count.hint_one` / `count.hint_other`.
 * - `applyDom()`: fills the page's `data-i18n` (text), `data-i18n-html` (our own
 *   strings holding <b>) and `data-i18n-attr="aria-label:key;placeholder:key"`.
 */
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { nl } from './nl';
import { pt } from './pt';

export type Lang = 'fr' | 'en' | 'es' | 'de' | 'nl' | 'it' | 'pt';
export type Key = keyof typeof fr;
/** Keys with plural forms, without their `_one` / `_other` suffix. */
export type PluralKey = { [K in Key]: K extends `${infer Base}_one` ? Base : never }[Key];
type Vars = Record<string, string | number>;

export const LANGS: Lang[] = ['fr', 'en', 'es', 'de', 'nl', 'it', 'pt'];
export const DICTS: Record<Lang, Record<Key, string>> = { fr, en, es, de, nl, it, pt };

let current: Lang = 'fr';
let plurals = new Intl.PluralRules('fr');

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as string[]).includes(value);
}

/** Saved choice first, else the device language when the game speaks it, English otherwise. */
export function detectLang(saved?: string | null, device = typeof navigator === 'undefined' ? '' : navigator.language): Lang {
  if (isLang(saved)) return saved;
  const prefix = (device ?? '').slice(0, 2).toLowerCase();
  return isLang(prefix) ? prefix : 'en';
}

export function lang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  current = l;
  plurals = new Intl.PluralRules(l);
}

/** Locale for dates and lists: the device's own variant when it speaks the game's language (en-GB, fr-CA...). */
export function locale(): string {
  const device = typeof navigator === 'undefined' ? '' : (navigator.language ?? '');
  return device.toLowerCase().startsWith(current) ? device : current;
}

export function has(key: string): key is Key {
  return key in fr;
}

/** Text of `key` in the current language, with `{name}` placeholders replaced. */
export function t(key: Key, vars?: Vars): string {
  const text = DICTS[current][key] ?? fr[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Plural text: `{n}` is `n`. French uses the singular for 0 and 1, English for 1 only. */
export function tn(key: PluralKey, n: number, vars?: Vars): string {
  const form = plurals.select(n) === 'one' ? 'one' : 'other';
  return t(`${key}_${form}` as Key, { n, ...vars });
}

/** "a et b", "a and b" (empty parts dropped). */
export function listJoin(parts: string[]): string {
  return new Intl.ListFormat(locale(), { type: 'conjunction' }).format(parts.filter(Boolean));
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale(), opts).format(date);
}

/** "1er", "2e" / "1st", "2nd", "3rd", "11th", "22nd" / "1.º", "1.", "1e"... */
export function ordinal(rank: number): string {
  if (current === 'fr') return rank === 1 ? '1er' : `${rank}e`;
  if (current === 'es' || current === 'it' || current === 'pt') return `${rank}º`;
  if (current === 'de') return `${rank}.`;
  if (current === 'nl') return `${rank}e`;
  const tens = rank % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[rank % 10] ?? 'th';
  return `${rank}${suffix}`;
}

/** Display name and blurb of a garden style. */
export function themeName(id: string): string {
  const key = `theme.${id}.name`;
  return has(key) ? t(key) : id;
}

export function themeBlurb(id: string): string {
  const key = `theme.${id}.blurb`;
  return has(key) ? t(key) : '';
}

/** Fill every translatable element under `root`, and the page language. */
export function applyDom(root: ParentNode = document) {
  if (root === document) document.documentElement.lang = current;
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n!;
    if (has(key)) el.textContent = t(key);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    const key = el.dataset.i18nHtml!;
    if (has(key)) el.innerHTML = t(key);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr!.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key && has(key)) el.setAttribute(attr, t(key));
    }
  }
}
