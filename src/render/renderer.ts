/**
 * Canvas renderer for the garden. Owns the per-tile animation state
 * (rotation spring, water flow, blooming) and draws everything each frame.
 *
 * Water physically travels: a tile only starts filling once the tile it
 * drinks from is full and both have stopped rotating, so water visibly runs
 * from the spring along the canals. Grass and flowers follow the water.
 */
import { Analysis, Board } from '../core/board';
import { opposite } from '../core/grid';
import { Particles } from './particles';
import { renderBackground } from './background';
import { Decor, G, makeDecor } from './decor';
import { clamp01, easeOutBack } from './easing';
import { mixColor, P } from './palette';
import { drawTile, drawTileOverlay, roundRectPath, TileState } from './tileArt';

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
  dry: HTMLCanvasElement | null;
  wet: HTMLCanvasElement | null;
  /** Rotation each cached image was drawn for (plants are drawn upright). */
  dryRot: number;
  wetRot: number;
}

export interface RendererEvents {
  /** Water just filled a tile (used for the little melody). */
  onWaterArrive?: (cell: number, dist: number) => void;
}

const FILL_RATE = 6.5;
const DRAIN_RATE = 5;
const BLOOM_RATE = 1.05;
const WILT_RATE = 1.6;
const HOLD_VISIBLE_AFTER = 0.12;

