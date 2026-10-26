/** DOM overlay: bars, toasts, home screen and cards. */
import type { LevelInfo } from '../core/levels';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
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
  readonly lockBtn = $('btn-lock');
  readonly soundBtn = $('btn-sound');
  readonly nextFloat = $('btn-next-float');
  private toastEl = $('toast');
  private toastTimer = 0;

  constructor() {
    for (const overlay of [this.howto, this.levels, this.hardIntro, this.styles]) {
      overlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === overlay || target.closest('[data-close]')) overlay.classList.add('hidden');
      });
    }
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

  showWin(level: number, seconds: number, moves: number) {
    $('win-text').textContent = `Niveau ${level} terminé`;
    $('win-time').textContent = formatTime(seconds);
    $('win-moves').textContent = String(moves);
    $('win-moves-label').textContent = moves > 1 ? 'rotations' : 'rotation';
    this.win.classList.remove('hidden');
  }

  hideWin() {
    this.win.classList.add('hidden');
  }

  /** An overlay card is covering the game (the timer pauses meanwhile). */
  overlayOpen(): boolean {
    return [this.howto, this.levels, this.hardIntro, this.styles].some((o) => !o.classList.contains('hidden'));
  }

  /** Style menu: one card per style, with a rendered preview. */
  openStyles(
    styles: Array<{ id: string; name: string; blurb: string }>,
    current: string,
    preview: (id: string, size: number) => HTMLCanvasElement,
    onPick: (id: string) => void,
  ) {
    const grid = $('styles-grid');
    grid.textContent = '';
    for (const style of styles) {
      const b = document.createElement('button');
      b.className = 'style-btn';
      if (style.id === current) b.classList.add('current');
      const canvas = preview(style.id, 112);
      canvas.className = 'style-preview';
      const name = document.createElement('span');
      name.className = 'style-name';
      name.textContent = style.name;
      const blurb = document.createElement('span');
      blurb.className = 'style-blurb';
      blurb.textContent = style.blurb;
      b.append(canvas, name, blurb);
      b.addEventListener('click', () => {
        grid.querySelector('.current')?.classList.remove('current');
        b.classList.add('current');
        onPick(style.id);
      });
      grid.appendChild(b);
    }
    this.styles.classList.remove('hidden');
  }

  openHardIntro() {
    this.hardIntro.classList.remove('hidden');
  }

  openHowto() {
    this.howto.classList.remove('hidden');
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
      if (n > maxLevel) {
        b.classList.add('locked');
        b.disabled = true;
      } else {
        b.addEventListener('click', () => {
          this.levels.classList.add('hidden');
          onPick(n);
        });
      }
      grid.appendChild(b);
    }
    this.levels.classList.remove('hidden');
    grid.querySelector('.current')?.scrollIntoView({ block: 'center' });
  }

  /** Space (px) the bars take, so the garden fits between them. */
  gameInsets(height: number): [number, number] {
    const top = this.topbar.getBoundingClientRect().bottom + 14;
    const bottom = height - this.bottombar.getBoundingClientRect().top + 14;
    return [top, bottom];
  }

  homeInsets(height: number): [number, number] {
    const top = (this.home.querySelector('.home-top') as HTMLElement).getBoundingClientRect().bottom + 18;
    const bottom = height - (this.home.querySelector('.home-bottom') as HTMLElement).getBoundingClientRect().top + 18;
    return [top, bottom];
  }
}
