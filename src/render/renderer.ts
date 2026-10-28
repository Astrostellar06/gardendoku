/**
 * Canvas renderer for the garden. Owns the per-tile animation state
 * (rotation spring, water flow, blooming) and draws everything each frame.
 *
 * Water physically travels: a tile only starts filling once the tile it
 * drinks from is full and both have stopped rotating, so water visibly runs
 * from the spring along the canals. Grass and flowers follow the water.
 */
import { Analysis, Board } from '../core/board';
import { DX, DY, dirVecs, opposite } from '../core/grid';
import { Particles } from './particles';
import { renderBackground } from './background';
import { Decor, G, makeDecor } from './decor';
import { clamp01, easeOutBack } from './easing';
import { mixColor, P } from './palette';
import { currentTheme } from './themes';
import {
  drawTile,
  drawTileCritters,
  drawTileProps,
  drawTileWater,
  facePath,
  hasCritters,
  hasForeground,
  hexPath,
  roundRectPath,
  stepAngle,
  TILE_OVERFLOW,
  TileState,
} from './tileArt';

interface CellVis {
  angle: number;
  vel: number;
  target: number;
  water: number;
  bloom: number;
  loop: number;
  lock: number;
  press: number;
  shake: number;
  popAt: number;
  arrived: boolean;
  decor: Decor;
  /** Cached images of the tile (base and foreground layers), dry and fully grown. */
  cache: Record<CacheKey, HTMLCanvasElement | null>;
  /** Rotation each cached image was drawn for (plants are drawn upright). */
  cacheRot: Record<CacheKey, number>;
}

type CacheKey = 'dry' | 'wet' | 'dryFg' | 'wetFg';

const emptyCache = (): Record<CacheKey, HTMLCanvasElement | null> => ({ dry: null, wet: null, dryFg: null, wetFg: null });
const emptyRots = (): Record<CacheKey, number> => ({ dry: -1, wet: -1, dryFg: -1, wetFg: -1 });

export interface RendererEvents {
  /** Water just filled a tile, `dist` tiles away from the spring (used for the little melody). */
  onWaterArrive?: (cell: number, dist: number) => void;
}

const FILL_RATE = 6.5;
const DRAIN_RATE = 5;
const BLOOM_RATE = 1.05;
const WILT_RATE = 1.6;
const HOLD_VISIBLE_AFTER = 0.12;
/** Width (in tiles) of the faded strips showing the opposite edge on joined-edge levels. */
const GHOST = 0.42;
/** Half the width of a hexagonal cell, centre to corner (tile units). */
const HEX_HALF_W = 1 / Math.sqrt(3);
/** Shadow and gloss sprites span a little more than a tile, for the corners of hexagons. */
const SPRITE_SPAN = 1.1;

export class GardenRenderer {
  readonly canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected dpr = 1;
  width = 0;
  height = 0;
  insets = { top: 84, bottom: 104, side: 14 };
  maxTile = 96;

  protected board: Board | null = null;
  protected analysis: Analysis | null = null;
  protected vis: CellVis[] = [];
  protected tile = 40;
  protected ox = 0;
  protected oy = 0;
  /** Margin (in tiles) reserved around the garden for the ghost strips. */
  protected ghost = 0;
  protected bg: HTMLCanvasElement | null = null;
  protected bed: HTMLCanvasElement | null = null;
  /** Soft shadow under a tile and glossy light on its face, shared by all tiles. */
  protected shadowSprite: HTMLCanvasElement | null = null;
  protected glossSprite: HTMLCanvasElement | null = null;
  protected timers: Array<{ at: number; fn: () => void }> = [];
  protected pressed = -1;

  readonly particles = new Particles();
  events: RendererEvents = {};
  time = 0;
  lockMode = false;
  protected bridgeSprites = new Map<string, HTMLCanvasElement>();
  /** Off once the garden is won: the padlocks fade away so it can be admired. */
  showLocks = true;
  hold: { cell: number; start: number; duration: number } | null = null;
  /**
   * Tutorial: tile under the spotlight, and the gesture it asks for. With
   * `ghost`, the faded copy of the tile in the strip below the garden.
   */
  spotlight: { cell: number; kind: 'tap' | 'hold'; ghost?: boolean } | null = null;

  /** Sides of the tiles (4, or 6 on hexagonal gardens) and one rotation step in radians. */
  protected sides = 4;
  protected step = Math.PI / 2;
  protected vecs = dirVecs(4);
  /** Hexagonal gardens: top-left cell centre (tile units) and size of the garden (tiles). */
  protected hexMin: [number, number] = [0, 0];
  protected span: [number, number] = [0, 0];
  /** Tiles from the back of the garden to the front, as drawn. */
  protected order: number[] = [];