export class GardenRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  width = 0;
  height = 0;
  insets = { top: 84, bottom: 104, side: 14 };
  maxTile = 96;

  private board: Board | null = null;
  private analysis: Analysis | null = null;
  private vis: CellVis[] = [];
  private tile = 40;
  private ox = 0;
  private oy = 0;
  private bg: HTMLCanvasElement | null = null;
  private bed: HTMLCanvasElement | null = null;
  /** Soft shadow under a tile and glossy light on its face, shared by all tiles. */
  private shadowSprite: HTMLCanvasElement | null = null;
  private glossSprite: HTMLCanvasElement | null = null;
  private timers: Array<{ at: number; fn: () => void }> = [];
  private pressed = -1;

  readonly particles = new Particles();
  events: RendererEvents = {};
  time = 0;
  lockMode = false;
  hold: { cell: number; start: number; duration: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
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
    this.analysis = null;
    this.timers = [];
    this.particles.clearEffects();
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
        decor: makeDecor(active ? board.base[i] : 0, `${decorSeed}:${i}`, i === board.source),
        dry: null,
        wet: null,
        dryRot: -1,
        wetRot: -1,
      });
    }
    this.layout();
  }

  setAnalysis(analysis: Analysis) {
    this.analysis = analysis;
  }

  /** Animate a rotation of `dir` quarter turns. */
  rotate(cell: number, dir: number) {
    this.vis[cell].target += dir;
  }

  /** Bring the visual rotation in line with the board (after reset / restore). */
  syncRotations() {
    if (!this.board) return;
    for (const i of this.board.grid.cells) {
      const v = this.vis[i];
      const delta = (((this.board.rot[i] - v.target) % 4) + 4) % 4;
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
    const gx = Math.floor((x - this.ox) / this.tile);
    const gy = Math.floor((y - this.oy) / this.tile);
    if (gx < 0 || gy < 0 || gx >= g.width || gy >= g.height) return -1;
    const i = g.index(gx, gy);
    return g.active[i] ? i : -1;
  }

  cellCenter(i: number): [number, number] {
    const g = this.board!.grid;
    return [this.ox + (g.x(i) + 0.5) * this.tile, this.oy + (g.y(i) + 0.5) * this.tile];
  }

  boardBounds() {
    const g = this.board?.grid;
    if (!g) return { x: 0, y: 0, w: this.width, h: this.height };
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
    this.after(last * 0.5 + 0.4, () => {
      const b = this.boardBounds();
      this.particles.butterfly(-20, b.y + b.h * 0.3, b);
      this.particles.butterfly(this.width + 20, b.y + b.h * 0.7, b);
    });
    this.after(last + 0.7, onDone);
  }

  private layout() {
    if (!this.board || !this.width) return;
    const g = this.board.grid;
    const availW = this.width - this.insets.side * 2;
    const availH = this.height - this.insets.top - this.insets.bottom;
    this.tile = Math.max(12, Math.floor(Math.min(availW / g.width, availH / g.height, this.maxTile)));
    this.ox = Math.round((this.width - this.tile * g.width) / 2);
    this.oy = Math.round(this.insets.top + (availH - this.tile * g.height) / 2);
    for (const v of this.vis) {
      v.dry = null;
      v.wet = null;
    }
    this.renderBed();
    this.renderSprites();
  }

  private renderSprites() {
    const t = this.tile;
    const H = G.half;

    // Shadow: only the blurred shadow of a shape drawn off-canvas is kept.
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
    roundRectPath(sctx, -H, -H, H * 2, H * 2, G.corner);
    sctx.fillStyle = '#000';
    sctx.fill();
    this.shadowSprite = sh;

    // Gloss: light along the top of the face, a hint of shade at the bottom.
    const px = Math.ceil(t * this.dpr);
    const gl = document.createElement('canvas');
    gl.width = px;
    gl.height = px;
    const gctx = gl.getContext('2d')!;
    gctx.setTransform(px, 0, 0, px, px / 2, px / 2);
    roundRectPath(gctx, -H, -H, H * 2, H * 2, G.corner);
    const shade = gctx.createLinearGradient(0, -H, 0, H);
    shade.addColorStop(0, 'rgba(255,255,255,0.22)');
    shade.addColorStop(0.1, 'rgba(255,255,255,0)');
    shade.addColorStop(0.8, 'rgba(120,60,90,0)');
    shade.addColorStop(1, 'rgba(120,60,90,0.08)');
    gctx.fillStyle = shade;
    gctx.fill();
    roundRectPath(gctx, -H + 0.012, -H + 0.012, (H - 0.012) * 2, (H - 0.012) * 2, G.corner - 0.01);
    const rim = gctx.createLinearGradient(0, -H, 0, H);
    rim.addColorStop(0, 'rgba(255,255,255,0.9)');
    rim.addColorStop(0.35, 'rgba(255,255,255,0)');
    gctx.strokeStyle = rim;
    gctx.lineWidth = 0.022;
    gctx.stroke();
    this.glossSprite = gl;
  }

  /** Soft white garden bed following the shape of the grid. */
  private renderBed() {
    const board = this.board!;
    const g = board.grid;
    const c = document.createElement('canvas');
    c.width = Math.round(this.width * this.dpr);
    c.height = Math.round(this.height * this.dpr);
    const ctx = c.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);
    const t = this.tile;
    const pad = t * 0.1;
    ctx.beginPath();
    for (const i of g.cells) {
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

  private settled(v: CellVis): boolean {
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
      v.lock += ((board.locked[i] ? 1 : 0) - v.lock) * Math.min(1, dt * 10);
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

  private tileState(i: number): TileState {
    const board = this.board!;
    const an = this.analysis;
    const v = this.vis[i];
    const rot = board.rot[i];
    const inflow = an && an.inflow[i] >= 0 ? (an.inflow[i] - rot + 4) & 3 : -1;
    return {
      mask: board.base[i],
      decor: v.decor,
      isSource: i === board.source,
      bloom: v.bloom,
      water: v.water,
      inflow,
      loop: v.loop < 0.01 ? 0 : v.loop,
      rot,
    };
  }

  private cached(i: number, wet: boolean): HTMLCanvasElement {
    const v = this.vis[i];
    const rot = this.board!.rot[i];
    const existing = wet ? v.wet : v.dry;
    if (existing && (wet ? v.wetRot : v.dryRot) === rot) return existing;
    const px = Math.ceil(this.tile * this.dpr);
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(px, 0, 0, px, px / 2, px / 2);
    drawTile(ctx, { ...this.tileState(i), bloom: wet ? 1 : 0, water: wet ? 1 : 0, loop: 0 });
    if (wet) {
      v.wet = c;
      v.wetRot = rot;
    } else {
      v.dry = c;
      v.dryRot = rot;
    }
    return c;
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (this.bg) ctx.drawImage(this.bg, 0, 0, this.width, this.height);
    else ctx.clearRect(0, 0, this.width, this.height);

    const board = this.board;
    if (board) {
      if (this.bed) ctx.drawImage(this.bed, 0, 0, this.width, this.height);
      for (const i of board.grid.cells) this.drawShadow(i);
      for (const i of board.grid.cells) this.drawCell(i);
      this.drawBridges();
      for (const i of board.grid.cells) this.drawCellOverlay(i);
    }
    this.particles.draw(ctx, this.time);
  }

  private cellScale(v: CellVis): number {
    const off = Math.abs(v.target - v.angle);
    const pop = clamp01((this.time - v.popAt) / 0.45);
    const popBump = pop > 0 && pop < 1 ? Math.sin(Math.PI * pop) * 0.12 : 0;
    return 1 - 0.07 * Math.min(1, off * 1.8) - 0.02 * v.press + popBump;
  }

  /** Where the top face of a tile is drawn: lifted by half its depth, pushed down when pressed. */
  private facePos(i: number): [number, number] {
    const v = this.vis[i];
    const [cx, cy] = this.cellCenter(i);
    const depth = G.depth * this.tile * this.cellScale(v);
    const shakeX = v.shake > 0 ? Math.sin(this.time * 55) * v.shake * this.tile * 0.07 : 0;
    return [cx + shakeX, cy - depth / 2 + depth * 0.65 * v.press];
  }

  private drawShadow(i: number) {
    const sprite = this.shadowSprite;
    if (!sprite) return;
    const ctx = this.ctx;
    const v = this.vis[i];
    const [cx, cy] = this.cellCenter(i);
    const t = this.tile * this.cellScale(v);
    const s = t * 1.5;
    ctx.save();
    ctx.translate(cx, cy + G.depth * t * 0.5 + t * 0.035 * (1 - v.press * 0.6));
    ctx.rotate((v.angle * Math.PI) / 2);
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  private drawCell(i: number) {
    const ctx = this.ctx;
    const v = this.vis[i];
    const cy = this.cellCenter(i)[1];
    const scale = this.cellScale(v);
    const t = this.tile * scale;
    const angle = (v.angle * Math.PI) / 2;
    const [fx, fy] = this.facePos(i);
    const H = G.half;
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
      roundRectPath(ctx, -H, -H, H * 2, H * 2, G.corner);
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
    if (st.loop === 0 && st.bloom === 0 && st.water === 0) {
      ctx.drawImage(this.cached(i, false), -0.5, -0.5, 1, 1);
    } else if (st.loop === 0 && st.bloom >= 1 && st.water >= 1) {
      ctx.drawImage(this.cached(i, true), -0.5, -0.5, 1, 1);
    } else {
      drawTile(ctx, st);
    }
    drawTileOverlay(ctx, st, this.time);
    ctx.restore();

    // Gloss stays lit from above, so it fades out while the face is turning.
    const gloss = this.glossSprite;
    const glossAlpha = 1 - Math.min(1, Math.abs(v.target - v.angle) * 5);
    if (gloss && glossAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = glossAlpha;
      ctx.drawImage(gloss, fx - t / 2, fy - t / 2, t, t);
      ctx.restore();
    }
  }

  /** Short canal pieces bridging the gap between two joined, resting tiles. */
  private drawBridges() {
    const board = this.board!;
    const an = this.analysis;
    if (!an) return;
    const g = board.grid;
    const ctx = this.ctx;
    const t = this.tile;
    const edge = G.half * t;
    for (const i of g.cells) {
      const vi = this.vis[i];
      for (const d of [1, 2]) {
        if (!(an.linked[i] & (1 << d))) continue;
        const j = g.neighbor(i, d);
        const vj = this.vis[j];
        if (Math.abs(g.x(i) - g.x(j)) + Math.abs(g.y(i) - g.y(j)) !== 1) continue; // wrapped edge
        if (Math.abs(this.cellScale(vi) - 1) > 0.01 || Math.abs(this.cellScale(vj) - 1) > 0.01) continue;
        if (vi.shake > 0 || vj.shake > 0 || vi.press > 0.02 || vj.press > 0.02) continue;
        const [cx, cy] = this.facePos(i);
        const wet =
          (an.inflow[j] === opposite(d) && vj.water > 0.02) ||
          (an.inflow[i] === d && vi.water > 0.02) ||
          (vi.water >= 1 && vj.water >= 1);
        const loop = an.loopSides[i] & (1 << d) ? Math.max(vi.loop, vj.loop) : 0;
        const layers: Array<[number, string]> = [
          [G.rimW + 0.04, P.rimShade],
          [G.rimW, P.rim],
          [G.grooveW, P.grooveDeep],
          [G.grooveW - 0.05, P.groove],
        ];
        if (wet) {
          layers.push([G.waterW, loop > 0 ? mixColor(P.waterDeep, P.loop, loop * 0.75) : P.waterDeep]);
          layers.push([G.waterW - 0.045, loop > 0 ? mixColor(P.water, P.loop, loop * 0.75) : P.water]);
        }
        const len = t - edge * 2 + 2;
        for (const [w, color] of layers) {
          ctx.fillStyle = color;
          if (d === 1) ctx.fillRect(cx + edge - 1, cy - (w * t) / 2, len, w * t);
          else ctx.fillRect(cx - (w * t) / 2, cy + edge - 1, w * t, len);
        }
        if (d === 2) {
          // The part running down the front of the upper tile is in the shade.
          const w = (G.rimW + 0.04) * t;
          ctx.fillStyle = 'rgba(150, 80, 60, 0.16)';
          ctx.fillRect(cx - w / 2, cy + edge, w, G.depth * t);
        }
      }
    }
  }

  private drawCellOverlay(i: number) {
    const ctx = this.ctx;
    const v = this.vis[i];
    const board = this.board!;
    const [cx, cy] = this.facePos(i);
    const t = this.tile * this.cellScale(v);
    const H = G.half;

    if (v.loop > 0.02) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(t, t);
      ctx.globalAlpha = v.loop * (0.3 + 0.2 * Math.sin(this.time * 4));
      roundRectPath(ctx, -H + 0.02, -H + 0.02, (H - 0.02) * 2, (H - 0.02) * 2, G.corner);
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
      roundRectPath(ctx, -H + 0.04, -H + 0.04, (H - 0.04) * 2, (H - 0.04) * 2, G.corner * 0.8);
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
      roundRectPath(ctx, -H + 0.025, -H + 0.025, (H - 0.025) * 2, (H - 0.025) * 2, G.corner * 0.85);
      ctx.strokeStyle = P.lockRing;
      ctx.lineWidth = 0.045;
      ctx.stroke();
      const r = 0.12 * easeOutBack(clamp01(v.lock));
      if (r > 0) {
        ctx.translate(H - 0.11, -H + 0.11);
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

  /**
   * True while something more than the ambient shimmer is animating; the
   * main loop drops to a lower frame rate otherwise, to spare the battery.
   */
  isBusy(): boolean {
    if (this.timers.length || this.hold || this.pressed >= 0 || this.particles.hasEffects()) return true;
    if (!this.board) return false;
    for (const i of this.board.grid.cells) {
      const v = this.vis[i];
      if (v.angle !== v.target || v.press > 0.01 || v.shake > 0) return true;
      if ((v.water > 0 && v.water < 1) || (v.bloom > 0 && v.bloom < 1)) return true;
      if (Math.abs(v.lock - this.board.locked[i]) > 0.01) return true;
      if (this.time - v.popAt < 0.5) return true;
    }
    return false;
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
