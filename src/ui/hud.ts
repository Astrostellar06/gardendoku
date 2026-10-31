/** DOM overlay: bars, toasts, home screen and cards. */
import { isHardLevel, isHexLevel, LevelInfo } from '../core/levels';
import { formatTime } from '../core/timing';
import { type Lang, t, tn } from '../i18n';
import { RANDOM_STYLE } from '../progress';
import { rewardText, WEEK_REWARDS } from '../streak';
import { canalTitle, playTitle } from './titleArt';

export { formatTime };

/** Display name of a garden's shape ("Cœur", "Bords reliés"...); not shown in the HUD at the moment. */
export function shapeName(info: Pick<LevelInfo, 'shape' | 'wrap'>): string {
  return info.wrap ? t('shape.wrap') : t(`shape.${info.shape}`);
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Watering streak, as shown on the win card and in the streak card. */
export interface StreakView {
  count: number;
  /** Slots of the 7-day track already watered. */
  filled: number;
  /** Slot waiting for today's watering (streak card), or -1. */
  next: number;
}

/** What the win card shows. */
export interface WinView {
  level: number;
  seconds: number;
  moves: number;
  rank: number | null;
  unlocked: string[];
  daily: boolean;
  /** Set when this win extended the streak (first garden of the day). */
  streak?: StreakView & { note: string };
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
  readonly hexIntro = $('hex-intro');
  readonly styles = $('styles');
  readonly coach = $('coach');
  readonly hintShop = $('hint-shop');
  readonly dailyResult = $('daily-result');
  readonly streak = $('streak');
  readonly zoneInfo = $('zone-info');
  readonly skip = $('skip');
  readonly settings = $('settings');
  readonly league = $('league');
  readonly profile = $('profile');
  readonly leagueResult = $('league-result');
  private countdownTimer = 0;
  readonly ad = $('ad');
  readonly lockBtn = $('btn-lock');
  readonly zoneBtn = $('btn-zone');
  readonly skipBtn = $('btn-skip');
  readonly nextFloat = $('btn-next-float');
  private toastEl = $('toast');
  private toastTimer = 0;

  /** Cards the player can dismiss (tap outside, close button, back button). */
  private closable = [
    this.howto, this.levels, this.hardIntro, this.hexIntro, this.styles, this.hintShop, this.dailyResult, this.streak, this.zoneInfo, this.skip,
    this.settings, this.league, this.profile, this.leagueResult,
  ];

  constructor() {
    this.home.querySelector('.logo')!.appendChild(canalTitle('Gardendoku'));
    for (const overlay of this.closable) {
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

  /** Back button: close the card on top, if any. The ad plays to its end. */
  closeTopOverlay(): boolean {
    const shown = (o: HTMLElement) => !o.classList.contains('hidden') && !o.classList.contains('closing');
    if (shown(this.ad)) return true;
    const open = this.closable.filter(shown);
    if (!open.length) return false;
    this.close(open[open.length - 1]);
    return true;
  }

  open(overlay: HTMLElement) {
    overlay.classList.remove('closing', 'hidden');
  }

  showGameBars(on: boolean) {
    this.topbar.classList.toggle('hidden', !on);
    this.bottombar.classList.toggle('hidden', !on);
  }

  setLevel(info: LevelInfo) {
    // Hard levels: a star in the title, on a lilac pill.
    const title = t('level.title', { n: info.index });
    $('level-title').textContent = info.wrap ? `${title} ★` : title;
    $('level-sub').textContent = tn('level.tiles', info.cells);
    const pill = document.querySelector('.level-pill')!;
    pill.classList.toggle('hard', info.wrap);
    // Hexagonal levels: honey pill with a little hexagon after the title.
    pill.classList.toggle('hex', info.hex);
    pill.classList.remove('daily');
  }

  /** Level pill during the daily challenge. */
  setDaily(info: LevelInfo, styleName: string) {
    $('level-title').textContent = t('daily.title');
    $('level-sub').textContent = styleName;
    const pill = document.querySelector('.level-pill')!;
    pill.classList.toggle('hard', info.wrap);
    pill.classList.toggle('hex', info.hex);
    pill.classList.add('daily');
  }

  /** Home screen daily button: today's status. */
  setHomeDaily(text: string, done: boolean) {
    $('daily-sub').textContent = text;
    $('btn-daily').classList.toggle('done', done);
  }

  /** Card shown when today's challenge is already won: result, streak, time until the next one. */
  openDailyResult(text: string, rank: string, streak: string, untilNext: () => string) {
    $('daily-result-text').textContent = text;
    $('daily-result-rank').textContent = rank;
    $('daily-result-streak').textContent = streak;
    const tick = () => {
      $('daily-countdown').textContent = untilNext();
      if (this.dailyResult.classList.contains('hidden')) clearInterval(this.countdownTimer);
    };
    clearInterval(this.countdownTimer);
    tick();
    this.countdownTimer = window.setInterval(tick, 1000);
    this.open(this.dailyResult);
  }

  setLockMode(on: boolean) {
    this.lockBtn.setAttribute('aria-pressed', String(on));
  }

  setZoneMode(on: boolean) {
    this.zoneBtn.setAttribute('aria-pressed', String(on));
  }

  /** The skip button only makes sense on regular levels. */
  setSkipVisible(on: boolean) {
    this.skipBtn.classList.toggle('hidden', !on);
  }

  /** Settings card: sound and vibrations switches, language. */
  openSettings(sound: boolean, haptics: boolean, lang: Lang) {
    this.setSwitch('set-sound', sound);
    this.setSwitch('set-haptics', haptics);
    for (const b of $('set-lang').querySelectorAll<HTMLElement>('[data-lang]')) {
      const on = b.dataset.lang === lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    }
    this.open(this.settings);
  }

  setSwitch(id: string, on: boolean) {
    const s = $(id);
    s.classList.toggle('on', on);
    s.setAttribute('aria-checked', String(on));
  }

  /** Swap the tool buttons for a single "next" button (after a win). */
  setWonBar(won: boolean, label = t('win.nextLevel')) {
    for (const el of Array.from(this.bottombar.querySelectorAll<HTMLElement>('.tool-btn'))) {
      el.classList.toggle('hidden', won);
    }
    this.nextFloat.textContent = label;
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
    $('play-level').textContent = t('level.title', { n: level });
    this.home.classList.remove('hidden', 'leaving');
    // Water the title again.
    playTitle(this.home.querySelector('.logo-canal')!);
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

  /** Zone hints left, on the zone button. */
  setZoneHints(count: number) {
    const badge = $('zone-count');
    badge.textContent = String(count);
    badge.classList.toggle('empty', count <= 0);
  }

  openHintShop() {
    this.open(this.hintShop);
  }

  /** Explains the zone hint; `text` says how to get more. */
  openZoneInfo(text: string) {
    $('zone-info-text').textContent = text;
    this.open(this.zoneInfo);
  }

  openSkip() {
    this.open(this.skip);
  }

  /** Home screen corner: current streak, highlighted once today's garden has bloomed. */
  setHomeStreak(count: number, wateredToday: boolean) {
    $('streak-count').textContent = String(count);
    $('btn-streak').classList.toggle('pending', !wateredToday);
  }

  openStreak(view: StreakView, status: string, next: string, best: string) {
    $('streak-title').textContent = view.count > 1 ? t('streak.daysInRow', { n: view.count }) : tn('count.day', view.count);
    this.fillTrack($('streak-track'), view, false);
    $('streak-status').textContent = status;
    $('streak-next').textContent = next;
    $('streak-best').textContent = best;
    this.open(this.streak);
  }

  /** Seven slots for the week of the streak; gifts on the reward days. */
  private fillTrack(track: HTMLElement, view: StreakView, popLast: boolean) {
    track.textContent = '';
    for (let day = 1; day <= 7; day++) {
      const slot = document.createElement('span');
      slot.className = 'slot';
      if (day <= view.filled) slot.classList.add('done');
      if (day === view.next) slot.classList.add('next');
      if (popLast && day === view.filled) slot.classList.add('pop');
      const reward = WEEK_REWARDS[day];
      if (reward) {
        slot.classList.add('gift');
        if (day === 7) slot.classList.add('big');
        slot.innerHTML =
          '<svg viewBox="0 0 24 24"><rect x="4.5" y="10" width="15" height="9.5" rx="2" /><path d="M3.5 7h17v3h-17zM12 7v12.5M12 7c-1.6-3.2-5.2-3-4.6-.6.4 1.3 3 .6 4.6.6Zm0 0c1.6-3.2 5.2-3 4.6-.6-.4 1.3-3 .6-4.6.6Z" /></svg>';
        // Touching a gift tells what it holds.
        slot.setAttribute('role', 'button');
        slot.tabIndex = 0;
        slot.setAttribute('aria-label', rewardText(reward));
        slot.addEventListener('click', (e) => {
          e.stopPropagation();
          this.giftTip(slot, rewardText(reward), day >= 6);
        });
      } else {
        slot.textContent = String(day);
      }
      track.appendChild(slot);
    }
  }

  /** Little bubble above a gift of the streak, saying what it holds; it fades away by itself. */
  private giftTip(slot: HTMLElement, text: string, alignRight: boolean) {
    const open = slot.querySelector('.gift-tip');
    for (const tip of Array.from(document.querySelectorAll('.gift-tip'))) tip.remove();
    if (open) return;
    const tip = document.createElement('span');
    tip.className = 'gift-tip';
    if (alignRight) tip.classList.add('right');
    tip.textContent = text;
    slot.appendChild(tip);
    window.setTimeout(() => tip.remove(), 2800);
  }

  showWin(w: WinView) {
    $('win-text').textContent = w.daily ? t('win.dailyDone') : t('win.levelDone', { n: w.level });
    const box = $('win-streak');
    box.classList.toggle('hidden', !w.streak);
    if (w.streak) {
      $('win-streak-title').textContent = w.streak.count > 1 ? t('win.streakDays', { n: w.streak.count }) : t('win.streakFirst');
      this.fillTrack($('win-streak-track'), w.streak, true);
      $('win-streak-note').textContent = w.streak.note;
    }
    $('btn-share').classList.toggle('hidden', !w.daily);
    $('btn-next').textContent = w.daily ? t('win.backHome') : t('win.nextLevel');
    $('btn-next').classList.toggle('soft', w.daily);
    $('win-rank').textContent = w.rank === null ? '' : t('win.fasterThan', { rank: w.rank });
    const list = $('win-unlocks');
    list.textContent = '';
    for (const name of w.unlocked) {
      const line = document.createElement('div');
      line.className = 'unlock-line';
      line.textContent = tn('unlock.newStyle', 1, { names: name });
      list.appendChild(line);
    }
    $('win-time').textContent = formatTime(w.seconds);
    $('win-moves').textContent = String(w.moves);
    $('win-moves-label').textContent = tn('win.rotations', w.moves);
    this.open(this.win);
  }

  /** The rank against other players, once their real times are in (the card may already be open). */
  setWinRank(rank: number) {
    $('win-rank').textContent = t('win.fasterThan', { rank });
  }

  /** Height of the victory card from the bottom of the screen, once it has slid in. */
  winCardHeight(): number {
    const card = this.win.querySelector<HTMLElement>('.card');
    const pad = parseFloat(getComputedStyle(this.win).paddingBottom) || 0;
    return (card?.offsetHeight ?? 0) + pad;
  }

  hideWin() {
    this.close(this.win);
  }

  /** An overlay card is covering the game (the timer pauses meanwhile). */
  overlayOpen(): boolean {
    return [...this.closable, this.ad].some((o) => !o.classList.contains('hidden') && !o.classList.contains('closing'));
  }

  /** Home badge of the weekly league: hidden without a server, else "League" or the player's rank. */
  setLeagueBadge(visible: boolean, text = t('league.badge')) {
    $('btn-league').classList.toggle('hidden', !visible);
    $('league-badge-text').textContent = text;
  }

  /** League points earned by the garden just won, on the win card (null hides the line). */
  setWinLeague(text: string | null) {
    const line = $('win-league');
    line.classList.toggle('hidden', !text);
    line.textContent = text ?? '';
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
    // "Random" is not a style of its own.
    const real = styles.filter((s) => s.id !== RANDOM_STYLE);
    const unlocked = real.filter((s) => !s.locked).length;
    $('styles-count').textContent = t(unlocked === real.length ? 'styles.countAll' : 'styles.count', { unlocked, total: real.length });
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

  openHexIntro() {
    this.open(this.hexIntro);
  }

  openHowto() {
    this.open(this.howto);
  }

  /** Level grid; skipped levels are marked so the player can come back to them. */
  openLevels(maxLevel: number, current: number, skipped: number[], onPick: (level: number) => void) {
    const grid = $('levels-grid');
    grid.textContent = '';
    const shown = Math.max(maxLevel + 4, 20);
    for (let n = 1; n <= shown; n++) {
      const b = document.createElement('button');
      b.className = 'level-btn';
      b.textContent = String(n);
      if (n === current) b.classList.add('current');
      if (isHardLevel(n)) b.classList.add('hard');
      if (isHexLevel(n)) b.classList.add('hex');
      if (skipped.includes(n)) {
        b.classList.add('skipped');
        b.title = t('levels.skipped');
      }
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