  protected decorSeed = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const theme = currentTheme();
    this.particles.setAmbient(theme.ambient, theme.ambientColors);
  }

  /** Background and ambient particles of the current style (before a new board). */
  refreshScenery() {
    const theme = currentTheme();
    this.particles.setAmbient(theme.ambient, theme.ambientColors);
    if (this.width) this.bg = renderBackground(this.width, this.height, this.dpr);
  }

  /** Redraw everything for the newly selected style (palette, scenery, tile decorations). */
  refreshTheme() {
    this.refreshScenery();
    const board = this.board;
    if (board) {
      this.vis.forEach((v, i) => {
        const active = board.grid.active[i] === 1;
        v.decor = makeDecor(active ? board.base[i] : 0, `${this.decorSeed}:${i}`, i === board.source, 0, this.sides);
      });
    }
    this.layout();
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(dpr, 2.5);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.bg = renderBackground(width, height, this.dpr);
    this.particles.resize(width, height);
    this.layout();
  }

  setInsets(top: number, bottom: number) {
    this.insets.top = top;
    this.insets.bottom = bottom;
    this.layout();
  }

  setBoard(board: Board, decorSeed: string) {
    this.board = board;
    this.decorSeed = decorSeed;
    this.analysis = null;
    this.showLocks = true;
    this.timers = [];
    this.particles.clearEffects();
    this.sides = board.grid.sides;
    this.step = stepAngle(this.sides);
    this.vecs = dirVecs(this.sides);
    // Odd hexagonal columns sit half a tile lower: draw by height on screen, back to front.
    const g = board.grid;
    this.order = g.hex ? g.cells.slice().sort((a, b) => g.center(a)[1] - g.center(b)[1] || a - b) : g.cells;
    this.vis = [];
    for (let i = 0; i < board.grid.size; i++) {
      const active = board.grid.active[i] === 1;
      this.vis.push({
        angle: board.rot[i],
        vel: 0,
        target: board.rot[i],
        water: 0,
        bloom: 0,
        loop: 0,
        lock: board.locked[i],
        press: 0,
        shake: 0,
        popAt: -10,
        arrived: false,
        decor: makeDecor(active ? board.base[i] : 0, `${decorSeed}:${i}`, i === board.source, 0, this.sides),
        cache: emptyCache(),
        cacheRot: emptyRots(),
      });
    }
    this.layout();
  }

  setAnalysis(analysis: Analysis) {
    this.analysis = analysis;
  }

  /** Animate a rotation of `dir` steps (quarter turns, or sixth turns on hexagons). */
  rotate(cell: number, dir: number) {
    this.vis[cell].target += dir;
  }

  /** Bring the visual rotation in line with the board (after reset / restore). */
  syncRotations() {
    if (!this.board) return;
    for (const i of this.board.grid.cells) {
      const v = this.vis[i];
      const n = this.sides;
      const delta = (((this.board.rot[i] - v.target) % n) + n) % n;
      v.target += delta;
    }
  }

  shake(cell: number) {
    this.vis[cell].shake = 1;
  }

  /** Tile currently held down by the finger (-1 for none). */
  setPressed(cell: number) {
    this.pressed = cell;
  }

  cellAt(x: number, y: number): number {
    if (!this.board) return -1;
    const g = this.board.grid;
    if (g.hex) {
      // The nearest centre, if the touch is on its hexagon.
      let best = -1;
      let bestD = Infinity;
      for (const i of g.cells) {
        const [cx, cy] = this.cellCenter(i);
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return bestD <= (this.tile * 0.58) ** 2 ? best : -1;
    }
    const fx = (x - this.ox) / this.tile;
    const fy = (y - this.oy) / this.tile;
    let gx = Math.floor(fx);
    let gy = Math.floor(fy);
    if (g.wrap) {
      // Touching a ghost tile turns the real tile on the other side.
      const inX = fx >= -this.ghost && fx < g.width + this.ghost;
      const inY = fy >= -this.ghost && fy < g.height + this.ghost;
      if ((gx === -1 || gx === g.width) && gy >= 0 && gy < g.height && inX) gx = (gx + g.width) % g.width;
      else if ((gy === -1 || gy === g.height) && gx >= 0 && gx < g.width && inY) gy = (gy + g.height) % g.height;
    }
    if (gx < 0 || gy < 0 || gx >= g.width || gy >= g.height) return -1;
    const i = g.index(gx, gy);
    return g.active[i] ? i : -1;
  }

  cellCenter(i: number): [number, number] {
    const g = this.board!.grid;
    if (g.hex) {
      const [cx, cy] = g.center(i);
      return [this.ox + (cx - this.hexMin[0] + HEX_HALF_W) * this.tile, this.oy + (cy - this.hexMin[1] + 0.5) * this.tile];
    }
    return [this.ox + (g.x(i) + 0.5) * this.tile, this.oy + (g.y(i) + 0.5) * this.tile];
  }

  boardBounds() {
    const g = this.board?.grid;
    if (!g) return { x: 0, y: 0, w: this.width, h: this.height };
    if (g.hex) return { x: this.ox, y: this.oy, w: this.span[0] * this.tile, h: this.span[1] * this.tile };
    return { x: this.ox, y: this.oy, w: g.width * this.tile, h: g.height * this.tile };
  }

  after(delay: number, fn: () => void) {
    this.timers.push({ at: this.time + delay, fn });
  }

  /** Victory wave: tiles pop from the spring outwards, flowers burst into petals. */
  celebrate(onDone: () => void) {
    const an = this.analysis;
    const board = this.board;
    if (!an || !board) return;
    const tile = this.tile;
    let last = 0;
    for (const i of an.order) {
      const delay = 0.15 + an.dist[i] * 0.07;
      last = Math.max(last, delay);
      this.vis[i].popAt = this.time + delay;
      const leaf = board.base[i] && (board.base[i] & (board.base[i] - 1)) === 0;
      if (leaf || i === board.source) {
        this.after(delay + 0.1, () => {
          const [x, y] = this.cellCenter(i);
          this.particles.burst(x, y, i === board.source ? 14 : 6, Math.max(0.6, tile / 60));
          this.particles.sparkle(x, y, 2, tile * 0.4);
        });
      }
    }
    if (currentTheme().creature === 'butterfly') {
      this.after(last * 0.5 + 0.4, () => {
        const b = this.boardBounds();
        this.particles.butterfly(-20, b.y + b.h * 0.3, b);
        this.particles.butterfly(this.width + 20, b.y + b.h * 0.7, b);
      });
    }
    this.after(last + 0.7, onDone);
  }

  protected layout() {
    if (!this.board || !this.width) return;
    const g = this.board.grid;
    const availW = this.width - this.insets.side * 2;
    const availH = this.height - this.insets.top - this.insets.bottom;
    this.ghost = g.wrap ? GHOST : 0;
    if (g.hex) {
      // Fit the hexagons themselves: columns overlap, odd ones sit half a tile lower.
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const i of g.cells) {
        const [cx, cy] = g.center(i);
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
      }
      this.hexMin = [minX, minY];
      this.span = [maxX - minX + HEX_HALF_W * 2, maxY - minY + 1];
      this.tile = Math.max(12, Math.floor(Math.min(availW / this.span[0], availH / this.span[1], this.maxTile)));
      this.ox = Math.round((this.width - this.tile * this.span[0]) / 2);
      this.oy = Math.round(this.insets.top + (availH - this.tile * this.span[1]) / 2);
    } else {
      const cols = g.width + this.ghost * 2;
      const rows = g.height + this.ghost * 2;
      this.tile = Math.max(12, Math.floor(Math.min(availW / cols, availH / rows, this.maxTile)));
      this.ox = Math.round((this.width - this.tile * g.width) / 2);
      this.oy = Math.round(this.insets.top + (availH - this.tile * g.height) / 2);
    }
    for (const v of this.vis) {
      v.cache = emptyCache();
      v.cacheRot = emptyRots();
    }
    this.renderBed();
    this.renderSprites();
  }

  protected renderSprites() {
    const t = this.tile;
    const H = G.half;

    // Shadow: only the blurred shadow of a shape drawn off-canvas is kept.
    const sides = this.sides;
    const shadowPx = Math.ceil(t * 1.5 * this.dpr);
    const sh = document.createElement('canvas');
    sh.width = shadowPx;
    sh.height = shadowPx;
    const sctx = sh.getContext('2d')!;
    const far = shadowPx * 2;
    sctx.setTransform(t * this.dpr, 0, 0, t * this.dpr, shadowPx / 2 - far, shadowPx / 2);
    sctx.shadowColor = P.tileShadow;
    sctx.shadowBlur = t * this.dpr * 0.12;
    sctx.shadowOffsetX = far;
    facePath(sctx, sides);
    sctx.fillStyle = '#000';
    sctx.fill();
    this.shadowSprite = sh;

    // Gloss: light along the top of the face, a hint of shade at the bottom.
    const px = Math.ceil(t * SPRITE_SPAN * this.dpr);
    const gl = document.createElement('canvas');
    gl.width = px;
    gl.height = px;
    const gctx = gl.getContext('2d')!;
    gctx.setTransform(px / SPRITE_SPAN, 0, 0, px / SPRITE_SPAN, px / 2, px / 2);
    facePath(gctx, sides);
    const shade = gctx.createLinearGradient(0, -H, 0, H);
    shade.addColorStop(0, 'rgba(255,255,255,0.22)');
    shade.addColorStop(0.1, 'rgba(255,255,255,0)');
    shade.addColorStop(0.8, 'rgba(120,60,90,0)');
    shade.addColorStop(1, 'rgba(120,60,90,0.08)');
    gctx.fillStyle = shade;
    gctx.fill();
    facePath(gctx, sides, 0.012, sides === 6 ? undefined : G.corner - 0.01);
    const rim = gctx.createLinearGradient(0, -H, 0, H);
    rim.addColorStop(0, 'rgba(255,255,255,0.9)');
    rim.addColorStop(0.35, 'rgba(255,255,255,0)');
    gctx.strokeStyle = rim;
    gctx.lineWidth = 0.022;
    gctx.stroke();
    this.glossSprite = gl;
  }

  /** Soft white garden bed following the shape of the grid. */
  protected renderBed() {
    const board = this.board!;
    const g = board.grid;
    const c = document.createElement('canvas');
    c.width = Math.round(this.width * this.dpr);
    c.height = Math.round(this.height * this.dpr);
    const ctx = c.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);
    const t = this.tile;
    const pad = t * 0.1;
    if (g.wrap) {
      this.bed = c;
      this.renderWrapBed(ctx);
      return;
    }
    ctx.beginPath();
    for (const i of g.cells) {
      if (g.hex) {
        const [cx, cy] = this.cellCenter(i);
        hexPath(ctx, cx, cy, t * 0.5 + pad, t * 0.18, true);
        continue;
      }
      const x = this.ox + g.x(i) * t - pad;
      const y = this.oy + g.y(i) * t - pad;
      const s = t + pad * 2;
      const r = t * 0.3;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + s, y, x + s, y + s, r);
      ctx.arcTo(x + s, y + s, x, y + s, r);
      ctx.arcTo(x, y + s, x, y, r);
      ctx.arcTo(x, y, x + s, y, r);
      ctx.closePath();
    }
    ctx.save();
    ctx.shadowColor = P.bedShadow;
    ctx.shadowBlur = t * 0.5;
    ctx.shadowOffsetY = t * 0.12;
    ctx.fillStyle = P.bed;
    ctx.fill('nonzero');
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill('nonzero');
    this.bed = c;
  }

  /**
   * Joined-edge levels sit on a lilac tray that also holds the ghost strips,
   * with a dotted line marking the edges that lead to the other side.
   */
  protected renderWrapBed(ctx: CanvasRenderingContext2D) {
    const g = this.board!.grid;
    const t = this.tile;
    const m = this.ghost * t;
    const pad = t * 0.1;
    const x = this.ox - m - pad;
    const y = this.oy - m - pad;
    const w = g.width * t + (m + pad) * 2;
    const h = g.height * t + (m + pad) * 2;
    roundRectPath(ctx, x, y, w, h, t * 0.35);
    ctx.save();
    ctx.shadowColor = P.bedShadow;
    ctx.shadowBlur = t * 0.5;
    ctx.shadowOffsetY = t * 0.12;
    ctx.fillStyle = P.hardBed;
    ctx.fill();
    ctx.restore();
    roundRectPath(ctx, this.ox - t * 0.03, this.oy - t * 0.03, g.width * t + t * 0.06, g.height * t + t * 0.06, t * 0.18);
    ctx.setLineDash([t * 0.08, t * 0.1]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.hardEdge;
    ctx.lineWidth = Math.max(1.5, t * 0.035);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Faded copies of the tiles of the opposite edge, clipped to the strips
   * around the garden: a canal leaving through one edge visibly continues
   * into the tile it reaches on the other side.
   */
  protected drawGhosts() {
    const g = this.board!.grid;
    const ctx = this.ctx;
    const t = this.tile;
    const m = this.ghost * t;
    const W = g.width * t;
    const Hh = g.height * t;
    const strips: Array<{ clip: [number, number, number, number]; cells: number[]; dx: number; dy: number; fade: [number, number, number, number] }> = [];
    const col = (x: number) => g.cells.filter((i) => g.x(i) === x);
    const row = (y: number) => g.cells.filter((i) => g.y(i) === y);
    const gap = t * (0.5 - G.half);
    // Left strip shows the last column, right strip the first one, and so on.
    strips.push({ clip: [this.ox - m - gap, this.oy - t * 0.1, m, Hh + t * 0.2], cells: col(g.width - 1), dx: -W, dy: 0, fade: [this.ox - gap, 0, this.ox - m - gap, 0] });
    strips.push({ clip: [this.ox + W + gap, this.oy - t * 0.1, m, Hh + t * 0.2], cells: col(0), dx: W, dy: 0, fade: [this.ox + W + gap, 0, this.ox + W + m + gap, 0] });
    strips.push({ clip: [this.ox - t * 0.1, this.oy - m - gap, W + t * 0.2, m], cells: row(g.height - 1), dx: 0, dy: -Hh, fade: [0, this.oy - gap, 0, this.oy - m - gap] });
    strips.push({ clip: [this.ox - t * 0.1, this.oy + Hh + gap, W + t * 0.2, m], cells: row(0), dx: 0, dy: Hh, fade: [0, this.oy + Hh + gap, 0, this.oy + Hh + m + gap] });
    for (const strip of strips) {
      const [cx, cy, cw, ch] = strip.clip;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, cw, ch);
      ctx.clip();
      ctx.globalAlpha = 0.6;
      for (const i of strip.cells) this.drawCell(i, strip.dx, strip.dy);
      ctx.globalAlpha = 1;
      // Mist toward the outside of the strip.
      const [x0, y0, x1, y1] = strip.fade;
      const fade = ctx.createLinearGradient(x0, y0, x1, y1);
      fade.addColorStop(0, 'rgba(255,255,255,0)');
      fade.addColorStop(1, P.hardMist);
      ctx.fillStyle = fade;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.restore();
    }
  }

  protected settled(v: CellVis): boolean {
    return Math.abs(v.target - v.angle) < 0.06;
  }

  update(dt: number) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const now = this.time;
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= now);
      this.timers = this.timers.filter((t) => t.at > now);
      for (const t of due) t.fn();
    }
    this.particles.update(dt, now, this.boardBounds());

    const board = this.board;
    const an = this.analysis;
    if (!board || !an) return;
    const g = board.grid;

    const k = 320;
    const c = 2 * Math.sqrt(k) * 0.68;
    for (const i of g.cells) {
      const v = this.vis[i];
      const acc = k * (v.target - v.angle) - c * v.vel;
      v.vel += acc * dt;
      v.angle += v.vel * dt;
      if (Math.abs(v.target - v.angle) < 0.002 && Math.abs(v.vel) < 0.02) {
        v.angle = v.target;
        v.vel = 0;
      }
      const pressTarget = this.pressed === i ? 1 : 0;
      v.press += (pressTarget - v.press) * Math.min(1, dt * 20);
      v.lock += (this.lockTarget(i) - v.lock) * Math.min(1, dt * 10);
      v.loop += ((an.loopSides[i] ? 1 : 0) - v.loop) * Math.min(1, dt * 6);
      if (v.shake > 0) v.shake = Math.max(0, v.shake - dt * 3.5);
    }

    // Water runs from the spring, tile after tile.
    for (const i of an.order) {
      const v = this.vis[i];
      const settled = this.settled(v);
      let flowing = settled;
      if (flowing && i !== board.source) {
        const p = g.neighbor(i, an.inflow[i]);
        const pv = this.vis[p];
        flowing = pv.water >= 1 && this.settled(pv);
      }
      if (flowing) {
        const before = v.water;
        v.water = Math.min(1, v.water + dt * FILL_RATE);
        if (before < 1 && v.water >= 1 && !v.arrived) {
          v.arrived = true;
          this.events.onWaterArrive?.(i, an.dist[i]);
        }
        if (before === 0 && v.water > 0 && i !== board.source) this.sparkleIfTeleported(i, an.inflow[i]);
      } else if (!settled) {
        v.water = Math.max(0, v.water - dt * DRAIN_RATE * 2);
      }
    }
    for (const i of g.cells) {
      const v = this.vis[i];
      const watered = an.watered[i] === 1;
      if (!watered) v.water = Math.max(0, v.water - dt * DRAIN_RATE);
      if (v.water <= 0) v.arrived = false;
      if (watered && v.water >= 0.5) v.bloom = Math.min(1, v.bloom + dt * BLOOM_RATE);
      else if (!watered) v.bloom = Math.max(0, v.bloom - dt * WILT_RATE);
    }
  }

  /** Water entering tile i through a joined edge: a little sparkle on both sides. */
  protected sparkleIfTeleported(i: number, inflow: number) {
    const g = this.board!.grid;
    if (!g.wrap) return;
    const p = g.neighbor(i, inflow);
    if (p < 0 || Math.abs(g.x(i) - g.x(p)) + Math.abs(g.y(i) - g.y(p)) === 1) return;
    const t = this.tile;
    const [ix, iy] = this.facePos(i);
    const [px, py] = this.facePos(p);
    const out = opposite(inflow);
    this.particles.sparkle(ix + DX[inflow] * t * 0.5, iy + DY[inflow] * t * 0.5, 3, t * 0.15);
    this.particles.sparkle(px + DX[out] * t * 0.5, py + DY[out] * t * 0.5, 3, t * 0.15);
  }

  protected tileState(i: number): TileState {
    const board = this.board!;
    const an = this.analysis;
    const v = this.vis[i];
    const rot = board.rot[i];
    const n = this.sides;
    const inflow = an && an.inflow[i] >= 0 ? (an.inflow[i] - rot + n) % n : -1;
    return {
      mask: board.base[i],
      decor: v.decor,
      isSource: i === board.source,
      bloom: v.bloom,
      water: v.water,
      inflow,
      loop: v.loop < 0.01 ? 0 : v.loop,
      rot,
      sides: n,
    };
  }

  protected cached(i: number, wet: boolean, fg = false): HTMLCanvasElement {
    const v = this.vis[i];
    const rot = this.board!.rot[i];
    const key: CacheKey = fg ? (wet ? 'wetFg' : 'dryFg') : wet ? 'wet' : 'dry';
    const existing = v.cache[key];
    if (existing && v.cacheRot[key] === rot) return existing;
    // The cached image has a margin so tall props can rise above the tile.
    const span = 1 + TILE_OVERFLOW * 2;
    const px = Math.ceil(this.tile * this.dpr * span);
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(px / span, 0, 0, px / span, px / 2, px / 2);
    const st = { ...this.tileState(i), bloom: wet ? 1 : 0, water: wet ? 1 : 0, loop: 0 };
    if (fg) drawTileProps(ctx, st);
    else drawTile(ctx, st);
    v.cache[key] = c;
    v.cacheRot[key] = rot;
    return c;
  }

  draw() {
    const ctx = this.ctx;
    // Start every frame from a clean state, so one unbalanced save() in a
    // drawing can never pile up clips frame after frame.
    (ctx as CanvasRenderingContext2D & { reset?: () => void }).reset?.();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (this.bg) ctx.drawImage(this.bg, 0, 0, this.width, this.height);
    else ctx.clearRect(0, 0, this.width, this.height);

    const board = this.board;
    if (board) {
      if (this.bed) ctx.drawImage(this.bed, 0, 0, this.width, this.height);
      if (board.grid.wrap) this.drawGhosts();
      for (const i of this.order) this.drawShadow(i);
      for (const i of this.order) this.drawCell(i);
      this.drawBridges();
      for (const i of this.order) this.drawCellProps(i);
      for (const i of this.order) this.drawCellOverlay(i);
      this.drawSpotlight();
    }
    this.particles.draw(ctx, this.time);
  }

  protected cellScale(v: CellVis): number {
    const off = Math.abs(v.target - v.angle);
    const pop = clamp01((this.time - v.popAt) / 0.45);
    const popBump = pop > 0 && pop < 1 ? Math.sin(Math.PI * pop) * 0.12 : 0;
    return 1 - 0.07 * Math.min(1, off * 1.8) - 0.02 * v.press + popBump;
  }

  /** Where the top face of a tile is drawn: lifted by half its depth, pushed down when pressed. */
  protected facePos(i: number, dx = 0, dy = 0): [number, number] {
    const v = this.vis[i];
    const [cx, cy] = this.cellCenter(i);
    const depth = G.depth * this.tile * this.cellScale(v);
    const shakeX = v.shake > 0 ? Math.sin(this.time * 55) * v.shake * this.tile * 0.07 : 0;
    return [cx + shakeX + dx, cy - depth / 2 + depth * 0.65 * v.press + dy];
  }

  protected drawShadow(i: number) {
    const sprite = this.shadowSprite;
    if (!sprite) return;
    const ctx = this.ctx;
    const v = this.vis[i];
    const [cx, cy] = this.cellCenter(i);
    const t = this.tile * this.cellScale(v);
    const s = t * 1.5;
    ctx.save();
    ctx.translate(cx, cy + G.depth * t * 0.5 + t * 0.035 * (1 - v.press * 0.6));
    ctx.rotate(v.angle * this.step);
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  /** Draw tile i (side, face, gloss), optionally shifted (ghost copies on joined-edge levels). */
  protected drawCell(i: number, dx = 0, dy = 0) {
    const ctx = this.ctx;
    const v = this.vis[i];
    const cy = this.cellCenter(i)[1] + dy;
    const scale = this.cellScale(v);
    const t = this.tile * scale;
    const angle = v.angle * this.step;
    const [fx, fy] = this.facePos(i, dx, dy);
    const depth = G.depth * t;

    // Side of the tile: two copies of the face outline, below it, in the side colour.
    // It stays at the bottom on screen while the face spins.
    const side = mixColor(P.soilSide, P.grassSide, v.bloom);
    const sideDark = mixColor(P.soilSideDark, P.grassSideDark, v.bloom);
    for (const [dy, color] of [
      [depth / 2, sideDark],
      [0, side],
    ] as const) {
      ctx.save();
      ctx.translate(fx, cy + dy);
      ctx.rotate(angle);
      ctx.scale(t, t);
      facePath(ctx, this.sides);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    // Top face.
    const st = this.tileState(i);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle);
    ctx.scale(t, t);
    const o = 0.5 + TILE_OVERFLOW;
    if (st.loop === 0 && st.bloom === 0 && st.water === 0) {
      ctx.drawImage(this.cached(i, false), -o, -o, o * 2, o * 2);
    } else if (st.loop === 0 && st.bloom >= 1 && st.water >= 1) {
      ctx.drawImage(this.cached(i, true), -o, -o, o * 2, o * 2);
    } else {
      drawTile(ctx, st);
    }
    drawTileWater(ctx, st, this.time);
    ctx.restore();

    // Gloss stays lit from above, so it fades out while the face is turning.
    const gloss = this.glossSprite;
    const glossAlpha = 1 - Math.min(1, Math.abs(v.target - v.angle) * 5);
    if (gloss && glossAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = glossAlpha;
      this.clipCanalsOut(i, fx, fy, t);
      const s = t * SPRITE_SPAN;
      ctx.drawImage(gloss, fx - s / 2, fy - s / 2, s, s);
      ctx.restore();
    }
  }

  /**
   * The light outline of a tile and the shade at its bottom stay off the
   * canals running out of it: they flow over its edge, banks and water alike,
   * in the colours of the canal between the tiles.
   */
  protected clipCanalsOut(i: number, fx: number, fy: number, t: number) {
    const mask = this.board?.mask(i) ?? 0;
    const ctx = this.ctx;
    const w = ((G.rimW + 0.04) * t) / 2;
    const edge = G.half * t;
    let any = false;
    ctx.beginPath();
    ctx.rect(fx - t, fy - t, t * 2, t * 2);
    for (let d = 0; d < this.sides; d++) {
      if (!(mask & (1 << d))) continue;
      const [ux, uy] = this.vecs[d];
      // The shade covers more of the bottom of the tile than the outline does of its top and sides.
      const from = edge - (uy > 0.3 ? 0.26 : 0.16) * t;
      const to = edge + 0.05 * t;
      const nx = -uy;
      const ny = ux;
      ctx.moveTo(fx + ux * from + nx * w, fy + uy * from + ny * w);
      ctx.lineTo(fx + ux * to + nx * w, fy + uy * to + ny * w);
      ctx.lineTo(fx + ux * to - nx * w, fy + uy * to - ny * w);
      ctx.lineTo(fx + ux * from - nx * w, fy + uy * from - ny * w);
      ctx.closePath();
      any = true;
    }
    if (any) ctx.clip('evenodd');
  }

  /** Tutorial focus: the rest of the garden is dimmed, the tile pulses and an arrow points at it. */
  protected drawSpotlight() {
    const s = this.spotlight;
    if (!s || !this.board) return;
    const ctx = this.ctx;
    const t = this.tile;
    let [cx, cy] = this.facePos(s.cell);
    // The tile with its side, or the visible part of its copy in the strip below the garden.
    const half = t * 0.56;
    let [x0, y0, w, h] = [cx - half, cy - half, half * 2, half * 2 + G.depth * t];
    if (s.ghost) {
      const top = this.oy + this.board.grid.height * t + t * (0.5 - G.half);
      [x0, y0, w, h] = [cx - t * 0.5, top - t * 0.06, t, this.ghost * t + t * 0.12];
      cy = y0 + h / 2;
    }
    ctx.save();
    ctx.fillStyle = 'rgba(70, 45, 70, 0.32)';
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    roundRectPath(ctx, x0, y0, w, h, t * 0.2, true);
    ctx.fill('evenodd');

    // Pulse around the tile.
    const pulse = (this.time * 0.9) % 1;
    const grow = pulse * t * 0.22;
    ctx.globalAlpha = 1 - pulse;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, t * 0.04);
    roundRectPath(ctx, x0 - grow, y0 - grow, w + grow * 2, h + grow * 2, t * 0.22);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (s.kind === 'hold') {
      // A ring that fills up: keep the finger down.
      const p = (this.time * 0.6) % 1;
      ctx.strokeStyle = P.lockRing;
      ctx.lineWidth = Math.max(3, t * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, t * 0.38, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
    }

    // Bouncing arrow above the tile (below the strip, pointing up, for a copy).
    const bob = Math.sin(this.time * 5) * t * 0.06;
    const ay = s.ghost ? y0 + h + t * 0.12 - bob : y0 - t * 0.12 + bob;
    const aw = t * 0.18;
    const k = s.ghost ? -1 : 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(120, 70, 110, 0.4)';
    ctx.shadowBlur = t * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, ay);
    ctx.lineTo(cx - aw, ay - aw * k);
    ctx.lineTo(cx - aw * 0.4, ay - aw * k);
    ctx.lineTo(cx - aw * 0.4, ay - aw * 2 * k);
    ctx.lineTo(cx + aw * 0.4, ay - aw * 2 * k);
    ctx.lineTo(cx + aw * 0.4, ay - aw * k);
    ctx.lineTo(cx + aw, ay - aw * k);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Foreground layer of a tile: its props, above every tile and canal. */
  protected drawCellProps(i: number) {
    const st = this.tileState(i);
    const statics = hasForeground(st);
    const critters = hasCritters(st);
    if (!statics && !critters) return;
    const ctx = this.ctx;
    const v = this.vis[i];
    const t = this.tile * this.cellScale(v);
    const [fx, fy] = this.facePos(i);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(v.angle * this.step);
    ctx.scale(t, t);
    if (statics) {
      const o = 0.5 + TILE_OVERFLOW;
      if (st.loop === 0 && st.bloom === 0 && st.water === 0) {
        ctx.drawImage(this.cached(i, false, true), -o, -o, o * 2, o * 2);
      } else if (st.loop === 0 && st.bloom >= 1 && st.water >= 1) {
        ctx.drawImage(this.cached(i, true, true), -o, -o, o * 2, o * 2);
      } else {
        drawTileProps(ctx, st);
      }
    }
    if (critters) drawTileCritters(ctx, st, this.time);
    ctx.restore();
  }

  /** Short canal pieces bridging the gap between two joined, resting tiles. */
  protected drawBridges() {
    const board = this.board!;
    const an = this.analysis;
    if (!an) return;
    const g = board.grid;
    const ctx = this.ctx;
    const t = this.tile;
    const edge = G.half * t;
    // Each shared side once: E and S on squares, NE, SE and S on hexagons.
    const half = this.sides / 2;
    for (const i of g.cells) {
      const vi = this.vis[i];
      for (let d = 1; d <= half; d++) {
        if (!(an.linked[i] & (1 << d))) continue;
        const j = g.neighbor(i, d);
        const vj = this.vis[j];
        if (Math.abs(this.cellScale(vi) - 1) > 0.01 || Math.abs(this.cellScale(vj) - 1) > 0.01) continue;
        if (vi.shake > 0 || vj.shake > 0 || vi.press > 0.02 || vj.press > 0.02) continue;
        // A joined edge gets a bridge on both sides: into the ghost strip, and out of it.
        const wrapped = g.wrap && Math.abs(g.x(i) - g.x(j)) + Math.abs(g.y(i) - g.y(j)) !== 1;
        const [fx, fy] = this.facePos(i);
        const spots: Array<[number, number]> = [[fx, fy]];
        if (wrapped) spots.push(d === 1 ? [fx - g.width * t, fy] : [fx, fy - g.height * t]);
        const wet =
          (an.inflow[j] === g.opposite(d) && vj.water > 0.02) ||
          (an.inflow[i] === d && vi.water > 0.02) ||
          (vi.water >= 1 && vj.water >= 1);
        const loop = an.loopSides[i] & (1 << d) ? Math.max(vi.loop, vj.loop) : 0;
        const banks: Array<[number, string]> = [
          [G.rimW + 0.04, P.rimShade],
          [G.rimW, P.rim],
          [G.grooveW, P.grooveDeep],
          [G.grooveW - 0.05, P.groove],
        ];
        const waterLayers: Array<[number, string]> = wet
          ? [
              [G.waterW, loop > 0 ? mixColor(P.waterDeep, P.loop, loop * 0.75) : P.waterDeep],
              [G.waterW - 0.045, loop > 0 ? mixColor(P.water, P.loop, loop * 0.75) : P.water],
            ]
          : [];
        // From one tile's edge to the other's, a little over both so the canal covers their outlines.
        const over = 1.5;
        const len = t - edge * 2 + over * 2;
        const [ux, uy] = this.vecs[d];
        const angle = Math.atan2(uy, ux);
        // Drawn as one picture: layers stacked straight on the board would each
        // soften their own ends, leaving a thin seam across the canal.
        const sprite = this.bridgeSprite([...banks, ...waterLayers], len);
        const h = (G.rimW + 0.04) * t;
        for (const [cx, cy] of spots) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.drawImage(sprite, edge - over, -h / 2, len, h);
          ctx.restore();
        }
      }
    }
  }

  /** Bridge picture for these layers (outer bank first), cached while colours and size stay the same. */
  protected bridgeSprite(layers: Array<[number, string]>, len: number): HTMLCanvasElement {
    const t = this.tile;
    const key = `${t}:${this.dpr}:${layers.map((l) => l[1]).join()}`;
    const hit = this.bridgeSprites.get(key);
    if (hit) return hit;
    if (this.bridgeSprites.size > 8) this.bridgeSprites.clear();
    const h = (G.rimW + 0.04) * t;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(len * this.dpr));
    c.height = Math.max(1, Math.round(h * this.dpr));
    const g = c.getContext('2d')!;
    g.scale(c.width / len, c.height / h);
    for (const [w, color] of layers) {
      g.fillStyle = color;
      g.fillRect(0, (h - w * t) / 2, len, w * t);
    }
    this.bridgeSprites.set(key, c);
    return c;
  }

  protected drawCellOverlay(i: number) {
    const ctx = this.ctx;
    const v = this.vis[i];
    const board = this.board!;
    const [cx, cy] = this.facePos(i);
    const t = this.tile * this.cellScale(v);
    const H = G.half;
    const sides = this.sides;
    const hex = sides === 6;

    if (v.loop > 0.02) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(t, t);
      ctx.globalAlpha = v.loop * (0.3 + 0.2 * Math.sin(this.time * 4));
      facePath(ctx, sides, 0.02);
      ctx.strokeStyle = P.loop;
      ctx.lineWidth = 0.035;
      ctx.stroke();
      ctx.restore();
    }

    if (this.lockMode && !board.locked[i]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(t, t);
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.time * 3);
      facePath(ctx, sides, 0.04, hex ? undefined : G.corner * 0.8);
      ctx.setLineDash([0.06, 0.06]);
      ctx.strokeStyle = P.lockRing;
      ctx.lineWidth = 0.025;
      ctx.stroke();
      ctx.restore();
    }

    if (v.lock > 0.01) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(t, t);
      ctx.globalAlpha = Math.min(1, v.lock * 1.2);
      facePath(ctx, sides, 0.025, hex ? undefined : G.corner * 0.85);
      ctx.strokeStyle = P.lockRing;
      ctx.lineWidth = 0.045;
      ctx.stroke();
      const r = 0.12 * easeOutBack(clamp01(v.lock));
      if (r > 0) {
        // In the top right corner; on a hexagon, toward its upper right corner.
        if (hex) ctx.translate(0.2, -0.33);
        else ctx.translate(H - 0.11, -H + 0.11);
        ctx.shadowColor = 'rgba(140, 100, 170, 0.35)';
        ctx.shadowBlur = this.tile * 0.08;
        ctx.fillStyle = P.lockBadge;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        const s = r / 0.12;
        ctx.scale(s, s);
        ctx.fillStyle = P.lockIcon;
        roundRectPath(ctx, -0.05, -0.012, 0.1, 0.072, 0.018);
        ctx.fill();
        ctx.strokeStyle = P.lockIcon;
        ctx.lineWidth = 0.019;
        ctx.beginPath();
        ctx.arc(0, -0.014, 0.029, Math.PI, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    const hold = this.hold;
    if (hold && hold.cell === i) {
      const elapsed = performance.now() / 1000 - hold.start;
      if (elapsed > HOLD_VISIBLE_AFTER) {
        const p = clamp01((elapsed - HOLD_VISIBLE_AFTER) / (hold.duration - HOLD_VISIBLE_AFTER));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = P.lockRing;
        ctx.lineWidth = Math.max(2.5, this.tile * 0.06);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, this.tile * 0.38, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Zoom, pan and the victory turn around the garden: only the 3D garden has them.
  canDrag(_lockMode: boolean): boolean {
    return false;
  }
  zoomAt(_x: number, _y: number, _factor: number) {}
  drag(_dx: number, _dy: number) {}
  dragEnd() {}
  panBy(_dx: number, _dy: number) {}
  startShowcase() {}
  setShowcaseSpace(_space: { top: number; bottom: number } | null) {}

  /**
   * True while something more than the ambient shimmer is animating; the
   * main loop drops to a lower frame rate otherwise, to spare the battery.
   */
  isBusy(): boolean {
    if (this.timers.length || this.hold || this.spotlight || this.pressed >= 0 || this.particles.hasEffects()) return true;
    if (!this.board) return false;
    for (const i of this.board.grid.cells) {
      const v = this.vis[i];
      if (v.angle !== v.target || v.press > 0.01 || v.shake > 0) return true;
      if ((v.water > 0 && v.water < 1) || (v.bloom > 0 && v.bloom < 1)) return true;
      if (Math.abs(v.lock - this.lockTarget(i)) > 0.01) return true;
      if (this.time - v.popAt < 0.5) return true;
    }
    return false;
  }

  /** 1 while tile i shows its padlock. */
  protected lockTarget(i: number): number {
    return this.showLocks && this.board!.locked[i] ? 1 : 0;
  }

  /** True once water has reached every tile and all rotations are finished. */
  waterComplete(): boolean {
    if (!this.board) return false;
    return this.board.grid.cells.every((i) => this.vis[i].water >= 1 && this.settled(this.vis[i]));
  }

  /** Progress (0..1) of water + blooming over the whole garden. */
  bloomProgress(): number {
    if (!this.board) return 0;
    let sum = 0;
    for (const i of this.board.grid.cells) sum += this.vis[i].bloom;
    return sum / this.board.grid.cells.length;
  }
}
