/** Game controller: ties the board, the renderer, the HUD, sounds and saving together. */
import { Sound } from './audio/sound';
import { Analysis, Board } from './core/board';
import { buildDaily, DailyInfo, dailyInfo, dayKey, msUntilTomorrow } from './core/daily';
import { generate, Puzzle } from './core/generator';
import { buildLevel, GENERATOR_VERSION, LevelInfo, levelInfo } from './core/levels';
import { hashString } from './core/rng';
import { fasterThan, formatTime, timeModel, ZONE_HINT_WEIGHT } from './core/timing';
import { dailyThemeId, shareText } from './daily';
import { isUnlocked, RANDOM_STYLE, refreshUnlocks, STYLE_CHALLENGES } from './progress';
import { renderRandomPreview, renderThemePreview } from './render/preview';
import { GardenRenderer } from './render/renderer';
import { currentTheme, setTheme, THEMES } from './render/themes';
import type { ThemeId } from './render/themes';
import { showRewardedAd } from './ui/ads';
import { Hud, StreakView, StyleCard, WinView } from './ui/hud';
import { attachInput } from './ui/input';
import { shareOrCopy } from './ui/share';
import { advanceStreak, daysToZoneHint, liveStreak, nextReward, rewardText, streakReward, weekDay } from './streak';
import { LevelSnapshot, loadSave, SaveData, writeSave } from './ui/storage';
import {
  buildTutorialBoard,
  LAST_CELL,
  LAST_HINT_DELAY,
  LOCK_CELL,
  STEP_COUNT,
  STEPS,
  TURN_CELL,
  TutorialStep,
} from './tutorial';

