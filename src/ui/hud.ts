/** DOM overlay: bars, toasts, home screen and cards. */
import { isHardLevel, LevelInfo } from '../core/levels';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export interface StyleCard {
  id: string;
  name: string;
  blurb: string;
  locked: boolean;
  /** Challenge to meet, and how far the player is (locked styles). */
  challenge?: string;
  progress?: string;
}

export class Hud {
  readonly topbar = $('topbar');
  readonly bottombar = $('bottombar');
  readonly home = $('home');
  readonly win = $('win');
  readonly howto = $('howto');
  readonly levels = $('levels');
  readonly hardIntro = $('hard-intro');
  readonly styles = $('styles');
  readonly coach = $('coach');
  readonly hintShop = $('hint-shop');
  readonly ad = $('ad');
  readonly lockBtn = $('btn-lock');
  readonly soundBtn = $('btn-sound');
  readonly nextFloat = $('btn-next-float');
  private toastEl = $('toast');
  private toastTimer = 0;

  constructor() {
    for (const overlay of [this.howto, this.levels, this.hardIntro, this.styles, this.hintShop]) {
      overlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === overlay || target.closest('[data-close]')) this.close(overlay);
      });
    }
  }

  /** Fade an overlay out, then hide it. */
  close(overlay: HTMLElement) {
    if (overlay.classList.contains('hidden') || overlay.classList.contains('closing')) return;
    overlay.classList.add('closing');
    window.setTimeout(() => {
      overlay.classList.remove('closing');
      overlay.classList.add('hidden');
    }, 260);
  }

  private open(overlay: HTMLElement) {
    overlay.classList.remove('closing', 'hidden');
  }

  showGameBars(on: boolean) {
    this.topbar.classList.toggle('hidden', !on);
    this.bottombar.classList.toggle('hidden', !on);
  }

  setLevel(info: LevelInfo) {
    $('level-title').textContent = `Niveau ${info.index}`;
    $('level-sub').textContent = info.wrap
      ? `★ Difficile · bords reliés`
      : `${info.shapeName} · ${info.cells} parcelles`;
    document.querySelector('.level-pill')!.classList.toggle('hard', info.wrap);
  }

  setLockMode(on: boolean) {
    this.lockBtn.setAttribute('aria-pressed', String(on));
  }

  setSound(on: boolean) {
    this.soundBtn.classList.toggle('muted', !on);
  }

  /** Swap the tool buttons for a single "next level" button (after a win). */
  setWonBar(won: boolean) {
    for (const el of Array.from(this.bottombar.querySelectorAll<HTMLElement>('.tool-btn'))) {
      el.classList.toggle('hidden', won);
    }
    this.nextFloat.classList.toggle('hidden', !won);
  }

  toast(message: string, warn = false, ms = 2600) {
    const el = this.toastEl;
    el.textContent = message;
    el.classList.toggle('warn', warn);
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), ms);
  }

  hideToast() {
    clearTimeout(this.toastTimer);
    this.toastEl.classList.remove('show');
  }

  showHome(level: number) {
    $('play-level').textContent = `Niveau ${level}`;
    this.home.classList.remove('hidden', 'leaving');
  }

  hideHome() {
    this.home.classList.add('hidden');
  }

  /** Hints left, shown on the hint button. */
  setHints(count: number) {
    const badge = $('hint-count');
    badge.textContent = String(count);
    badge.classList.toggle('empty', count <= 0);
  }

  openHintShop() {
    this.open(this.hintShop);
  }

  showWin(level: number, seconds: number, moves: number, rank: number | null = null, unlocked: string[] = []) {
    $('win-text').textContent = `Niveau ${level} terminé`;
    $('win-rank').textContent = rank === null ? '' : `Plus rapide que ${rank} % des joueurs !`;
    const list = $('win-unlocks');
    list.textContent = '';
    for (const name of unlocked) {
      const line = document.createElement('div');
      line.className = 'unlock-line';
      line.textContent = `Nouveau style débloqué : ${name} !`;
      list.appendChild(line);
    }
    $('win-time').textContent = formatTime(seconds);
    $('win-moves').textContent = String(moves);
    $('win-moves-label').textContent = moves > 1 ? 'rotations' : 'rotation';
    this.open(this.win);
  }

  hideWin() {
    this.close(this.win);
  }

  /** An overlay card is covering the game (the timer pauses meanwhile). */
  overlayOpen(): boolean {
    return [this.howto, this.levels, this.hardIntro, this.styles, this.hintShop, this.ad].some(
      (o) => !o.classList.contains('hidden') && !o.classList.contains('closing'),
    );
  }

  /**
   * Style menu: one card per style, with a rendered preview. Locked styles are
   * greyed out with a padlock, and show the challenge that unlocks them.
   */
  openStyles(
    styles: StyleCard[],
    current: string,
    preview: (id: string, size: number) => HTMLCanvasElement,
    onPick: (id: string) => void,
    onLocked: (style: StyleCard) => void,
  ) {
    const grid = $('styles-grid');
    grid.textContent = '';
    for (const style of styles) {
      const b = document.createElement('button');
      b.className = 'style-btn';
      if (style.id === current) b.classList.add('current');
      if (style.locked) b.classList.add('locked');
      const canvas = preview(style.id, 112);
      canvas.className = 'style-preview';
      const name = document.createElement('span');
      name.className = 'style-name';
      name.textContent = style.name;
      b.append(canvas, name);
      if (style.locked) {
        const badge = document.createElement('span');
        badge.className = 'style-lockbadge';
        badge.innerHTML =
          '<svg viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9" rx="2.6" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>';
        const challenge = document.createElement('span');
        challenge.className = 'style-challenge';
        const what = document.createElement('b');
        what.textContent = style.challenge ?? '';
        challenge.append(what, style.progress ?? '');
        b.append(badge, challenge);
      } else {
        const blurb = document.createElement('span');
        blurb.className = 'style-blurb';
        blurb.textContent = style.blurb;
        b.append(blurb);
      }
      b.addEventListener('click', () => {
        if (style.locked) {
          b.classList.remove('shake');
          void b.offsetWidth;
          b.classList.add('shake');
          onLocked(style);
          return;
        }
        grid.querySelector('.current')?.classList.remove('current');
        b.classList.add('current');
        onPick(style.id);
      });
      grid.appendChild(b);
    }
    this.open(this.styles);
  }

  /** Tutorial bubble at the bottom of the screen. */
  showCoach(text: string, step: [number, number], button: string | null) {
    const card = this.coach.querySelector('.coach-card') as HTMLElement;
    $('coach-text').textContent = text;
    $('coach-step').textContent = `${step[0]} / ${step[1]}`;
    const next = $('coach-next');
    next.textContent = button ?? '';
    next.classList.toggle('hidden', !button);
    if (!this.coach.classList.contains('hidden')) {
      card.classList.remove('swap');
      void card.offsetWidth;
      card.classList.add('swap');
    }
    this.coach.classList.remove('hidden');
  }

  hideCoach() {
    this.coach.classList.add('hidden');
  }

  /** Space under the garden left free by the tutorial bubble. */
  coachInset(height: number): number {
    const card = this.coach.querySelector('.coach-card') as HTMLElement;
    return height - (this.coach.offsetTop + card.offsetTop) + 24;
  }

  openHardIntro() {
    this.open(this.hardIntro);
  }

  openHowto() {
    this.open(this.howto);
  }

  openLevels(maxLevel: number, current: number, onPick: (level: number) => void) {
    const grid = $('levels-grid');
    grid.textContent = '';
    const shown = Math.max(maxLevel + 4, 20);
    for (let n = 1; n <= shown; n++) {
      const b = document.createElement('button');
      b.className = 'level-btn';
      b.textContent = String(n);
      if (n === current) b.classList.add('current');
      if (isHardLevel(n)) b.classList.add('hard');
      if (n > maxLevel) {
        b.classList.add('locked');
        b.disabled = true;
      } else {
        b.addEventListener('click', () => {
          this.close(this.levels);
          onPick(n);
        });
      }
      grid.appendChild(b);
    }
    this.open(this.levels);
    grid.querySelector('.current')?.scrollIntoView({ block: 'center' });
  }

  /**
   * Space (px) the bars take, so the garden fits between them. Layout offsets
   * are used rather than bounding boxes, which entrance animations shift.
   */
  gameInsets(height: number): [number, number] {
    const top = this.topbar.offsetTop + this.topbar.offsetHeight + 14;
    const bottom = height - (this.bottombar.offsetTop - 8);
    return [top, bottom];
  }

  homeInsets(height: number): [number, number] {
    const head = this.home.querySelector('.home-top') as HTMLElement;
    const foot = this.home.querySelector('.home-bottom') as HTMLElement;
    const top = head.offsetTop + head.offsetHeight + 16;
    // Extra room under the garden for the tiles' depth and shadow.
    const bottom = height - foot.offsetTop + 40;
    return [top, bottom];
  }
}
