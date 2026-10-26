/** Game controller: ties the board, the renderer, the HUD, sounds and saving together. */
import { Sound } from './audio/sound';
import { Analysis, Board } from './core/board';
import { generate } from './core/generator';
import { buildLevel, LevelInfo, levelInfo } from './core/levels';
import { renderThemePreview } from './render/preview';
import { GardenRenderer } from './render/renderer';
import { setTheme, THEMES } from './render/themes';
import type { ThemeId } from './render/themes';
import { Hud } from './ui/hud';
import { attachInput } from './ui/input';
import { loadSave, SaveData, writeSave } from './ui/storage';

type Mode = 'home' | 'play';

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
  private saveTimer = 0;
  private resetArmedUntil = 0;
  /** Lock state applied by the current finger stroke, and how many tiles it changed. */
  private paint: { lock: boolean; count: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.applyStyleColors(setTheme(this.save.settings.theme).id);
    this.renderer = new GardenRenderer(canvas);
    this.renderer.events.onWaterArrive = (_cell, dist) => this.sound.water(dist);
    this.sound.enabled = this.save.settings.sound;
    this.hud.setSound(this.sound.enabled);

    attachInput(canvas, {
      cellAt: (x, y) => (this.mode === 'play' ? this.renderer.cellAt(x, y) : -1),
      lockMode: () => this.lockMode,
      tap: (cell) => this.onTap(cell),
      paintStart: (cell) => this.paintStart(cell),
      paintMove: (cell) => this.paintMove(cell),
      paintEnd: () => this.paintEnd(),
      holdStart: (cell, ms) => {
        this.sound.unlock();
        this.renderer.setPressed(cell);
        if (!this.lockMode && !this.won) this.renderer.hold = { cell, start: performance.now() / 1000, duration: ms / 1000 };
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
    on('btn-howto', () => this.hud.openHowto());
    on('btn-styles', () =>
      this.hud.openStyles(
        THEMES,
        this.save.settings.theme,
        (id, size) => renderThemePreview(id as ThemeId, size, Math.min(window.devicePixelRatio || 1, 2.5)),
        (id) => this.chooseTheme(id),
      ),
    );
    on('btn-help', () => this.hud.openHowto());
    on('btn-levels', () => this.hud.openLevels(this.save.maxLevel, this.save.level, (n) => this.play(n)));
    on('btn-home', () => this.showHome());
    on('btn-sound', () => this.toggleSound());
    on('btn-lock', () => this.setLockMode(!this.lockMode));
    on('btn-reset', () => this.reset());
    on('btn-hint', () => this.hint());
    on('btn-next', () => this.next());
    on('btn-next-float', () => this.next());
    on('btn-admire', () => {
      this.hud.hideWin();
      this.hud.setWonBar(true);
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
    this.showHome();
  }

  /** Re-fit the garden between the HUD elements. */
  relayout() {
    const h = this.renderer.height;
    const [top, bottom] = this.mode === 'play' ? this.hud.gameInsets(h) : this.hud.homeInsets(h);
    this.renderer.setInsets(top, bottom);
  }

  tick(dt: number) {
    if (this.mode === 'play' && !this.won && !document.hidden && !this.hud.overlayOpen()) this.elapsed += dt;
    if (this.won && !this.celebrated && this.renderer.waterComplete()) {
      this.celebrated = true;
      this.sound.win();
      this.vibrate([18, 40, 18]);
      this.renderer.celebrate(() => {
        if (this.mode === 'play' && this.won) this.hud.showWin(this.info!.index, this.elapsed, this.board!.moves);
      });
    }
  }

  // ---------- Screens ----------

  private showHome() {
    this.persist();
    this.mode = 'home';
    this.won = false;
    this.setLockMode(false);
    this.hud.hideWin();
    this.hud.hideToast();
    this.hud.showGameBars(false);
    this.hud.showHome(this.save.level);
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
    this.mode = 'play';
    this.hud.hideHome();
    this.hud.showGameBars(true);
    this.loadLevel(level);
  }

  private loadLevel(n: number) {
    this.info = levelInfo(n);
    const board = new Board(buildLevel(n));
    this.board = board;
    this.won = false;
    this.celebrated = false;
    this.elapsed = 0;
    this.hints = 0;
    this.setLockMode(false);
    this.hud.hideWin();
    this.hud.setWonBar(false);
    this.hud.hideToast();

    const snap = this.save.snapshot;
    if (snap && snap.level === n && board.restore(snap)) this.elapsed = snap.time;
    this.save.level = n;

    this.renderer.setBoard(board, this.info.seed);
    this.analysis = board.analyze();
    this.renderer.setAnalysis(this.analysis);
    this.hud.setLevel(this.info);
    requestAnimationFrame(() => this.relayout());
    this.persist();

    if (this.info.wrap && !this.save.seenHardIntro) {
      this.save.seenHardIntro = true;
      this.renderer.after(0.5, () => this.hud.openHardIntro());
    } else if (!this.save.seenTutorial && n === 1) {
      this.renderer.after(0.8, () => this.hud.toast('Touche une parcelle pour la faire tourner', false, 4000));
    } else if (n === 3 && !this.save.seenLockTip) {
      this.save.seenLockTip = true;
      this.renderer.after(0.8, () => this.hud.toast('Astuce : appui long puis glisse pour verrouiller', false, 4200));
    }
  }

  private next() {
    if (!this.info) return;
    this.hud.hideWin();
    this.loadLevel(this.info.index + 1);
  }

  // ---------- Actions ----------

  private onTap(cell: number) {
    const board = this.board;
    if (this.mode !== 'play' || this.won || !board) return;
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
    if (this.mode !== 'play' || this.won || !board) return;
    const lock = !board.locked[cell];
    board.setLock(cell, lock);
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
    const turns = board.applySolution(cell);
    this.renderer.rotate(cell, turns);
    const [x, y] = this.renderer.cellCenter(cell);
    this.renderer.particles.sparkle(x, y, 5, 18);
    this.sound.lock(true);
    this.hints++;
    this.afterChange();
  }

  private chooseTheme(id: string) {
    const theme = setTheme(id);
    this.save.settings.theme = theme.id;
    this.applyStyleColors(theme.id);
    this.renderer.refreshTheme();
    this.persist();
  }

  /** The page background behind the canvas follows the style's sky. */
  private applyStyleColors(id: string) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    document.body.style.background = theme.palette.bgTop;
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
    if (!this.info) return;
    this.won = true;
    this.setLockMode(false);
    this.renderer.hold = null;
    this.hud.hideToast();
    this.save.solved++;
    this.save.seenTutorial = true;
    this.save.maxLevel = Math.max(this.save.maxLevel, this.info.index + 1);
    this.save.level = this.info.index + 1;
    this.save.snapshot = null;
    writeSave(this.save);
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
      this.save.snapshot = { level: this.info.index, ...this.board.snapshot(this.elapsed) };
    }
    writeSave(this.save);
  }

  private vibrate(pattern: number | number[]) {
    if (this.save.settings.haptics) navigator.vibrate?.(pattern);
  }
}