type Mode = 'home' | 'play' | 'tutorial';

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
  private tutorialStep: TutorialStep = 'intro';
  /** Whether a lock was used on the current level (for the "no help" challenge). */
  private usedLock = false;
  /** Result of the last win, shown on the win card. */
  private lastWin: { rank: number; unlocked: string[]; streak?: WinView['streak'] } | null = null;
  /** Seconds spent on the current tutorial step, and whether the last tile has been turned. */
  private tutorialClock = 0;
  private tutorialSolved = false;
  /** Set while playing the daily challenge. */
  private daily: DailyInfo | null = null;

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
    this.renderer = new GardenRenderer(canvas);
    this.renderer.events.onWaterArrive = (_cell, dist) => this.sound.water(dist);
    this.sound.enabled = this.save.settings.sound;
    this.hud.setSound(this.sound.enabled);
    this.hud.setHints(this.save.hints);
    this.hud.setZoneHints(this.save.zoneHints);

    attachInput(canvas, {
      cellAt: (x, y) => (this.mode === 'home' ? -1 : this.renderer.cellAt(x, y)),
      lockMode: () => this.lockMode,
      tap: (cell) => this.onTap(cell),
      paintStart: (cell) => this.paintStart(cell),
      paintMove: (cell) => this.paintMove(cell),
      paintEnd: () => this.paintEnd(),
      holdStart: (cell, ms) => {
        this.sound.unlock();
        this.renderer.setPressed(cell);
        const holdable = this.mode === 'tutorial' ? this.tutorialStep === 'lock' && cell === LOCK_CELL : !this.lockMode && !this.won;
        if (holdable) this.renderer.hold = { cell, start: performance.now() / 1000, duration: ms / 1000 };
      },
      holdEnd: () => {
        this.renderer.setPressed(-1);
        this.renderer.hold = null;
      },
    });

    const on = (id: string, fn: () => void) =>
      document.getElementById(id)!.addEventListener('click', () => {
        this.sound.unlock();
        fn();
      });
    on('btn-play', () => this.play(this.save.level));
    on('btn-daily', () => this.playDaily());
    on('btn-share', () => this.shareDaily());
    on('btn-daily-share', () => this.shareDaily());
    on('btn-howto', () => this.hud.openHowto());
    on('btn-styles', () => this.openStyles());
    on('btn-watch-ad', () => this.watchAdForHints());
    on('btn-help', () => this.hud.openHowto());
    on('btn-replay-tutorial', () => this.startTutorial());
    on('coach-next', () => this.advanceTutorial());
    on('coach-skip', () => this.finishTutorial());
    on('btn-levels', () => this.hud.openLevels(this.save.maxLevel, this.save.level, this.save.skipped, (n) => this.play(n)));
    on('btn-streak', () => this.openStreak());
    on('btn-zone-streak', () => this.openStreak());
    on('btn-zone', () => this.toggleZoneMode());
    on('btn-skip', () => {
      if (this.mode === 'play' && !this.won && !this.daily) this.hud.openSkip();
    });
    on('btn-skip-watch', () => this.skipLevel());
    on('btn-home', () => this.showHome());
    on('btn-sound', () => this.toggleSound());
    on('btn-lock', () => this.setLockMode(!this.lockMode));
    on('btn-reset', () => this.reset());
    on('btn-hint', () => this.hint());
    on('btn-next', () => this.next());
    on('btn-next-float', () => this.next());
    on('btn-admire', () => {
      this.hud.hideWin();
      this.hud.setWonBar(true, this.daily ? "Retour à l'accueil" : 'Niveau suivant');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.persist();
    });
    window.addEventListener('pagehide', () => this.persist());
  }

  /** Opens on the home screen, or straight on a level with `?niveau=60` in the URL (handy for testing). */
  start() {
    const requested = Number(new URLSearchParams(location.search).get('niveau'));
    if (Number.isInteger(requested) && requested >= 1) {
      // Drop the parameter so a reload simply resumes the saved game.
      history.replaceState(null, '', location.pathname);
      this.save.maxLevel = Math.max(this.save.maxLevel, requested);
      this.play(requested);
      return;
    }
    if (!this.save.seenTutorial && this.save.maxLevel <= 1 && !this.save.snapshot) {
      this.startTutorial();
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
      if (this.tutorialStep === 'finish') {
        if (this.tutorialSolved && this.renderer.waterComplete()) {
          // The whole garden is watered: celebrate, then congratulate.
          this.sound.win();
          this.vibrate([18, 40, 18]);
          this.renderer.celebrate(() => undefined);
          this.setTutorialStep('bravo');
        } else if (!this.tutorialSolved && !this.renderer.spotlight && this.tutorialClock > LAST_HINT_DELAY) {
          // Stuck for a while: point at the tile that is still wrong.
          this.renderer.spotlight = { cell: LAST_CELL, kind: 'tap' };
        }
      }
      return;
    }
    if (this.mode === 'play' && !this.won && !document.hidden && !this.hud.overlayOpen()) this.elapsed += dt;
    if (this.won && !this.celebrated && this.renderer.waterComplete()) {
      this.celebrated = true;
      this.sound.win();
      this.vibrate([18, 40, 18]);
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
        }
      });
    }
  }

  // ---------- Screens ----------

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
    this.analysis = demo.analyze();
    this.renderer.setAnalysis(this.analysis);
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
    const snap = this.save.snapshot?.level === n ? this.save.snapshot : null;
    this.save.level = n;
    this.startGarden(info, buildLevel(n), snap);
    this.hud.setLevel(info);

    if (info.wrap && !this.save.seenHardIntro) {
      this.save.seenHardIntro = true;
      this.renderer.after(0.5, () => this.hud.openHardIntro());
    } else if (!this.save.seenTutorial && n === 1) {
      this.renderer.after(0.8, () => this.hud.toast('Touche une parcelle pour la faire tourner', false, 4000));
    } else if (n === 3 && !this.save.seenLockTip) {
      this.save.seenLockTip = true;
      this.renderer.after(0.8, () => this.hud.toast('Astuce : appui long puis glisse pour verrouiller', false, 4200));
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
      this.hud.setHomeDaily(`Réussi en ${formatTime(d.result.time)}`, true);
    } else {
      const style = THEMES.find((t) => t.id === dailyThemeId(today, THEMES))!.name;
      this.hud.setHomeDaily(`Style du jour : ${style}`, false);
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
    this.hud.setDaily(info, THEMES.find((t) => t.id === styleId)!.name);
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
      `Réussi en ${formatTime(d.result.time)}${helpText(d.result.hints, d.result.zones ?? 0)}`,
      `Plus rapide que ${d.result.rank} % des joueurs`,
      streak >= 2 ? `${streak} jours de suite !` : '',
      () => {
        const min = Math.ceil(msUntilTomorrow() / 60000);
        return `Prochain défi dans ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
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
    const names = fresh.map((id) => THEMES.find((t) => t.id === id)!.name);
    const copied = outcome === 'copied' ? 'Résultat copié : colle-le à tes amis !' : '';
    if (names.length) this.hud.toast(`${copied ? 'Résultat copié. ' : ''}Nouveau style débloqué : ${names.join(', ')} !`, false, 4200);
    else if (copied) this.hud.toast(copied, false, 3000);
    this.persist();
  }

  // ---------- Tutorial ----------

  private startTutorial() {
    this.persist();
    this.mode = 'tutorial';
    this.won = false;
    this.setLockMode(false);
    this.hud.hideWin();
    this.hud.hideToast();
    this.hud.hideHome();
    this.hud.showGameBars(false);
    const board = buildTutorialBoard();
    this.board = board;
    this.tutorialSolved = false;
    this.renderer.setBoard(board, 'tutoriel');
    this.analysis = board.analyze();
    this.renderer.setAnalysis(this.analysis);
    this.setTutorialStep('intro');
  }

  private setTutorialStep(step: TutorialStep) {
    this.tutorialStep = step;
    this.tutorialClock = 0;
    const info = STEPS[step];
    this.hud.showCoach(info.text, [info.number, STEP_COUNT], info.button);
    this.renderer.spotlight = info.focus;
    requestAnimationFrame(() => this.relayout());
  }

  /** The coach's button: move on to the next explanation. */
  private advanceTutorial() {
    if (this.mode !== 'tutorial') return;
    if (this.tutorialStep === 'intro') this.setTutorialStep('turn');
    else if (this.tutorialStep === 'flowing') this.setTutorialStep('lock');
    else if (this.tutorialStep === 'bravo') this.finishTutorial();
  }

  private finishTutorial() {
    if (this.mode !== 'tutorial') return;
    this.save.seenTutorial = true;
    this.save.seenLockTip = true;
    writeSave(this.save);
    this.play(this.save.level);
  }

  /**
   * Tutorial taps: first only the highlighted tile turns; on the last step the
   * player plays freely (locked tiles refuse to turn) until the garden is done.
   */
  private tutorialTap(board: Board, cell: number) {
    const free = this.tutorialStep === 'finish' && !this.tutorialSolved;
    const allowed = (this.tutorialStep === 'turn' && cell === TURN_CELL) || (free && !board.locked[cell]);
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
    if (this.tutorialStep === 'turn' && board.isCorrect(TURN_CELL)) {
      this.setTutorialStep('flowing');
    } else if (free && this.analysis.solved) {
      // Wait for the water to reach every tile before congratulating.
      this.tutorialSolved = true;
      this.renderer.spotlight = null;
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
      if (this.tutorialStep === 'lock' && cell === LOCK_CELL) {
        board.setLock(cell, true);
        this.sound.lock(true);
        this.vibrate(12);
        this.setTutorialStep('finish');
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
    if (on && this.mode === 'play') this.hud.toast('Mode verrou : touche ou glisse sur les parcelles', false, 2400);
  }

  private reset() {
    if (!this.board || this.won) return;
    const now = performance.now();
    if (now > this.resetArmedUntil) {
      this.resetArmedUntil = now + 2500;
      this.hud.toast('Touche encore pour recommencer le niveau');
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
      const near = wrong.filter((i) =>
        [0, 1, 2, 3].some((d) => {
          const j = board.grid.neighbor(i, d);
          return j >= 0 && an.watered[j] && board.isCorrect(j);
        }),
      );
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
      const when = days <= 0 ? "le prochain aujourd'hui, en finissant ce jardin" : `le prochain dans ${days} jour${days > 1 ? 's' : ''}`;
      this.hud.openZoneInfo(`Tu n'en as plus. Ta série d'arrosage en offre un tous les 7 jours : ${when}.`);
      return;
    }
    this.setLockMode(false);
    this.setZoneMode(true);
    this.hud.toast('Touche une parcelle : le carré de 3×3 autour se remet en place', false, 3200);
  }

  private setZoneMode(on: boolean) {
    this.zoneMode = on;
    this.hud.setZoneMode(on);
  }

  /** Put the 3x3 square around `cell` in its solved orientation and lock it. */
  private applyZone(center: number) {
    const board = this.board!;
    const grid = board.grid;
    const cx = center % grid.width;
    const cy = Math.floor(center / grid.width);
    const zone: number[] = [];
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
    const todo = zone.filter((i) => !board.isCorrect(i) || !board.locked[i]);
    if (!todo.length) {
      this.hud.toast('Ce carré est déjà en place : choisis-en un autre');
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
    const status = watered
      ? "Ton jardin a fleuri aujourd'hui. À demain !"
      : view.count > 0
        ? "Fais fleurir un jardin aujourd'hui (un niveau ou le défi du jour) pour garder ta série."
        : "Fais fleurir un jardin chaque jour (un niveau ou le défi du jour) pour lancer une série.";
    // Not watered yet today: the first of these days is today.
    const next = nextReward(view.count);
    const days = watered ? next.inDays : next.inDays - 1;
    const nextText =
      days <= 0
        ? `Récompense du jour, en faisant fleurir un jardin : ${rewardText(next.reward)}.`
        : `Prochaine récompense dans ${days} jour${days > 1 ? 's' : ''} : ${rewardText(next.reward)}.`;
    const best = this.save.streak.best;
    this.hud.openStreak(view, status, nextText, best > 1 ? `Meilleure série : ${best} jours` : '');
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
    this.save.snapshot = null;
    this.loadLevel(level + 1);
    this.hud.toast(`Niveau ${level} passé : tu pourras y revenir depuis la liste`, false, 3200);
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
      { id: RANDOM_STYLE, name: 'Aléatoire', blurb: 'Un style au hasard parmi tes styles, à chaque niveau', locked: false },
      ...THEMES.map((t) => {
        const challenge = STYLE_CHALLENGES[t.id];
        return {
          id: t.id,
          name: t.name,
          blurb: t.blurb,
          locked: !isUnlocked(this.save, t.id),
          challenge: challenge?.text,
          progress: challenge?.state(this.save).progress,
        };
      }),
    ];
    this.hud.openStyles(
      cards,
      this.save.settings.theme,
      (id, size) => (id === RANDOM_STYLE ? renderRandomPreview(unlockedIds, size, dpr) : renderThemePreview(id as ThemeId, size, dpr)),
      (id) => this.chooseTheme(id),
      (card) => this.hud.toast(`${card.name} : ${card.challenge} (${card.progress})`, false, 3600),
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
    this.hud.toast('+3 indices !');
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
    root.setProperty('--logo-water', p.water);
    root.setProperty('--logo-water-deep', p.waterDeep);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.palette.bgTop);
  }

  private toggleSound() {
    this.sound.enabled = !this.sound.enabled;
    this.save.settings.sound = this.sound.enabled;
    this.hud.setSound(this.sound.enabled);
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
      this.hud.toast("Oups, une boucle ! L'eau tourne en rond.", true);
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
    if (this.lastWin) this.lastWin.unlocked = fresh.map((id) => THEMES.find((t) => t.id === id)!.name);
    writeSave(this.save);
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
      note = `Récompense : ${rewardText(reward)} !`;
    } else {
      const next = nextReward(count);
      note = `Encore ${next.inDays} jour${next.inDays > 1 ? 's' : ''} pour gagner ${rewardText(next.reward)}.`;
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

  private persist() {
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
    if (this.save.settings.haptics) navigator.vibrate?.(pattern);
  }
}

/** ", sans indice" / ", avec 2 indices et 1 zone" for the daily result card. */
function helpText(hints: number, zones: number): string {
  if (!hints && !zones) return ', sans indice';
  const parts: string[] = [];
  if (hints) parts.push(`${hints} indice${hints > 1 ? 's' : ''}`);
  if (zones) parts.push(`${zones} zone${zones > 1 ? 's' : ''}`);
  return `, avec ${parts.join(' et ')}`;
}
