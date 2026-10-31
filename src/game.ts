/** Game controller: ties the board, the renderer, the HUD, sounds and saving together. */
import { Sound } from './audio/sound';
import { Analysis, Board } from './core/board';
import { buildDaily, DailyInfo, dailyInfo, dayKey, msUntilTomorrow } from './core/daily';
import { generate, Puzzle } from './core/generator';
import { buildLevel, GENERATOR_VERSION, LevelInfo, levelInfo } from './core/levels';
import { hashString } from './core/rng';
import { fasterThan, formatTime, timeModel, ZONE_HINT_WEIGHT } from './core/timing';
import { dailyThemeId, shareText } from './daily';
import { isLang, type Lang, lang, listJoin, t, themeBlurb, themeName, tn } from './i18n';
import { isUnlocked, RANDOM_STYLE, refreshUnlocks, STYLE_CHALLENGES } from './progress';
import { renderRandomPreview, renderThemePreview } from './render/preview';
import { GardenRenderer } from './render/renderer';
import { Garden3D } from './render3d/garden3d';
import { savePreviews, stylePicture } from './render3d/stylePictures';
import { currentTheme, setTheme, THEMES } from './render/themes';
import type { ThemeId } from './render/themes';
import { showRewardedAd } from './ui/ads';
import { Hud, StreakView, StyleCard, WinView } from './ui/hud';
import { attachInput } from './ui/input';
import { LeagueScreen, ordinal } from './ui/league';
import { vibrate, WIN_BUZZ } from './native';
import { Social } from './online/social';
import { shareOrCopy } from './ui/share';
import { advanceStreak, daysToZoneHint, liveStreak, nextReward, rewardText, streakReward, weekDay } from './streak';
import { LevelSnapshot, loadSave, SaveData, writeSave } from './ui/storage';
import { LAST_HINT_DELAY, TutorialId, TUTORIALS, TutorialStep } from './tutorial';

type Mode = 'home' | 'play' | 'tutorial';

/** Home title layouts being tried out (see Game.nextTitleLayout), and where the choice is kept. */
const TITLE_LAYOUTS = ['canal', 'canal-plain', 'canal-solo', 'classic'];
const TITLE_KEY = 'gardendoku:title';

export class Game {
  readonly renderer: GardenRenderer;
  private hud = new Hud();
  private sound = new Sound();
  private save: SaveData = loadSave();
  private mode: Mode = 'home';
  private board: Board | null = null;
  private info: LevelInfo | null = null;
  private analysis: Analysis | null = null;
  private lockMode = false;
  private won = false;
  private celebrated = false;
  private elapsed = 0;
  private hints = 0;
  /** Zone hints used on the current garden, and whether the next tap places one. */
  private zones = 0;
  private zoneMode = false;
  private saveTimer = 0;
  private resetArmedUntil = 0;
  /** Lock state applied by the current finger stroke, and how many tiles it changed. */
  private paint: { lock: boolean; count: number } | null = null;
  /** Tutorial being played, its current step, and the level it leads to. */
  private tutorial: TutorialId = 'basics';
  private tutorialIndex = 0;
  private tutorialLevel = 1;
  /** Whether a lock was used on the current level (for the "no help" challenge). */
  private usedLock = false;
  /** Result of the last win, shown on the win card. */
  private lastWin: { rank: number; unlocked: string[]; streak?: WinView['streak'] } | null = null;
  /** Seconds spent on the current tutorial step, and whether the last tile has been turned. */
  private tutorialClock = 0;
  private tutorialSolved = false;
  /** Set while playing the daily challenge. */
  private daily: DailyInfo | null = null;
  /** Weekly leagues and friends (online). */
  private social = new Social();
  private league: LeagueScreen;

  constructor(canvas: HTMLCanvasElement) {
    // `?debloquer` unlocks every style and tops up hints (testing).
    const params = new URLSearchParams(location.search);
    if (params.has('debloquer')) {
      this.save.unlocked = THEMES.map((t) => t.id);
      this.save.hints = Math.max(this.save.hints, 99);
      this.save.zoneHints = Math.max(this.save.zoneHints, 99);
      params.delete('debloquer');
      const rest = params.toString();
      history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''));
    }
    refreshUnlocks(this.save);
    if (!isUnlocked(this.save, this.save.settings.theme)) this.save.settings.theme = 'printemps';
    const first = this.pickStyle();
    setTheme(first);
    this.applyStyleColors(first);
    // The garden is drawn in 3D; `?rendu=2d` brings back the flat drawing to compare.
    const flat = params.get('rendu') === '2d';
    this.renderer = !flat && Garden3D.supported() ? new Garden3D(canvas) : new GardenRenderer(canvas);
    this.renderer.events.onWaterArrive = (_cell, dist) => this.sound.water(dist);
    this.sound.enabled = this.save.settings.sound;
    this.hud.setHints(this.save.hints);
    this.hud.setZoneHints(this.save.zoneHints);
    this.league = new LeagueScreen(this.hud, this.social, {
      toast: (text) => this.hud.toast(text, false, 3200),
      reward: (r) => {
        this.save.hints += r.hints;
        this.save.zoneHints += r.zones;
        this.hud.setHints(this.save.hints);
        this.hud.setZoneHints(this.save.zoneHints);
        this.persist();
      },
      badge: (rank) => this.hud.setLeagueBadge(true, rank ? ordinal(rank) : t('league.badge')),
    });

    attachInput(canvas, {
      // Once the garden is won, a touch only turns it around.
      cellAt: (x, y) => (this.mode === 'home' || (this.mode === 'play' && this.won) ? -1 : this.renderer.cellAt(x, y)),
      lockMode: () => this.lockMode,
      tap: (cell) => this.onTap(cell),
      paintStart: (cell) => this.paintStart(cell),
      paintMove: (cell) => this.paintMove(cell),
      paintEnd: () => this.paintEnd(),
      holdStart: (cell, ms) => {
        this.sound.unlock();
        this.renderer.setPressed(cell);
        const step = this.tutorialStepInfo();
        const holdable = this.mode === 'tutorial' ? step.kind === 'hold' && cell === step.cell : !this.lockMode && !this.won;
        if (holdable) this.renderer.hold = { cell, start: performance.now() / 1000, duration: ms / 1000 };
      },
      holdEnd: () => {
        this.renderer.setPressed(-1);
        this.renderer.hold = null;
      },
      canDrag: () => this.mode === 'play' && this.renderer.canDrag(this.lockMode),
      drag: (dx, dy) => this.renderer.drag(dx, dy),
      dragEnd: () => this.renderer.dragEnd(),
      pan: (dx, dy) => {
        if (this.mode === 'play') this.renderer.panBy(dx, dy);
      },
      zoom: (x, y, factor) => {
        if (this.mode === 'play') this.renderer.zoomAt(x, y, factor);
      },
    });

    const on = (id: string, fn: () => void) =>
      document.getElementById(id)!.addEventListener('click', () => {
        this.sound.unlock();
        fn();
      });
    on('btn-play', () => this.play(this.save.level));
    this.hud.setTitleLayout(this.titleLayout);
    document.querySelector('#home .logo')!.addEventListener('click', () => this.nextTitleLayout());
    on('btn-daily', () => this.playDaily());
    on('btn-share', () => this.shareDaily());
    on('btn-daily-share', () => this.shareDaily());
    on('btn-howto', () => this.hud.openHowto());
    on('btn-styles', () => this.openStyles());
    on('btn-watch-ad', () => this.watchAdForHints());
    on('btn-help', () => this.hud.openHowto());
    on('btn-replay-tutorial', () => this.startTutorial('basics'));
    on('btn-replay-wrap', () => this.startTutorial('wrap'));
    on('coach-next', () => this.advanceTutorial());
    on('coach-skip', () => this.finishTutorial());
    on('btn-levels', () => this.hud.openLevels(this.save.maxLevel, this.save.level, this.save.skipped, (n) => this.play(n)));
    on('btn-streak', () => this.openStreak());
    on('btn-league', () => this.league.open());
    on('btn-zone-streak', () => this.openStreak());
    on('btn-zone', () => this.toggleZoneMode());
    on('btn-skip', () => {
      if (this.mode === 'play' && !this.won && !this.daily) this.hud.openSkip();
    });
    on('btn-skip-watch', () => this.skipLevel());
    on('btn-home', () => this.showHome());
    on('btn-settings', () => this.openSettings());
    on('btn-home-settings', () => this.openSettings());
    on('set-sound', () => this.toggleSound());
    on('set-haptics', () => this.toggleHaptics());
    for (const b of document.querySelectorAll<HTMLElement>('#set-lang [data-lang]')) {
      b.addEventListener('click', () => {
        if (isLang(b.dataset.lang)) this.chooseLang(b.dataset.lang);
      });
    }
    on('btn-lock', () => this.setLockMode(!this.lockMode));
    on('btn-reset', () => this.reset());
    on('btn-hint', () => this.hint());
    on('btn-next', () => this.next());
    on('btn-next-float', () => this.next());
    on('btn-admire', () => {
      this.hud.hideWin();
      // The garden glides back to the middle of the screen.
      this.renderer.setShowcaseSpace(null);
      this.hud.setWonBar(true, this.daily ? t('win.backHome') : t('win.nextLevel'));
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.persist();
    });
    window.addEventListener('pagehide', () => this.persist());
  }

  /** Opens on the home screen, or straight on a level with `?niveau=60` in the URL (handy for testing). */
  start() {
    void this.startOnline();
    const requested = Number(new URLSearchParams(location.search).get('niveau'));
    if (Number.isInteger(requested) && requested >= 1) {
      // Drop the parameter so a reload simply resumes the saved game.
      history.replaceState(null, '', location.pathname);
      this.save.maxLevel = Math.max(this.save.maxLevel, requested);
      this.play(requested);
      return;
    }
    if (!this.save.seenTutorial && this.save.maxLevel <= 1 && !this.save.snapshot) {
      this.startTutorial('basics');
      return;
    }
    this.showHome();
  }

  /** Re-fit the garden between the HUD elements. */
  relayout() {
    const h = this.renderer.height;
    if (this.mode === 'tutorial') {
      this.renderer.setInsets(Math.max(40, h * 0.08), this.hud.coachInset(h));
      return;
    }
    const [top, bottom] = this.mode === 'play' ? this.hud.gameInsets(h) : this.hud.homeInsets(h);
    this.renderer.setInsets(top, bottom);
  }

  tick(dt: number) {
    if (this.mode === 'tutorial') {
      this.tutorialClock += dt;
      const step = this.tutorialStepInfo();
      if (step.kind === 'read') return;
      if (this.tutorialSolved && this.renderer.waterComplete()) {
        // The whole garden is watered: celebrate, then congratulate.
        this.sound.win();
        this.vibrate(WIN_BUZZ);
        this.renderer.celebrate(() => undefined);
        this.setTutorialStep(this.tutorialIndex + 1);
      } else if (step.kind === 'free' && !this.tutorialSolved && !this.renderer.spotlight && this.tutorialClock > LAST_HINT_DELAY) {
        // Stuck for a while: point at the tile that is still wrong.
        this.renderer.spotlight = { cell: step.cell!, kind: 'tap' };
      }
      return;
    }
    if (this.mode === 'play' && !this.won && !document.hidden && !this.hud.overlayOpen()) this.elapsed += dt;
    if (this.won && !this.celebrated && this.renderer.waterComplete()) {
      this.celebrated = true;
      this.sound.win();
      this.vibrate(WIN_BUZZ);
      // The camera lowers and the garden turns, to be admired.
      this.renderer.after(0.5, () => {
        if (this.mode === 'play' && this.won) this.renderer.startShowcase();
      });
      this.renderer.celebrate(() => {
        if (this.mode === 'play' && this.won) {
          this.hud.showWin({
            level: this.info!.index,
            seconds: this.elapsed,
            moves: this.board!.moves,
            rank: this.lastWin?.rank ?? null,
            unlocked: this.lastWin?.unlocked ?? [],
            daily: !!this.daily,
            streak: this.lastWin?.streak,
          });
          // The turning garden rises above the victory card.
          this.renderer.setShowcaseSpace({ top: this.renderer.insets.top, bottom: this.hud.winCardHeight() + 12 });
        }
      });
    }
  }

  // ---------- Online ----------

  /**
   * Sign in, send the gardens solved offline, hand out the prizes of the weeks
   * over, and follow an invitation (`?ami=CODE` in the address).
   */
  private async startOnline() {
    if (!this.social.enabled) return;
    this.hud.setLeagueBadge(true);
    const params = new URLSearchParams(location.search);
    const invite = params.get('ami');
    if (invite || params.has('ligue')) {
      params.delete('ami');
      params.delete('ligue');
      const rest = params.toString();
      history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''));
    }
    this.social.syncLevel(this.save.maxLevel);
    if (!(await this.social.connect())) return;
    const results = await this.social.claimRewards();
    if (results.length) this.league.showResults(results);
    if (invite) await this.league.addFriend(invite);
    void this.refreshLeagueBadge();
  }

  /** Invitation link opened in the app (gardendoku://ami/CODE). */
  friendLink(code: string) {
    if (this.social.enabled) void this.league.addFriend(code);
  }

  /** The home badge shows the player's rank in their league of the week. */
  private async refreshLeagueBadge() {
    try {
      const league = await this.social.league();
      const k = league.members.findIndex((m) => m.me);
      this.hud.setLeagueBadge(true, k >= 0 ? ordinal(k + 1) : t('league.badge'));
    } catch {
      // Offline: the badge keeps its last text.
    }
  }

  /** League points of the garden just won, added to the win card once the server has counted them. */
  private async scoreWin() {
    this.hud.setWinLeague(null);
    if (!this.social.enabled || !this.info) return;
    const [kind, ref] = this.daily ? (['daily', Number(this.daily.key.replace(/-/g, ''))] as const) : (['level', this.info.index] as const);
    const scored = await this.social.recordSolve(kind, ref, this.save.maxLevel);
    if (!scored || scored.points <= 0) return;
    this.hud.setWinLeague(tn('win.leaguePoints', scored.points, { week: scored.weekPoints }));
    void this.refreshLeagueBadge();
  }

  // ---------- Screens ----------

  /** Android back button: close the open card, cancel the zone hint, or leave the garden. False on the home screen. */
  back(): boolean {
    if (this.hud.closeTopOverlay()) return true;
    if (this.zoneMode) {
      this.setZoneMode(false);
      this.hud.hideToast();
      return true;
    }
    if (this.mode === 'home') return false;
    this.showHome();
    return true;
  }

  private showHome() {
    this.persist();
    this.leaveTutorial();
    this.applyStyle(this.pickStyle());
    this.mode = 'home';
    this.won = false;
    this.setLockMode(false);
    this.setZoneMode(false);
    this.hud.hideWin();
    this.hud.hideToast();
    this.hud.showGameBars(false);
    this.hud.showHome(this.save.level);
    this.daily = null;
    this.updateHomeDaily();
    this.hud.setHomeStreak(liveStreak(this.save.streak, dayKey()), this.save.streak.last === dayKey());
    // A small decorative garden blooms behind the title.
    const demo = new Board(generate({ width: 7, height: 7, shape: 'flower', seed: 'accueil', windiness: 0.5 }));
    demo.solveInstantly();
    this.board = demo;
    this.renderer.setBoard(demo, 'accueil');
    this.renderer.boardHidden = this.titleLayout === 'canal-solo';
    this.analysis = demo.analyze();
    this.renderer.setAnalysis(this.analysis);
    requestAnimationFrame(() => this.relayout());
  }

  /**
   * Home title layouts, being tried out (a tap on the title switches): the
   * title written with a canal, with the tagline and the sample garden, without
   * the tagline, alone; or the G made of tiles.
   */
  private titleLayout = TITLE_LAYOUTS.includes(localStorage.getItem(TITLE_KEY) ?? '') ? localStorage.getItem(TITLE_KEY)! : TITLE_LAYOUTS[0];

  private nextTitleLayout() {
    const k = (TITLE_LAYOUTS.indexOf(this.titleLayout) + 1) % TITLE_LAYOUTS.length;
    this.titleLayout = TITLE_LAYOUTS[k];
    try {
      localStorage.setItem(TITLE_KEY, this.titleLayout);
    } catch {
      // Private browsing: the choice lasts until the page closes.
    }
    this.hud.setTitleLayout(this.titleLayout);
    this.renderer.boardHidden = this.titleLayout === 'canal-solo';
    this.hud.toast(`${k + 1} / ${TITLE_LAYOUTS.length}`, false, 1200);
    requestAnimationFrame(() => this.relayout());
  }

  private play(level: number) {
    this.leaveTutorial();
    this.mode = 'play';
    this.hud.hideHome();
    this.hud.showGameBars(true);
    this.loadLevel(level);
  }

  private loadLevel(n: number) {
    this.daily = null;
    this.applyStyle(this.pickStyle(n));
    const info = levelInfo(n);
    if (info.wrap && !this.save.seenHardIntro) {
      // First hard level: a tiny guided garden with joined edges comes first.
      this.startTutorial('wrap', n);
      return;
    }
    const snap = this.save.snapshot?.level === n ? this.save.snapshot : null;
    this.save.level = n;
    this.startGarden(info, buildLevel(n), snap);
    this.hud.setLevel(info);

    if (info.hex && !this.save.seenHexIntro) {
      this.save.seenHexIntro = true;
      this.renderer.after(0.5, () => this.hud.openHexIntro());
    } else if (!this.save.seenTutorial && n === 1) {
      this.renderer.after(0.8, () => this.hud.toast(t('toast.tapToTurn'), false, 4000));
    } else if (n === 3 && !this.save.seenLockTip) {
      this.save.seenLockTip = true;
      this.renderer.after(0.8, () => this.hud.toast(t('toast.lockTip'), false, 4200));
    }
  }

  /** Show a garden (level or daily), restoring the player's progress on it. */
  private startGarden(info: LevelInfo, puzzle: Puzzle, snap: LevelSnapshot | null) {
    this.info = info;
    const board = new Board(puzzle);
    this.board = board;
    this.won = false;
    this.celebrated = false;
    this.elapsed = 0;
    this.hints = 0;
    this.zones = 0;
    this.setLockMode(false);
    this.setZoneMode(false);
    this.hud.setSkipVisible(!this.daily);
    this.hud.hideWin();
    this.hud.setWonBar(false);
    this.hud.hideToast();
    if (snap && snap.version === GENERATOR_VERSION && board.restore(snap)) {
      this.elapsed = snap.time;
      this.hints = snap.hints ?? 0;
      this.zones = snap.zones ?? 0;
    }
    this.usedLock = !!snap?.usedLock || board.locked.some((l) => l === 1);
    this.renderer.setBoard(board, info.seed);
    this.analysis = board.analyze();
    this.renderer.setAnalysis(this.analysis);
    requestAnimationFrame(() => this.relayout());
    this.persist();
  }

  private next() {
    if (!this.info) return;
    this.hud.hideWin();
    if (this.daily) {
      this.showHome();
      return;
    }
    this.loadLevel(this.info.index + 1);
  }

  // ---------- Daily challenge ----------

  private todayDone(): boolean {
    const d = this.save.daily;
    return !!d && d.key === dayKey() && !!d.result;
  }

  private updateHomeDaily() {
    const today = dayKey();
    const d = this.save.daily;
    if (d && d.key === today && d.result) {
      this.hud.setHomeDaily(t('daily.doneIn', { time: formatTime(d.result.time) }), true);
    } else {
      const style = themeName(dailyThemeId(today, THEMES));
      this.hud.setHomeDaily(t('daily.styleOfDay', { style }), false);
    }
  }

  private playDaily() {
    if (this.todayDone()) {
      this.openDailyResult();
      return;
    }
    this.leaveTutorial();
    this.mode = 'play';
    this.hud.hideHome();
    this.hud.showGameBars(true);
    this.loadDaily(dayKey());
  }

  private loadDaily(key: string) {
    const info = dailyInfo(key);
    this.daily = info;
    const styleId = dailyThemeId(key, THEMES);
    this.applyStyle(styleId);
    if (this.save.daily?.key !== key) this.save.daily = { key, snapshot: null, result: null };
    this.startGarden(info, buildDaily(key), this.save.daily.snapshot);
    this.hud.setDaily(info, themeName(styleId));
    if (info.wrap && !this.save.seenHardIntro) {
      this.save.seenHardIntro = true;
      this.renderer.after(0.5, () => this.hud.openHardIntro());
    }
  }

  private openDailyResult() {
    const d = this.save.daily;
    if (!d?.result) return;
    const streak = liveStreak(this.save.streak, dayKey());
    this.hud.openDailyResult(
      t('daily.doneIn', { time: formatTime(d.result.time) }) + helpText(d.result.hints, d.result.zones ?? 0),
      t('daily.fasterThan', { rank: d.result.rank }),
      streak >= 2 ? t('daily.streak', { n: streak }) : '',
      () => {
        const min = Math.ceil(msUntilTomorrow() / 60000);
        return t('daily.next', { h: Math.floor(min / 60), m: String(min % 60).padStart(2, '0') });
      },
    );
  }

  /** Share today's result (system share sheet, or copied to the clipboard). */
  private async shareDaily() {
    const d = this.save.daily;
    if (!d?.result) return;
    const outcome = await shareOrCopy(shareText(d.key, d.result, liveStreak(this.save.streak, dayKey())));
    if (outcome === 'failed') return;
    this.save.stats.shared++;
    const fresh = refreshUnlocks(this.save);
    const names = fresh.map((id) => themeName(id));
    const copied = outcome === 'copied';
    if (names.length) {
      const unlocked = tn('unlock.newStyle', names.length, { names: listJoin(names) });
      this.hud.toast(copied ? `${t('toast.copiedShort')} ${unlocked}` : unlocked, false, 4200);
    } else if (copied) {
      this.hud.toast(t('toast.resultCopied'), false, 3000);
    }
    this.persist();
  }

  // ---------- Tutorial ----------

  private tutorialStepInfo(): TutorialStep {
    return TUTORIALS[this.tutorial].steps[this.tutorialIndex];
  }

  /** Play a tutorial; afterwards the game goes on with `level`. */
  private startTutorial(id: TutorialId, level = this.save.level) {
    this.persist();
    this.mode = 'tutorial';
    this.tutorial = id;
    this.tutorialLevel = level;
    this.won = false;
    this.setLockMode(false);
    this.setZoneMode(false);
    this.hud.hideWin();
    this.hud.hideToast();
    this.hud.hideHome();
    this.hud.showGameBars(false);
    const board = TUTORIALS[id].build();
    this.board = board;
    this.tutorialSolved = false;
    this.renderer.setBoard(board, id === 'basics' ? 'tutoriel' : 'tutoriel-bords');
    this.analysis = board.analyze();
    this.renderer.setAnalysis(this.analysis);
    this.setTutorialStep(0);
  }

  private setTutorialStep(index: number) {
    this.tutorialIndex = index;
    this.tutorialClock = 0;
    const tutorial = TUTORIALS[this.tutorial];
    const step = tutorial.steps[index];
    this.hud.showCoach(t(step.text), [step.number, tutorial.count], step.kind === 'read' ? t(step.button!) : null);
    const acts = step.kind === 'turn' || step.kind === 'hold';
    this.renderer.spotlight = acts ? { cell: step.cell!, kind: step.kind === 'hold' ? 'hold' : 'tap', ghost: step.ghost } : null;
    requestAnimationFrame(() => this.relayout());
  }

  /** The coach's button: move on to the next explanation, or start playing after the last one. */
  private advanceTutorial() {
    if (this.mode !== 'tutorial' || this.tutorialStepInfo().kind !== 'read') return;
    if (this.tutorialIndex + 1 < TUTORIALS[this.tutorial].steps.length) this.setTutorialStep(this.tutorialIndex + 1);
    else this.finishTutorial();
  }

  private finishTutorial() {
    if (this.mode !== 'tutorial') return;
    if (this.tutorial === 'basics') {
      this.save.seenTutorial = true;
      this.save.seenLockTip = true;
    } else {
      this.save.seenHardIntro = true;
    }
    writeSave(this.save);
    this.play(this.tutorialLevel);
  }

  /**
   * Tutorial taps: only the highlighted tile turns (or its faded copy across
   * the edge); on a 'free' step the player plays freely (locked tiles refuse
   * to turn) until the garden is done.
   */
  private tutorialTap(board: Board, cell: number) {
    const step = this.tutorialStepInfo();
    const free = step.kind === 'free' && !this.tutorialSolved;
    const allowed = (step.kind === 'turn' && cell === step.cell && !this.tutorialSolved) || (free && !board.locked[cell]);
    if (!allowed) {
      this.renderer.shake(cell);
      if (free) this.sound.denied();
      return;
    }
    board.rotate(cell, 1);
    this.renderer.rotate(cell, 1);
    this.sound.rotate();
    this.analysis = board.analyze();
    this.renderer.setAnalysis(this.analysis);
    if (this.analysis.solved) {
      // Wait for the water to reach every tile before congratulating.
      this.tutorialSolved = true;
      this.renderer.spotlight = null;
      this.renderer.showLocks = false;
    } else if (step.kind === 'turn' && board.isCorrect(step.cell!)) {
      this.setTutorialStep(this.tutorialIndex + 1);
    }
  }

  private leaveTutorial() {
    this.renderer.spotlight = null;
    this.hud.hideCoach();
  }

  // ---------- Actions ----------

  private onTap(cell: number) {
    const board = this.board;
    if (this.mode === 'tutorial' && board) {
      this.tutorialTap(board, cell);
      return;
    }
    if (this.mode !== 'play' || this.won || !board) return;
    if (this.zoneMode) {
      this.applyZone(cell);
      return;
    }
    if (board.locked[cell]) {
      this.renderer.shake(cell);
      this.sound.denied();
      return;
    }
    board.rotate(cell, 1);
    this.renderer.rotate(cell, 1);
    this.sound.rotate();
    this.afterChange();
  }

  /**
   * Long press (or touch in lock mode): the first tile flips its lock, and
   * every tile crossed afterwards by the same stroke takes that same state.
   */
  private paintStart(cell: number) {
    const board = this.board;
    if (this.mode === 'tutorial' && board) {
      const step = this.tutorialStepInfo();
      if (step.kind === 'hold' && cell === step.cell) {
        board.setLock(cell, true);
        this.sound.lock(true);
        this.vibrate(12);
        this.setTutorialStep(this.tutorialIndex + 1);
      }
      return;
    }
    if (this.mode !== 'play' || this.won || !board) return;
    if (this.zoneMode) {
      // A long press while the zone hint is armed places it too.
      this.applyZone(cell);
      return;
    }
    const lock = !board.locked[cell];
    board.setLock(cell, lock);
    if (lock) this.usedLock = true;
    this.paint = { lock, count: 0 };
    this.sound.lock(lock);
    this.vibrate(12);
  }

  private paintMove(cell: number) {
    const board = this.board;
    if (!this.paint || !board || this.won) return;
    if (!board.setLock(cell, this.paint.lock)) return;
    this.paint.count++;
    this.sound.lockStep(this.paint.lock, this.paint.count);
    this.vibrate(6);
  }

  private paintEnd() {
    if (!this.paint) return;
    this.paint = null;
    this.persistSoon();
  }

  private setLockMode(on: boolean) {
    if (on) this.setZoneMode(false);
    this.lockMode = on;
    this.renderer.lockMode = on;
    this.hud.setLockMode(on);
    if (on && this.mode === 'play') this.hud.toast(t('toast.lockMode'), false, 2400);
  }

  private reset() {
    if (!this.board || this.won) return;
    const now = performance.now();
    if (now > this.resetArmedUntil) {
      this.resetArmedUntil = now + 2500;
      this.hud.toast(t('toast.resetConfirm'));
      return;
    }
    this.resetArmedUntil = 0;
    this.board.reset();
    this.renderer.syncRotations();
    this.hud.hideToast();
    this.afterChange();
  }

  private hint() {
    const board = this.board;
    const an = this.analysis;
    if (!board || !an || this.won) return;
    this.setZoneMode(false);
    if (this.save.hints <= 0) {
      this.hud.openHintShop();
      return;
    }
    const cells = board.grid.cells;
    // A wrongly locked tile is the most useful thing to point out.
    let pool = cells.filter((i) => board.locked[i] && !board.isCorrect(i));
    if (!pool.length) {
      const wrong = cells.filter((i) => !board.locked[i] && !board.isCorrect(i));
      // Prefer tiles at the edge of the watered network: they unblock the flow.
      const near = wrong.filter((i) => {
        for (let d = 0; d < board.grid.sides; d++) {
          const j = board.grid.neighbor(i, d);
          if (j >= 0 && an.watered[j] && board.isCorrect(j)) return true;
        }
        return false;
      });
      pool = near.length ? near : wrong;
    }
    if (!pool.length) return;
    const cell = pool[Math.floor(Math.random() * pool.length)];
    this.save.hints--;
    this.hud.setHints(this.save.hints);
    const turns = board.applySolution(cell);
    this.renderer.rotate(cell, turns);
    const [x, y] = this.renderer.cellCenter(cell);
    this.renderer.particles.sparkle(x, y, 5, 18);
    this.sound.lock(true);
    this.hints++;
    this.afterChange();
  }

  /** Zone button: arm the zone hint (the next tap picks the square), or explain how to get more. */
  private toggleZoneMode() {
    if (this.mode !== 'play' || this.won || !this.board) return;
    if (this.zoneMode) {
      this.setZoneMode(false);
      this.hud.hideToast();
      return;
    }
    if (this.save.zoneHints <= 0) {
      const today = dayKey();
      const ahead = daysToZoneHint(liveStreak(this.save.streak, today));
      // Not watered yet today: the first of these days is today.
      const days = this.save.streak.last === today ? ahead : ahead - 1;
      const when = days <= 0 ? t('zone.nextToday') : tn('zone.nextIn', days);
      this.hud.openZoneInfo(t('zone.noneLeft', { when }));
      return;
    }
    this.setLockMode(false);
    this.setZoneMode(true);
    this.hud.toast(t(this.board.grid.hex ? 'toast.zoneHex' : 'toast.zoneSquare'), false, 3200);
  }

  private setZoneMode(on: boolean) {
    this.zoneMode = on;
    this.hud.setZoneMode(on);
  }

  /**
   * Put the 3x3 square around `cell` in its solved orientation and lock it
   * (on hexagons: the tile and its six neighbours).
   */
  private applyZone(center: number) {
    const board = this.board!;
    const grid = board.grid;
    const cx = center % grid.width;
    const cy = Math.floor(center / grid.width);
    const zone: number[] = [center];
    if (grid.hex) {
      for (let d = 0; d < grid.sides; d++) if (grid.neighbor(center, d) >= 0) zone.push(grid.neighbor(center, d));
    } else {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let x = cx + dx;
          let y = cy + dy;
          if (grid.wrap) {
            x = (x + grid.width) % grid.width;
            y = (y + grid.height) % grid.height;
          } else if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
            continue;
          }
          const i = y * grid.width + x;
          if (grid.active[i] && !zone.includes(i)) zone.push(i);
        }
      }
    }
    const todo = zone.filter((i) => !board.isCorrect(i) || !board.locked[i]);
    if (!todo.length) {
      this.hud.toast(t(grid.hex ? 'toast.zoneDoneHex' : 'toast.zoneDoneSquare'));
      return;
    }
    for (const i of todo) {
      const turns = board.applySolution(i);
      if (turns) this.renderer.rotate(i, turns);
      const [x, y] = this.renderer.cellCenter(i);
      this.renderer.particles.sparkle(x, y, 3, 16);
    }
    this.save.zoneHints--;
    this.hud.setZoneHints(this.save.zoneHints);
    this.zones++;
    this.setZoneMode(false);
    this.hud.hideToast();
    this.sound.lock(true);
    this.vibrate([10, 30, 10]);
    this.afterChange();
  }

  /** Week track of the streak: watered slots, and the slot waiting for today. */
  private streakView(): StreakView {
    const today = dayKey();
    const count = liveStreak(this.save.streak, today);
    if (this.save.streak.last === today) return { count, filled: weekDay(count), next: -1 };
    // Not watered yet today: a finished week starts over on the first slot.
    const filled = weekDay(count) === 7 ? 0 : weekDay(count);
    return { count, filled, next: filled + 1 };
  }

  private openStreak() {
    const view = this.streakView();
    const watered = this.save.streak.last === dayKey();
    const status = t(watered ? 'streak.statusDone' : view.count > 0 ? 'streak.statusKeep' : 'streak.statusStart');
    // Not watered yet today: the first of these days is today.
    const next = nextReward(view.count);
    const days = watered ? next.inDays : next.inDays - 1;
    const nextText =
      days <= 0
        ? t('streak.rewardToday', { reward: rewardText(next.reward) })
        : tn('streak.rewardIn', days, { reward: rewardText(next.reward) });
    // The best streak so far, always shown (the current one counts too).
    const best = Math.max(this.save.streak.best, liveStreak(this.save.streak, dayKey()));
    this.hud.openStreak(view, status, nextText, best > 0 ? tn('streak.best', best) : '');
  }

  /** Pass the level after a rewarded video; it stays playable from the level list. */
  private async skipLevel() {
    this.hud.close(this.hud.skip);
    if (this.mode !== 'play' || this.won || this.daily || !this.info) return;
    const level = this.info.index;
    const rewarded = await showRewardedAd();
    if (!rewarded || this.mode !== 'play' || this.info?.index !== level) return;
    if (!this.save.skipped.includes(level)) this.save.skipped.push(level);
    this.save.maxLevel = Math.max(this.save.maxLevel, level + 1);
    this.social.syncLevel(this.save.maxLevel);
    void this.social.flush();
    this.save.snapshot = null;
    this.loadLevel(level + 1);
    this.hud.toast(t('toast.skipped', { level }), false, 3200);
    this.persist();
  }

  // ---------- Styles ----------

  /** Style to use now: the chosen one, or for "random" one of the unlocked styles (stable per level). */
  private pickStyle(level?: number): string {
    if (this.save.settings.theme !== RANDOM_STYLE) return this.save.settings.theme;
    const pool = THEMES.filter((t) => isUnlocked(this.save, t.id));
    const k = level === undefined ? Math.floor(Math.random() * pool.length) : hashString(`style:${level}`) % pool.length;
    return pool[k].id;
  }

  /** Switch the palette and scenery before a new garden is shown. */
  private applyStyle(id: string) {
    if (currentTheme().id === id) return;
    setTheme(id);
    this.applyStyleColors(id);
    this.renderer.refreshScenery();
  }

  private openStyles() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const unlockedIds = THEMES.filter((t) => isUnlocked(this.save, t.id)).map((t) => t.id);
    const cards: StyleCard[] = [
      { id: RANDOM_STYLE, name: t('styles.randomName'), blurb: t('styles.randomBlurb'), locked: false },
      ...THEMES.map((theme) => {
        const challenge = STYLE_CHALLENGES[theme.id];
        return {
          id: theme.id,
          name: themeName(theme.id),
          blurb: themeBlurb(theme.id),
          locked: !isUnlocked(this.save, theme.id),
          challenge: challenge?.text(),
          progress: challenge?.state(this.save).progress,
        };
      }),
    ];
    // Previews in the garden's own look: 3D tiles, or the flat drawing.
    const tile = this.renderer instanceof Garden3D ? stylePicture : renderThemePreview;
    this.hud.openStyles(
      cards,
      this.save.settings.theme,
      (id, size) => (id === RANDOM_STYLE ? renderRandomPreview(unlockedIds, size, dpr, tile) : tile(id as ThemeId, size, dpr)),
      (id) => this.chooseTheme(id),
      (card) => this.hud.toast(t('styles.lockedToast', { name: card.name, challenge: card.challenge ?? '', progress: card.progress ?? '' }), false, 3600),
    );
  }

  private chooseTheme(id: string) {
    if (!isUnlocked(this.save, id)) return;
    this.save.settings.theme = id;
    const applied = this.pickStyle(this.mode === 'play' ? this.info?.index : undefined);
    setTheme(applied);
    this.applyStyleColors(applied);
    this.renderer.refreshTheme();
    this.persist();
  }

  /** Rewarded video (placeholder for now): +3 hints. */
  private async watchAdForHints() {
    this.hud.close(this.hud.hintShop);
    const rewarded = await showRewardedAd();
    if (!rewarded) return;
    this.save.hints += 3;
    this.hud.setHints(this.save.hints);
    this.hud.toast(t('toast.hintsGained', { n: 3 }));
    this.persist();
  }

  /** The page background behind the canvas follows the style's sky. */
  private applyStyleColors(id: string) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    document.body.style.background = theme.palette.bgTop;
    const root = document.documentElement.style;
    const p = theme.palette;
    root.setProperty('--logo-grass', p.grass);
    root.setProperty('--logo-side', p.grassSideDark);
    root.setProperty('--logo-rim', p.rim);
    root.setProperty('--logo-groove', p.groove);
    root.setProperty('--logo-soil', p.soil);
    root.setProperty('--logo-water', p.water);
    root.setProperty('--logo-water-deep', p.waterDeep);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.palette.bgTop);
  }

  private openSettings() {
    this.hud.openSettings(this.sound.enabled, this.save.settings.haptics, lang());
  }

  /** Switch language: save, then reload so every text is rebuilt (the garden in progress is in the save). */
  private chooseLang(l: Lang) {
    if (l === lang()) return;
    this.save.settings.lang = l;
    this.persist();
    location.reload();
  }

  private toggleSound() {
    this.sound.enabled = !this.sound.enabled;
    this.save.settings.sound = this.sound.enabled;
    this.hud.setSwitch('set-sound', this.sound.enabled);
    this.persist();
  }

  private toggleHaptics() {
    this.save.settings.haptics = !this.save.settings.haptics;
    this.hud.setSwitch('set-haptics', this.save.settings.haptics);
    // A little buzz to feel the vibrations coming back.
    this.vibrate(12);
    this.persist();
  }

  private afterChange() {
    const board = this.board!;
    const prev = this.analysis;
    const an = board.analyze();
    this.analysis = an;
    this.renderer.setAnalysis(an);

    if (an.loopCells > 0 && (!prev || an.loopCells > prev.loopCells)) {
      this.sound.loop();
      this.hud.toast(t('toast.loop'), true);
    }
    if (an.solved) this.onWin();
    this.persistSoon();
  }

  private onWin() {
    if (!this.info || !this.board) return;
    this.recordWin(this.info, this.board);
    this.won = true;
    this.setLockMode(false);
    this.setZoneMode(false);
    this.hud.setSkipVisible(false);
    this.renderer.hold = null;
    // The padlocks fade away: the garden is done, nothing left to hold in place.
    this.renderer.showLocks = false;
    this.hud.hideToast();
    this.save.solved++;
    this.save.seenTutorial = true;
    if (this.daily && this.save.daily) {
      this.save.daily.result = {
        time: Math.round(this.elapsed),
        moves: this.board.moves,
        hints: this.hints,
        zones: this.zones,
        rank: this.lastWin!.rank,
      };
      this.save.daily.snapshot = null;
      this.save.stats.dailyDone++;
    } else {
      this.save.maxLevel = Math.max(this.save.maxLevel, this.info.index + 1);
      this.save.level = this.info.index + 1;
      this.save.snapshot = null;
      this.save.skipped = this.save.skipped.filter((n) => n !== this.info!.index);
    }
    this.waterStreak();
    const fresh = refreshUnlocks(this.save);
    if (this.lastWin) this.lastWin.unlocked = fresh.map((id) => themeName(id));
    writeSave(this.save);
    void this.scoreWin();
  }

  /** First garden of the day: the streak grows, and some days bring a reward. */
  private waterStreak() {
    const today = dayKey();
    if (this.save.streak.last === today) return;
    this.save.streak = advanceStreak(this.save.streak, today);
    const count = this.save.streak.count;
    const reward = streakReward(count);
    let note: string;
    if (reward) {
      this.save.hints += reward.hints;
      this.save.zoneHints += reward.zoneHints;
      this.hud.setHints(this.save.hints);
      this.hud.setZoneHints(this.save.zoneHints);
      note = t('streak.rewardNow', { reward: rewardText(reward) });
    } else {
      const next = nextReward(count);
      note = tn('streak.moreDays', next.inDays, { reward: rewardText(next.reward) });
    }
    if (this.lastWin) this.lastWin.streak = { count, filled: weekDay(count), next: -1, note };
  }

  /** Rank against other players, and the numbers behind the style challenges. */
  private recordWin(info: LevelInfo, board: Board) {
    const rank = fasterThan(this.elapsed, timeModel(board.puzzle), this.hints + ZONE_HINT_WEIGHT * this.zones);
    const stats = this.save.stats;
    const key = this.daily ? this.daily.key : String(info.index);
    stats.bestTimes[key] = Math.min(stats.bestTimes[key] ?? Infinity, Math.round(this.elapsed));
    stats.bestFasterThan = Math.max(stats.bestFasterThan, rank);
    const tiles = board.grid.cells.length;
    if (info.wrap && !this.daily && !stats.hardSolved.includes(info.index)) stats.hardSolved.push(info.index);
    const helped = this.hints > 0 || this.zones > 0;
    if (!this.usedLock && !helped) stats.noHelpBest = Math.max(stats.noHelpBest, tiles);
    if (!helped) {
      stats.noHintBest = Math.max(stats.noHintBest, tiles);
      stats.noHintStreak++;
      stats.noHintBestStreak = Math.max(stats.noHintBestStreak, stats.noHintStreak);
    } else {
      stats.noHintStreak = 0;
    }
    stats.biggestSolved = Math.max(stats.biggestSolved, tiles);
    if (!stats.shapesSolved.includes(info.shape)) stats.shapesSolved.push(info.shape);
    this.lastWin = { rank, unlocked: [] };
  }

  /** Dev helper: solve all but `leave` tiles. */
  /** Development aid: saves the style menu's 3D previews as pictures (see render3d/stylePictures.ts). */
  savePreviews() {
    return savePreviews();
  }

  debugSolve(leave = 0) {
    const board = this.board;
    if (!board || this.mode !== 'play') return;
    const wrong = board.grid.cells.filter((i) => !board.isCorrect(i));
    for (const i of wrong.slice(leave)) {
      const turns = board.applySolution(i);
      board.locked[i] = 0;
      this.renderer.rotate(i, turns);
    }
    this.afterChange();
  }

  // ---------- Persistence ----------

  private persistSoon() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.persist(), 400);
  }

  /** Save progress, and the garden in progress so it can be resumed. */
  persist() {
    if (this.mode === 'play' && this.board && this.info && !this.won) {
      const snapshot: LevelSnapshot = {
        level: this.info.index,
        ...this.board.snapshot(this.elapsed),
        version: GENERATOR_VERSION,
        hints: this.hints,
        zones: this.zones,
        usedLock: this.usedLock,
      };
      if (this.daily && this.save.daily) this.save.daily.snapshot = snapshot;
      else this.save.snapshot = snapshot;
    }
    writeSave(this.save);
  }

  private vibrate(pattern: number | number[]) {
    if (this.save.settings.haptics) vibrate(pattern);
  }
}

/** ", sans indice" / ", avec 2 indices et 1 zone" for the daily result card. */
function helpText(hints: number, zones: number): string {
  if (!hints && !zones) return t('daily.noHint');
  const parts: string[] = [];
  if (hints) parts.push(tn('count.hint', hints));
  if (zones) parts.push(tn('count.zone', zones));
  return t('daily.withHelp', { help: listJoin(parts) });
}
