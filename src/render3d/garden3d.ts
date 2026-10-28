/**
 * The garden in real 3D (three.js): modelled tiles under a sun, seen through a
 * perspective camera. Animation (springs, water running tile after tile,
 * growth) is the 2D renderer's: this class only replaces how it is drawn.
 *
 * The WebGL picture is drawn into the 2D canvas, between the style's sky and
 * the 2D overlays (particles, tutorial spotlight, hold ring).
 */
import * as THREE from 'three';
import { Board } from '../core/board';
import { E, Grid, N, S, W, dirVecs, popcount } from '../core/grid';
import { Rng } from '../core/rng';
import { clamp01, easeOutBack } from '../render/easing';
import { mixColor, P } from '../render/palette';
import { GardenRenderer } from '../render/renderer';
import { roundRectPath } from '../render/tileArt';
import { makeDecor, type PropInstance } from '../render/decor';
import { color, PAL, partsDepthMaterial, partsMaterial, solid, TileUniforms, tileUniforms, turfMaterial, updatePalette, waterMaterial } from './materials';
import { bedModel, bodyModel, canalModel, M, outlineBand, PartsBuilder, PRIM, trayModel } from './models';
import { badgeTexture, flatArt, uprightArt } from './sprites';
import { currentTheme, withTheme } from '../render/themes';
import type { ThemeId } from '../render/themes/types';
import { Kit, type Model } from './props/kit';
import { STYLE_MODELS } from './props';

/** Size of a modelled prop's unit, from its footprint radius (upright props stand a little larger). */
const MODEL_SCALE = { ground: 1.2, upright: 1.6 } as const;
/** Animated in 2D, but standing on the ground: they move in their own way (or not at all). */
const STANDING = new Set(['windmill', 'tiered-fountain', 'city-fountain', 'geyser']);

/** The 3D model of a prop in the current style, if it has one. */
function modelOf(p: PropInstance): Model | undefined {
  return STYLE_MODELS[currentTheme().id]?.[p.def.id];
}

/** Camera: field of view, and its height above the horizon as seen from the garden. */
const FOV = 30;
const ELEVATION = (58 * Math.PI) / 180;
const HOLD_VISIBLE_AFTER = 0.12;
/** Victory turn: lower camera, seconds to get there, turning speed (radians a second). */
const SHOW_ELEVATION = (30 * Math.PI) / 180;
const SHOW_TRANSITION = 1.8;
const SHOW_SPEED = 0.32;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** A free area of the screen: centre and size, in pixels. */
interface Area {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Framing {
  dist: number;
  offX: number;
  offY: number;
  /** Pixels a tile at zoom 1, and the garden's box on screen. */
  tile: number;
  box: { x: number; y: number; w: number; h: number };
  /** Centre and size of the free space between the HUD's bars. */
  cx: number;
  cy: number;
  availW: number;
  availH: number;
}
/** Width (tiles) of the strips showing the opposite edge on joined-edge levels. */
const GHOST = 0.42;

interface PropSprite {
  obj: THREE.Object3D;
  p: PropInstance;
  /** Full size (sprites) or 1 (flat props). */
  sx: number;
  sy: number;
}

interface Tile3D {
  /** Where the tile stands: moves when pressed or hopping, never turns. */
  holder: THREE.Group;
  /** Turns with the tile. */
  spin: THREE.Group;
  home: THREE.Vector3;
  u: TileUniforms;
  props: PropSprite[];
  loopRing: THREE.Mesh;
  lockRing: THREE.Mesh;
  modeRing: THREE.Mesh;
  badge: THREE.Sprite;
  spring: Spring | null;
}

interface Spring {
  dome: THREE.Mesh;
  ripples: THREE.Mesh[];
}

const RIPPLE = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);

interface Ghost {
  of: number;
  holder: THREE.Group;
  spin: THREE.Group;
  offset: THREE.Vector3;
}

interface Strip {
  /** World rectangle (x0, z0, x1, z1) the copies show through. */
  rect: [number, number, number, number];
  cells: number[];
  offset: THREE.Vector3;
  planes: THREE.Plane[];
  /** Inner edge and outward direction (x, z, dx, dz), for the mist. */
  mist: THREE.Vector4;
}

interface Bridges {
  floors: THREE.InstancedMesh;
  walls: THREE.InstancedMesh;
  water: THREE.InstancedMesh;
  loop: THREE.InstancedMesh;
}

export class Garden3D extends GardenRenderer {
  static supported(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  private sun = new THREE.DirectionalLight(0xffffff, 1.9);
  private hemi = new THREE.HemisphereLight(0xffffff, 0xf3d9c0, 2.1);
  /** Everything belonging to the current garden, rebuilt with it. */
  private world = new THREE.Group();
  private trash: Array<{ dispose(): void }> = [];
  private tiles: Array<Tile3D | null> = [];
  private ghosts: Ghost[] = [];
  private strips: Strip[] = [];
  private bridges: Bridges | null = null;
  /** Centre of the garden in grid units: world x = grid x - mid[0], world z = grid y - mid[1]. */
  private mid: [number, number] = [0, 0];
  private bounds = { x0: 0, x1: 0, z0: 0, z1: 0 };
  private screenBounds = { x: 0, y: 0, w: 0, h: 0 };
  private badgeMap: THREE.CanvasTexture | null = null;
  /** Gallery: every tile shown watered and in bloom. */
  private grown = false;
  /** Framing of the garden, zoom (1 = framed) and pan in pixels. */
  private base: Framing | null = null;
  private zoom = 1;
  private maxZoom = 1;
  private pan: [number, number] = [0, 0];
  /** Victory turn: time since it started, angle round the garden and its speed. */
  private show: { t: number; az: number; vel: number; dragging: boolean; lastDt: number; area: Area; goal: Area } | null = null;
  /** Free space asked for the victory turn before it starts (the card may open first). */
  private showGoal: Area | null = null;
  /** Where the camera's principal point sits on screen, before the pan. */
  private centre: [number, number] = [0, 0];

  /** Renders the style previews of the style menu (one WebGL context, shared). */
  private static previewer: Garden3D | null = null;
  private static previews = new Map<string, HTMLCanvasElement>();
  /** Previews still to render, one per frame, so the style menu opens at once. */
  private static queue: Array<() => void> = [];

  /**
   * A style's preview for the style menu: a 2x2 garden with the spring, two
   * watered tiles and one turned away, in that style. The canvas shows the
   * style's sky at first; the garden appears a moment later (`ready` is called then).
   */
  static stylePreview(id: ThemeId, size: number, dpr: number, ready?: () => void): HTMLCanvasElement {
    const key = `${id}:${size}:${dpr}`;
    const done = Garden3D.previews.get(key);
    if (done) {
      if (done.dataset.ready) ready?.();
      else done.addEventListener('ready', () => ready?.(), { once: true });
      return done;
    }
    const out = document.createElement('canvas');
    out.width = Math.round(size * dpr);
    out.height = Math.round(size * dpr);
    withTheme(id, () => {
      const ctx = out.getContext('2d')!;
      const sky = ctx.createLinearGradient(0, 0, 0, out.height);
      sky.addColorStop(0, P.bgTop);
      sky.addColorStop(1, P.bgBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, out.width, out.height);
    });
    Garden3D.previews.set(key, out);
    if (ready) out.addEventListener('ready', () => ready(), { once: true });
    Garden3D.queue.push(() => {
      withTheme(id, () => {
        const r = (Garden3D.previewer ??= new Garden3D(document.createElement('canvas'), true));
        r.insets = { top: size * 0.04, bottom: size * 0.04, side: size * 0.04 };
        r.maxTile = 10000;
        r.resize(size, size, dpr);
        r.refreshScenery();
        r.stage();
        r.draw();
        out.getContext('2d')!.drawImage(r.canvas, 0, 0, out.width, out.height);
      });
      // The palette uniforms are shared: give the garden its own colours back.
      updatePalette();
      out.dataset.ready = '1';
      out.dispatchEvent(new Event('ready'));
    });
    if (Garden3D.queue.length === 1) Garden3D.pump();
    return out;
  }

  private static pump() {
    setTimeout(() => {
      const job = Garden3D.queue[0];
      if (!job) return;
      try {
        job();
      } finally {
        Garden3D.queue.shift();
        if (Garden3D.queue.length) Garden3D.pump();
      }
    }, 16);
  }

  /** The preview's garden: the spring, a watered corner and end, and a dry tile turned away. */
  private stage() {
    const tiles = new Uint8Array([E | S, W, N | E, N]);
    const board = new Board({ grid: Grid.rect(2, 2), source: 0, solution: tiles, tiles, unique: false, repairs: 0 });
    this.setBoard(board, 'preview');
    const an = board.analyze();
    this.setAnalysis(an);
    board.grid.cells.forEach((i, k) => {
      const v = this.vis[i];
      v.decor = makeDecor(board.base[i], `preview:${k}`, i === board.source, k === 1 ? 0 : 1, 4);
      v.water = v.bloom = an.watered[i] ? 1 : 0;
    });
    this.build();
  }

  constructor(
    canvas: HTMLCanvasElement,
    /** Still pictures (style previews): no particles. */
    private still = false,
  ) {
    super(canvas);
    this.gl = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, premultipliedAlpha: true });
    this.gl.setClearColor(0x000000, 0);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.localClippingEnabled = true;
    // Light from behind and to the left: shadows fall toward the bottom right, as in the 2D garden.
    this.sun.position.set(-0.45, 1, -0.5).normalize().multiplyScalar(30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(still ? 1024 : 2048, still ? 1024 : 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.world);
    updatePalette();
  }

  refreshScenery() {
    super.refreshScenery();
    updatePalette();
  }

  refreshTheme() {
    super.refreshTheme();
    if (this.board) this.build();
  }

  resize(width: number, height: number, dpr: number) {
    super.resize(width, height, dpr);
    this.gl.setPixelRatio(Math.min(this.dpr, 2));
    this.gl.setSize(width, height, false);
  }

  setBoard(board: Board, decorSeed: string) {
    this.grown = false;
    this.show = null;
    this.showGoal = null;
    this.zoom = 1;
    this.pan = [0, 0];
    super.setBoard(board, decorSeed);
    this.build();
  }

  /**
   * Development aid: one prop of the current style on each tile, in turn, to
   * look at every model (`__game.renderer.gallery()` in the console).
   */
  gallery(from = 0) {
    const board = this.board;
    if (!board) return;
    const defs = currentTheme().props;
    const vecs = dirVecs(this.sides);
    const footprint = { ground: 1.75, canal: 1.25, water: 1.2 } as const;
    board.grid.cells.forEach((i, n) => {
      const def = defs[(n + from) % defs.length];
      const mask = board.base[i];
      const arm = vecs.findIndex((_, d) => mask & (1 << d));
      let [x, y, angle] = [0, 0, 0];
      if (def.place === 'ground') {
        // The corner farthest from the canals.
        const spots: Array<[number, number]> = [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]];
        const clear = ([sx, sy]: [number, number]) => Math.min(...vecs.map(([vx, vy], d) => (mask & (1 << d) ? Math.abs(sx * vy - sy * vx) + (sx * vx + sy * vy < 0 ? 1 : 0) : 9)));
        [x, y] = spots.sort((a, b) => clear(b) - clear(a))[0];
      } else {
        [x, y] = [vecs[arm][0] * 0.3, vecs[arm][1] * 0.3];
        angle = Math.atan2(vecs[arm][1], vecs[arm][0]) - Math.PI / 2;
      }
      const r = ((def.size[0] + def.size[1]) / 2) * (def.upright ? 1.2 : footprint[def.place]);
      this.vis[i].decor.props = [{ def, x, y, r, angle, arm: def.place === 'ground' ? -1 : arm, delay: 0.3, v: (n * 0.37) % 1, v2: (n * 0.61) % 1 }];
    });
    this.grown = true;
    this.build();
  }

  // ---------------------------------------------------------------- layout

  /** Grid units of cell i's centre. */
  private gridCenter(i: number): [number, number] {
    const g = this.board!.grid;
    return g.hex ? g.center(i) : [g.x(i) + 0.5, g.y(i) + 0.5];
  }

  private home(i: number): THREE.Vector3 {
    const [x, y] = this.gridCenter(i);
    return new THREE.Vector3(x - this.mid[0], 0, y - this.mid[1]);
  }

  private measure() {
    const g = this.board!.grid;
    if (g.hex) {
      let [x0, z0, x1, z1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const i of g.cells) {
        const [x, y] = g.center(i);
        x0 = Math.min(x0, x);
        z0 = Math.min(z0, y);
        x1 = Math.max(x1, x);
        z1 = Math.max(z1, y);
      }
      this.mid = [(x0 + x1) / 2, (z0 + z1) / 2];
      const hw = (x1 - x0) / 2 + 1 / Math.sqrt(3) + 0.1;
      const hh = (z1 - z0) / 2 + 0.6;
      this.bounds = { x0: -hw, x1: hw, z0: -hh, z1: hh };
    } else {
      this.mid = [g.width / 2, g.height / 2];
      const m = (g.wrap ? GHOST : 0) + 0.12;
      this.bounds = { x0: -g.width / 2 - m, x1: g.width / 2 + m, z0: -g.height / 2 - m, z1: g.height / 2 + m };
    }
  }

  private project(v: THREE.Vector3): [number, number] {
    const p = v.clone().project(this.camera);
    return [((p.x + 1) / 2) * this.width, ((1 - p.y) / 2) * this.height];
  }

  private boxOnScreen(pts: THREE.Vector3[]) {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const v of pts) {
      const [x, y] = this.project(v);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /**
   * Distance of the camera that frames `bounds` in the free space as large as
   * it fits (up to `maxTile` pixels a tile), and the view offset centring it.
   */
  private fit(bounds: { x0: number; x1: number; z0: number; z1: number }): Framing {
    const { x0, x1, z0, z1 } = bounds;
    const W = this.width;
    const H = this.height;
    const availW = W - this.insets.side * 2;
    const availH = Math.max(H * 0.2, H - this.insets.top - this.insets.bottom);
    const cx = W / 2;
    const cy = this.insets.top + availH / 2;
    const cam = this.camera;
    cam.aspect = W / H;
    cam.zoom = 1;
    let offX = W / 2 - cx;
    let offY = H / 2 - cy;
    cam.setViewOffset(W, H, offX, offY, W, H);
    const corners: THREE.Vector3[] = [];
    for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [-M.body - 0.16, 0.3]) corners.push(new THREE.Vector3(x, y, z));
    let lo = 1;
    let hi = 600;
    for (let k = 0; k < 40; k++) {
      const d = (lo + hi) / 2;
      this.placeCamera(d, ELEVATION, 0);
      const b = this.boxOnScreen(corners);
      const fits = b.w <= availW && b.h <= availH && this.unitOnScreen() <= this.maxTile;
      if (fits) hi = d;
      else lo = d;
    }
    this.placeCamera(hi, ELEVATION, 0);
    // Perspective makes the front of the garden larger: centre what is actually seen.
    const b = this.boxOnScreen(corners);
    offX += b.x + b.w / 2 - cx;
    offY += b.y + b.h / 2 - cy;
    cam.setViewOffset(W, H, offX, offY, W, H);
    cam.updateProjectionMatrix();
    return { dist: hi, offX, offY, tile: this.unitOnScreen(), box: this.boxOnScreen(corners), cx, cy, availW, availH };
  }

  private placeCamera(dist: number, elevation: number, azimuth: number) {
    const cam = this.camera;
    const c = Math.cos(elevation);
    cam.position.set(Math.sin(azimuth) * c * dist, Math.sin(elevation) * dist, Math.cos(azimuth) * c * dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** Width on screen of one tile at the centre of the garden. */
  private unitOnScreen(): number {
    const [ax] = this.project(new THREE.Vector3(-0.5, 0, 0));
    const [bx] = this.project(new THREE.Vector3(0.5, 0, 0));
    return Math.abs(bx - ax);
  }

  /** Frame the garden between the HUD's bars; zooming in stops at the tile size of a 3x3 garden. */
  protected layout() {
    if (!this.board || !this.width) return;
    this.measure();
    const small = this.fit({ x0: -1.62, x1: 1.62, z0: -1.62, z1: 1.62 });
    const base = this.fit(this.bounds);
    this.base = base;
    this.maxZoom = Math.max(1, small.tile / base.tile);
    // The zoom outlives a new framing (the HUD changing size, the screen turning); a new garden starts framed.
    this.zoom = Math.min(this.zoom, this.maxZoom);
    this.clampPan();
    this.applyView();

    // The sun's shadow covers the whole garden.
    const { x0, x1, z0, z1 } = this.bounds;
    const r = Math.max(x1 - x0, z1 - z0) * 0.75 + 1;
    const sh = this.sun.shadow.camera;
    sh.left = -r;
    sh.right = r;
    sh.top = r;
    sh.bottom = -r;
    sh.near = 1;
    sh.far = 60;
    sh.updateProjectionMatrix();
  }

  /** Camera for the current zoom and pan, or for the victory turn around the garden. */
  private applyView() {
    const base = this.base;
    if (!base) return;
    const cam = this.camera;
    const W = this.width;
    const H = this.height;
    const show = this.show;
    let offX = base.offX;
    let offY = base.offY;
    if (show) {
      const k = smooth(clamp01(show.t / SHOW_TRANSITION));
      const el = ELEVATION + (SHOW_ELEVATION - ELEVATION) * k;
      // From the game's framing to the garden turning in the middle of the free space
      // (above the victory card while it is open). Its corners may slip out when it is turned diagonally.
      const { x0, x1, z0, z1 } = this.bounds;
      const radius = (Math.max(x1 - x0, z1 - z0) / 2) * 1.05;
      const f = H / 2 / Math.tan((FOV * Math.PI) / 360);
      const area = show.area;
      const far = Math.max((radius * f) / (area.w * 0.5), (radius * f) / (area.h * 0.62));
      offX = base.offX + (W / 2 - area.cx - base.offX) * k;
      offY = base.offY + (H / 2 - area.cy - base.offY) * k;
      this.placeCamera(base.dist + (far - base.dist) * k, el, show.az);
    } else {
      this.placeCamera(base.dist, ELEVATION, 0);
    }
    this.centre = [W / 2 - offX, H / 2 - offY];
    cam.zoom = this.zoom;
    cam.setViewOffset(W, H, offX - this.pan[0], offY - this.pan[1], W, H);
    cam.updateProjectionMatrix();
    this.tile = base.tile * cam.zoom;
    const { x0, x1, z0, z1 } = this.bounds;
    const top: THREE.Vector3[] = [];
    for (const x of [x0, x1]) for (const z of [z0, z1]) top.push(new THREE.Vector3(x, M.turf, z));
    this.screenBounds = this.boxOnScreen(top);
  }

  // ---------------------------------------------------------------- zoom, pan and the victory turn

  /** True once zoomed in: one finger then moves the view. */
  zoomed(): boolean {
    return this.zoom > 1.001;
  }

  canDrag(lockMode: boolean): boolean {
    return !!this.show || (this.zoomed() && !lockMode);
  }

  /** Zoom by `factor` around the screen point (x, y), between the garden's framing and a 3x3 garden's tile size. */
  zoomAt(x: number, y: number, factor: number) {
    if (!this.base) return;
    const z0 = this.zoom;
    const z1 = Math.min(this.maxZoom * (this.show ? 1.6 : 1), Math.max(1, z0 * factor));
    if (z1 === z0) return;
    // Zooming scales the picture around the camera's principal point (moved by the pan): keep (x, y) still.
    const [ox, oy] = this.centre;
    const k = z1 / z0;
    this.pan = [x - (x - ox - this.pan[0]) * k - ox, y - (y - oy - this.pan[1]) * k - oy];
    this.zoom = z1;
    this.clampPan();
    this.applyView();
  }

  /** One finger moving: pans the zoomed view, or turns the garden after a victory. */
  drag(dx: number, dy: number) {
    const show = this.show;
    if (show) {
      show.dragging = true;
      const turn = -dx * 0.009;
      show.az += turn;
      show.vel = turn / Math.max(1 / 120, show.lastDt);
      this.applyView();
      return;
    }
    this.panBy(dx, dy);
  }

  /** Moves the zoomed view (two fingers sliding together, or one finger while zoomed in a game). */
  panBy(dx: number, dy: number) {
    if (!this.zoomed()) return;
    this.pan = [this.pan[0] + dx, this.pan[1] + dy];
    this.clampPan();
    this.applyView();
  }

  dragEnd() {
    if (this.show) this.show.dragging = false;
  }

  /** The view may move until an edge of the garden reaches the edge of the free space. */
  private clampPan() {
    const b = this.base!;
    const z = this.zoom;
    if (z <= 1.001) {
      this.pan = [0, 0];
      return;
    }
    const w = this.show ? Math.max(b.box.w, this.show.area.w) : b.box.w;
    const h = this.show ? Math.max(b.box.h, this.show.area.h) : b.box.h;
    const hx = (z - 1) * (w / 2) + 4;
    const hy = (z - 1) * (h / 2) + 4;
    this.pan = [Math.max(-hx, Math.min(hx, this.pan[0])), Math.max(-hy, Math.min(hy, this.pan[1]))];
  }

  /** After a victory: the camera lowers and the garden turns in front of it; a finger can turn it too. */
  startShowcase() {
    if (!this.board || this.show || !this.base) return;
    this.zoom = 1;
    this.pan = [0, 0];
    const b = this.base;
    const area = { cx: b.cx, cy: b.cy, w: b.availW, h: b.availH };
    this.show = { t: 0, az: 0, vel: 0, dragging: false, lastDt: 1 / 60, area, goal: this.showGoal ?? { ...area } };
  }

  /**
   * Free space for the victory turn: between `top` and `bottom` pixels from the
   * bottom of the screen (above the victory card), or the game's own space (null).
   */
  setShowcaseSpace(space: { top: number; bottom: number } | null) {
    const b = this.base;
    if (!b) return;
    const goal = space
      ? { cx: this.width / 2, cy: (space.top + this.height - space.bottom) / 2, w: b.availW, h: Math.max(80, this.height - space.bottom - space.top) }
      : { cx: b.cx, cy: b.cy, w: b.availW, h: b.availH };
    this.showGoal = space ? goal : null;
    if (this.show) this.show.goal = goal;
  }

  isBusy(): boolean {
    return !!this.show || super.isBusy();
  }

  update(dt: number) {
    super.update(dt);
    const show = this.show;
    if (!show) return;
    dt = Math.min(dt, 0.05);
    show.t += dt;
    show.lastDt = dt;
    // The garden glides to its free space (up above the card, back down when the card closes).
    const ease = Math.min(1, dt * 3.5);
    const a = show.area;
    a.cx += (show.goal.cx - a.cx) * ease;
    a.cy += (show.goal.cy - a.cy) * ease;
    a.w += (show.goal.w - a.w) * ease;
    a.h += (show.goal.h - a.h) * ease;
    if (!show.dragging) {
      // A flick keeps turning, then settles back to the slow turn; zoomed in, the garden holds still.
      const auto = this.zoomed() ? 0 : SHOW_SPEED * smooth(clamp01(show.t / SHOW_TRANSITION));
      show.vel += (auto - show.vel) * Math.min(1, dt * (this.zoomed() ? 4 : 1.6));
      show.az += show.vel * dt;
    }
    this.applyView();
  }

  boardBounds() {
    return this.board ? this.screenBounds : { x: 0, y: 0, w: this.width, h: this.height };
  }

  cellCenter(i: number): [number, number] {
    if (!this.board) return [0, 0];
    return this.project(this.home(i).setY(M.turf));
  }

  protected facePos(i: number, dx = 0, dy = 0): [number, number] {
    const t = this.tiles[i];
    if (!t) return this.cellCenter(i);
    const [x, y] = this.project(t.holder.position.clone().setY(t.holder.position.y + M.turf));
    return [x + dx, y + dy];
  }

  cellAt(x: number, y: number): number {
    if (!this.board) return -1;
    const g = this.board.grid;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / this.width) * 2 - 1, 1 - (y / this.height) * 2), this.camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -M.turf), new THREE.Vector3());
    if (!hit) return -1;
    const fx = hit.x + this.mid[0];
    const fy = hit.z + this.mid[1];
    if (g.hex) {
      let best = -1;
      let bestD = Infinity;
      for (const i of g.cells) {
        const [cx, cy] = g.center(i);
        const d = (fx - cx) ** 2 + (fy - cy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return bestD <= 0.58 ** 2 ? best : -1;
    }
    let gx = Math.floor(fx);
    let gy = Math.floor(fy);
    if (g.wrap) {
      // Touching a copy in the strips turns the real tile on the other side.
      const inX = fx >= -GHOST && fx < g.width + GHOST;
      const inY = fy >= -GHOST && fy < g.height + GHOST;
      if ((gx === -1 || gx === g.width) && gy >= 0 && gy < g.height && inX) gx = (gx + g.width) % g.width;
      else if ((gy === -1 || gy === g.height) && gx >= 0 && gx < g.width && inY) gy = (gy + g.height) % g.height;
    }
    if (gx < 0 || gy < 0 || gx >= g.width || gy >= g.height) return -1;
    const i = g.index(gx, gy);
    return g.active[i] ? i : -1;
  }

  // ---------------------------------------------------------------- building

  private keep<T extends { dispose(): void }>(thing: T): T {
    this.trash.push(thing);
    return thing;
  }

  private clear() {
    for (const t of this.trash) t.dispose();
    this.trash = [];
    this.world.clear();
    this.tiles = [];
    this.ghosts = [];
    this.strips = [];
    this.bridges = null;
  }

  private build() {
    this.clear();
    updatePalette();
    const board = this.board!;
    const g = board.grid;
    this.measure();
    this.hemi.color.copy(color(mixColor(P.bgTop, '#FFFFFF', 0.6)));
    this.hemi.groundColor.copy(color(mixColor(P.soil, '#FFFFFF', 0.3)));
    if (this.badgeMap) this.badgeMap.dispose();
    this.badgeMap = badgeTexture();

    const groove = this.keep(solid(P.groove, { roughness: 0.95 }));
    const side = this.keep(solid(P.soilSide, { roughness: 0.95 }));
    const bodyMats = [groove, side];

    // The plinth the garden sits on.
    let bed: THREE.BufferGeometry;
    let bedColor: string;
    if (g.wrap) {
      const w = g.width + (GHOST + 0.12) * 2;
      const h = g.height + (GHOST + 0.12) * 2;
      bed = this.keep(trayModel(w, h, 0.35));
      bedColor = mixColor(P.hardEdge, '#FFFFFF', 0.78);
    } else {
      bed = this.keep(bedModel(g.cells.map((i) => {
        const [x, y] = this.gridCenter(i);
        return [x - this.mid[0], y - this.mid[1]] as [number, number];
      }), this.sides, 0.1));
      bedColor = mixColor(P.bgMid, '#FFFFFF', 0.72);
    }
    const bedMesh = new THREE.Mesh(bed, this.keep(solid(bedColor, { roughness: 0.9 })));
    bedMesh.receiveShadow = true;
    this.world.add(bedMesh);
    if (g.wrap) this.addEdgeDashes();

    this.tiles = new Array(g.size).fill(null);
    for (const i of g.cells) this.tiles[i] = this.buildTile(i, bodyMats);
    if (g.wrap) this.buildGhosts();
    this.buildBridgeKit();
  }

  /** Dotted line on the tray, around the garden: its edges lead to the other side. */
  private addEdgeDashes() {
    const g = this.board!.grid;
    const mat = this.keep(solid(P.hardEdge, { roughness: 0.6 }));
    const geo = this.keep(new THREE.BoxGeometry(1, 0.012, 0.035));
    const y = -M.body + 0.006;
    const hw = g.width / 2;
    const hh = g.height / 2;
    const run = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 0.19);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const dash = new THREE.Mesh(geo, mat);
        dash.position.set(ax + (bx - ax) * t, y, az + (bz - az) * t);
        dash.scale.x = 0.085;
        dash.rotation.y = -Math.atan2(bz - az, bx - ax);
        this.world.add(dash);
      }
    };
    run(-hw, -hh, hw, -hh);
    run(-hw, hh, hw, hh);
    run(-hw, -hh, -hw, hh);
    run(hw, -hh, hw, hh);
  }

  private buildTile(i: number, bodyMats: THREE.Material[]): Tile3D {
    const board = this.board!;
    const v = this.vis[i];
    const decor = v.decor;
    const sides = this.sides;
    const mask = board.base[i];
    const isSource = i === board.source;
    const vecs = dirVecs(sides);

    const u = tileUniforms();
    u.uSeed.value = decor.ground.rnd[0] * 50;
    u.uMask.value = mask;
    vecs.forEach(([x, y], d) => u.uDirs.value[d].set(x, y));
    decor.blobs.slice(0, 6).forEach((b, k) => {
      u.uBlob.value[k].set(b.x, b.y, b.r, b.delay);
      u.uSpan.value[k] = b.span;
    });

    const holder = new THREE.Group();
    const spin = new THREE.Group();
    const home = this.home(i);
    holder.position.copy(home);
    holder.add(spin);
    this.world.add(holder);

    const body = new THREE.Mesh(bodyModel(sides), bodyMats);
    body.castShadow = true;
    body.receiveShadow = true;
    const canal = canalModel(mask, sides, isSource);
    const turf = new THREE.Mesh(canal.turf, this.keep(turfMaterial(u)));
    turf.castShadow = true;
    turf.receiveShadow = true;
    const water = new THREE.Mesh(canal.water, this.keep(waterMaterial(u)));
    spin.add(body, turf, water);

    const parts = this.buildParts(i);
    if (parts) {
      const mesh = new THREE.Mesh(this.keep(parts), this.keep(partsMaterial(u)));
      mesh.customDepthMaterial = this.keep(partsDepthMaterial(u));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      spin.add(mesh);
    }

    let spring: Spring | null = null;
    if (isSource) {
      // Water welling up in the middle of the pond, with ripples spreading from it.
      const dome = new THREE.Mesh(PRIM.bulb, this.keep(new THREE.MeshStandardMaterial({ color: color(P.waterLight), roughness: 0.15, transparent: true, opacity: 0.8 })));
      dome.position.y = M.waterY;
      const ripples = [0, 1, 2].map(() => {
        const mesh = new THREE.Mesh(RIPPLE, this.keep(new THREE.MeshBasicMaterial({ color: color(P.waterLight), transparent: true, depthWrite: false })));
        mesh.position.y = M.waterY + 0.002;
        spin.add(mesh);
        return mesh;
      });
      spin.add(dome);
      spring = { dome, ripples };
    }

    const props: PropSprite[] = [];
    for (const p of decor.props) {
      if (modelOf(p) || p.def.screen || p.def.animated) continue;
      if (p.def.place === 'ground' && p.def.upright) {
        const a = uprightArt(p);
        this.keep(a.texture);
        const sprite = new THREE.Sprite(this.keep(new THREE.SpriteMaterial({ map: a.texture, alphaTest: 0.35, transparent: false })));
        sprite.center.set(0.5, a.foot);
        sprite.position.set(p.x, M.turf - 0.01, p.y);
        props.push({ obj: sprite, p, sx: a.w, sy: a.h });
        spin.add(sprite);
      } else {
        const a = flatArt(p);
        this.keep(a.texture);
        const geo = this.keep(new THREE.PlaneGeometry(a.w, a.h).rotateX(-Math.PI / 2));
        const mesh = new THREE.Mesh(geo, this.keep(new THREE.MeshStandardMaterial({ map: a.texture, alphaTest: 0.35, roughness: 0.8 })));
        const y = p.def.place === 'water' ? M.waterY + 0.004 : M.turf + (p.def.place === 'canal' ? 0.008 : 0.004);
        mesh.position.set(p.x, y, p.y);
        if (p.def.place !== 'ground') mesh.rotation.y = -p.angle;
        mesh.receiveShadow = true;
        props.push({ obj: mesh, p, sx: 1, sy: 1 });
        spin.add(mesh);
      }
    }

    const ring = (geo: THREE.BufferGeometry, css: string, y: number) => {
      const mat = this.keep(new THREE.MeshBasicMaterial({ color: color(css), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = y;
      mesh.renderOrder = 2;
      mesh.visible = false;
      holder.add(mesh);
      return mesh;
    };
    const loopRing = ring(outlineBand(sides, 0.015, 0.04), P.loop, M.turf + 0.006);
    const lockRing = ring(outlineBand(sides, 0.02, 0.05), P.lockRing, M.turf + 0.008);
    const modeRing = ring(outlineBand(sides, 0.035, 0.03, sides === 6 ? 18 : 16), P.lockRing, M.turf + 0.007);

    const badge = new THREE.Sprite(this.keep(new THREE.SpriteMaterial({ map: this.badgeMap, depthTest: false, transparent: true })));
    badge.renderOrder = 10;
    if (sides === 6) badge.position.set(0.2, M.turf + 0.1, -0.33);
    else badge.position.set(M.half - 0.1, M.turf + 0.1, -M.half + 0.1);
    badge.visible = false;
    holder.add(badge);

    return { holder, spin, home, u, props, loopRing, lockRing, modeRing, badge, spring };
  }

  /** Grass tufts, flowers, pebbles, and the lotus or the spring's stones, as one mesh. */
  private buildParts(i: number): THREE.BufferGeometry | null {
    const board = this.board!;
    const decor = this.vis[i].decor;
    const mask = board.base[i];
    const isSource = i === board.source;
    const rng = new Rng(`${this.decorSeed}:${i}:3d`);
    const pb = new PartsBuilder();
    const top = M.turf;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const q2 = new THREE.Quaternion();
    const Y = new THREE.Vector3(0, 1, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const at = (x: number, y: number, z: number) => pos.set(x, y, z);
    const grad = (a: string, b: string) => {
      const ca = color(a);
      const cb = color(b);
      return (t: number) => ca.clone().lerp(cb, t);
    };

    for (const p of decor.pebbles) {
      q.setFromEuler(new THREE.Euler(0.25, p.rot, 0.15));
      m.compose(at(p.x, top + p.r * 0.1, p.y), q, scl.set(p.r * 1.3, p.r * 0.75, p.r * 1.05));
      pb.add(PRIM.rock, m, grad(P.pebbleShade, P.pebble), new THREE.Vector3(p.x, top, p.y), 0, 1);
    }

    const blade = grad(P.grassDeep, P.grassLight);
    for (const t of decor.tufts) {
      const anchor = new THREE.Vector3(t.x, top, t.y);
      const n = 4 + rng.int(2);
      for (let b = 0; b < n; b++) {
        const az = t.rot * 3 + (b / n) * Math.PI * 2 + rng.float(-0.4, 0.4);
        const axis = new THREE.Vector3(Math.sin(az), 0, -Math.cos(az));
        q.setFromAxisAngle(axis, rng.float(0.2, 0.5));
        q2.setFromAxisAngle(Y, -az);
        q.multiply(q2);
        m.compose(at(t.x + Math.cos(az) * 0.01, top - 0.004, t.y + Math.sin(az) * 0.01), q, scl.set(0.013, t.s * rng.float(1.4, 2.1), 0.008));
        pb.add(PRIM.blade, m, blade, anchor, t.delay, 0);
      }
    }

    const stemColor = color(P.grassDeep);
    for (const f of decor.flowers) {
      const anchor = new THREE.Vector3(f.x, top, f.y);
      const h = 0.045 + f.r * 0.5;
      m.compose(at(f.x, top - 0.004, f.y), q.identity(), scl.set(0.008, h + 0.004, 0.008));
      pb.add(PRIM.stem, m, stemColor, anchor, f.delay, 0);
      const petal = grad(mixColor(f.color, '#000000', 0.12), mixColor(f.color, '#FFFFFF', 0.15));
      for (let k = 0; k < f.petals; k++) {
        const a = f.rot + (k / f.petals) * Math.PI * 2;
        q.setFromAxisAngle(Y, -a);
        q2.setFromAxisAngle(Z, 0.3);
        q.multiply(q2);
        m.compose(at(f.x + Math.cos(a) * f.r * 0.5, top + h, f.y + Math.sin(a) * f.r * 0.5), q, scl.set(f.r * 0.45, f.r * 0.14, f.r * 0.27));
        pb.add(PRIM.ball, m, petal, anchor, f.delay, 0);
      }
      m.compose(at(f.x, top + h + 0.012, f.y), q.identity(), scl.set(f.r * 0.27, f.r * 0.17, f.r * 0.27));
      pb.add(PRIM.ball, m, color(f.center), anchor, f.delay, 0);
    }

    if (isSource) {
      // A ring of stones around the spring, leaving the canals open.
      const vecs = dirVecs(this.sides);
      const arms = vecs.map(([x, y]) => Math.atan2(y, x)).filter((_, d) => mask & (1 << d));
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.13;
        if (arms.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.42)) continue;
        const r = rng.float(0.032, 0.046);
        const rad = M.pond + 0.012;
        q.setFromEuler(new THREE.Euler(rng.float(-0.3, 0.3), rng.float(0, 3), 0));
        m.compose(at(Math.cos(a) * rad, top + r * 0.2, Math.sin(a) * rad), q, scl.set(r * 1.3, r * 0.85, r));
        pb.add(PRIM.rock, m, grad(P.pebbleShade, P.pebble), new THREE.Vector3(0, top, 0), 0, 1);
      }
    } else if (popcount(mask) === 1) {
      // The canal ends in a basin where a lotus opens once the water is in.
      const anchor = new THREE.Vector3(0, M.waterY, 0);
      m.compose(at(0.02, M.waterY - 0.002, 0.01), q.identity(), scl.set(0.105, 0.01, 0.105));
      pb.add(PRIM.disc, m, color(P.lily), anchor, 0.3, 2);
      const n = decor.bloomPetals;
      const petal = grad(mixColor(decor.bloomColor, '#000000', 0.1), mixColor(decor.bloomColor, '#FFFFFF', 0.35));
      for (const [ring, tilt, len] of [
        [0.035, 0.75, 0.05],
        [0.018, 1.1, 0.04],
      ] as const) {
        for (let k = 0; k < n; k++) {
          const a = decor.padAngle + (k / n) * Math.PI * 2 + (ring < 0.03 ? Math.PI / n : 0);
          q.setFromAxisAngle(Y, -a);
          q2.setFromAxisAngle(Z, tilt);
          q.multiply(q2);
          m.compose(at(Math.cos(a) * ring, M.waterY + 0.025, Math.sin(a) * ring), q, scl.set(len, 0.016, 0.022));
          pb.add(PRIM.ball, m, petal, anchor, 0.3, 2);
        }
      }
      m.compose(at(0, M.waterY + 0.035, 0), q.identity(), scl.set(0.018, 0.014, 0.018));
      pb.add(PRIM.ball, m, color(P.centers[0]), anchor, 0.3, 2);
    }
    // The style's props that have a 3D model.
    for (const p of decor.props) {
      const model = modelOf(p);
      if (!model) continue;
      const def = p.def;
      const unit = p.r * (def.upright ? MODEL_SCALE.upright : MODEL_SCALE.ground);
      const onWater = def.place === 'water';
      const anchor = new THREE.Vector3(p.x, onWater ? M.waterY : top, p.y);
      // Ground props face the camera, give or take; canal and water props follow their arm.
      const yaw = def.place === 'ground' ? (p.v2 - 0.5) * 1.2 : -p.angle;
      q.setFromAxisAngle(Y, yaw);
      const base = new THREE.Matrix4().compose(anchor, q, scl.set(unit, unit, unit));
      const kind = def.when === 'always' ? 1 : onWater ? 2 : 3;
      const kit = new Kit(pb, base, anchor, p.delay, kind);
      const draw = () => model(kit, { v: p.v, v2: p.v2, canalHalf: M.groove / 2 / unit, waterY: (M.waterY - M.turf) / unit });
      // What moves in the 2D garden bobs here: swimmers on the water, bees and balloons in the air.
      const bob = !def.animated || STANDING.has(def.id) ? 0 : onWater ? 0.12 : 0.35;
      if (bob) kit.hover(bob, draw);
      else draw();
    }
    return pb.empty ? null : pb.build();
  }

  /**
   * Joined-edge gardens: faded copies of the tiles of the opposite edge, in
   * strips around the garden, so a canal leaving through one edge visibly
   * continues into the tile it reaches on the other side.
   */
  private buildGhosts() {
    const g = this.board!.grid;
    const hw = g.width / 2;
    const hh = g.height / 2;
    const gap = 0.5 - M.half;
    const col = (x: number) => g.cells.filter((i) => g.x(i) === x);
    const row = (y: number) => g.cells.filter((i) => g.y(i) === y);
    const strip = (rect: [number, number, number, number], cells: number[], ox: number, oz: number, mist: [number, number, number, number]): Strip => {
      const [x0, z0, x1, z1] = rect;
      return {
        rect,
        cells,
        offset: new THREE.Vector3(ox, 0, oz),
        planes: [
          new THREE.Plane(new THREE.Vector3(1, 0, 0), -x0),
          new THREE.Plane(new THREE.Vector3(-1, 0, 0), x1),
          new THREE.Plane(new THREE.Vector3(0, 0, 1), -z0),
          new THREE.Plane(new THREE.Vector3(0, 0, -1), z1),
        ],
        mist: new THREE.Vector4(...mist),
      };
    };
    this.strips = [
      strip([-hw - gap - GHOST, -hh - 0.1, -hw - gap, hh + 0.1], col(g.width - 1), -g.width, 0, [-hw - gap, 0, -1, 0]),
      strip([hw + gap, -hh - 0.1, hw + gap + GHOST, hh + 0.1], col(0), g.width, 0, [hw + gap, 0, 1, 0]),
      strip([-hw - 0.1, -hh - gap - GHOST, hw + 0.1, -hh - gap], row(g.height - 1), 0, -g.height, [0, -hh - gap, 0, -1]),
      strip([-hw - 0.1, hh + gap, hw + 0.1, hh + gap + GHOST], row(0), 0, g.height, [0, hh + gap, 0, 1]),
    ];
    const mistColor = color(mixColor(P.hardEdge, '#FFFFFF', 0.82));
    for (const s of this.strips) {
      const opts = { clipping: s.planes };
      const fog = <T extends THREE.Material>(m: T) => this.keep(misty(m, s.mist, mistColor));
      const bodyMats = [fog(solid(P.groove, opts)), fog(solid(P.soilSide, opts))];
      for (const i of s.cells) {
        const t = this.tiles[i]!;
        const mask = this.board!.base[i];
        const canal = canalModel(mask, this.sides, i === this.board!.source);
        const holder = new THREE.Group();
        const spin = new THREE.Group();
        holder.add(spin);
        spin.add(new THREE.Mesh(bodyModel(this.sides), bodyMats));
        spin.add(new THREE.Mesh(canal.turf, fog(turfMaterial(t.u, opts))));
        spin.add(new THREE.Mesh(canal.water, fog(waterMaterial(t.u, opts))));
        const parts = (t.spin.children.find((c) => (c as THREE.Mesh).geometry?.attributes?.aGrow) as THREE.Mesh | undefined)?.geometry;
        if (parts) spin.add(new THREE.Mesh(parts, fog(partsMaterial(t.u, opts))));
        this.world.add(holder);
        this.ghosts.push({ of: i, holder, spin, offset: s.offset });
      }
    }
  }

  /**
   * Little stone channels carrying the water from one tile to the next, all
   * drawn at once: one instanced mesh for their floors, one for their walls,
   * and one for their water (plus one for water caught in a loop).
   */
  private buildBridgeKit() {
    // Their water comes in at local x = 0 and runs on along +x.
    const channel = (loop: number) => {
      const u = tileUniforms();
      u.uFill.value = 1;
      u.uLoop.value = loop;
      u.uIn.value.set(-1, 0, 1);
      u.uMask.value = 3;
      u.uDirs.value[0].set(1, 0);
      u.uDirs.value[1].set(-1, 0);
      return u;
    };
    const len = M.gap + 0.06;
    const floor = this.keep(new THREE.BoxGeometry(len, 0.12, M.groove + 0.02).translate(len / 2, -0.06, 0));
    const wall = this.keep(new THREE.BoxGeometry(len, M.turf + 0.1, 0.05).translate(len / 2, (M.turf - 0.1) / 2, 0));
    const water = this.keep(new THREE.PlaneGeometry(len, M.groove).rotateX(-Math.PI / 2).translate(len / 2, M.waterY, 0));
    // Every side of every tile at most, twice on joined edges.
    const cap = this.board!.grid.cells.length * this.sides;
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, count: number, shadow: boolean) => {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.count = 0;
      m.castShadow = shadow;
      m.receiveShadow = shadow;
      m.frustumCulled = false;
      this.keep(m);
      this.world.add(m);
      return m;
    };
    this.bridges = {
      floors: mesh(floor, this.keep(solid(P.groove, { roughness: 0.95 })), cap, true),
      walls: mesh(wall, this.keep(solid(mixColor(P.rim, P.rimShade, 0.25), { roughness: 0.8 })), cap * 2, true),
      water: mesh(water, this.keep(waterMaterial(channel(0))), cap, false),
      loop: mesh(water, this.keep(waterMaterial(channel(1))), cap, false),
    };
  }

  // ---------------------------------------------------------------- frame

  private sync() {
    const board = this.board!;
    const an = this.analysis;
    const g = board.grid;
    const n = this.sides;
    const vecs = dirVecs(n);
    PAL.uTime.value = this.time;
    const pulse = Math.sin(this.time * 4);
    for (const i of g.cells) {
      const t = this.tiles[i];
      if (!t) continue;
      const v = this.vis[i];
      const turning = Math.min(1, Math.abs(v.target - v.angle) * 1.8);
      const pop = clamp01((this.time - v.popAt) / 0.45);
      const hop = pop > 0 && pop < 1 ? Math.sin(Math.PI * pop) * 0.22 : 0;
      const shake = v.shake > 0 ? Math.sin(this.time * 55) * v.shake * 0.07 : 0;
      t.holder.position.set(t.home.x + shake, 0.1 * turning + hop - 0.06 * v.press, t.home.z);
      t.holder.scale.setScalar(this.cellScale(v));
      t.spin.rotation.y = -v.angle * this.step;

      const u = t.u;
      u.uBloom.value = this.grown ? 1 : v.bloom;
      u.uWater.value = this.grown ? 1 : v.water;
      u.uFill.value = this.grown ? 1 : v.water;
      u.uLoop.value = v.loop;
      const inflow = an && an.inflow[i] >= 0 ? (an.inflow[i] - board.rot[i] + n) % n : -1;
      if (inflow >= 0 && i !== board.source) u.uIn.value.set(vecs[inflow][0], vecs[inflow][1], 1);
      else u.uIn.value.set(0, 0, 0);

      for (const s of t.props) {
        const def = s.p.def;
        let k = 1;
        if (def.when === 'bloom') {
          const sub = (x: number, a: number, span: number) => clamp01((x - a) / span);
          k = easeOutBack(def.place === 'water' ? sub(v.water, 0.5, 0.5) * sub(v.bloom, s.p.delay * 0.5, 0.3) : sub(v.bloom, s.p.delay, 0.35));
        }
        s.obj.visible = k > 0.01;
        s.obj.scale.set(s.sx * k, s.sy * k, k);
      }

      if (t.spring) {
        const b = Math.sin(this.time * 3.2);
        t.spring.dome.scale.set(0.075 + 0.006 * b, 0.028 + 0.012 * b, 0.075 + 0.006 * b);
        t.spring.ripples.forEach((m, k) => {
          const age = (this.time * 0.55 + k / 3) % 1;
          m.scale.setScalar(0.07 + age * 0.2);
          (m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - age) * v.water;
        });
      }

      t.loopRing.visible = v.loop > 0.02;
      (t.loopRing.material as THREE.MeshBasicMaterial).opacity = v.loop * (0.55 + 0.3 * pulse);
      t.lockRing.visible = v.lock > 0.01;
      (t.lockRing.material as THREE.MeshBasicMaterial).opacity = Math.min(1, v.lock * 1.2);
      const r = easeOutBack(clamp01(v.lock));
      t.badge.visible = r > 0.01;
      t.badge.scale.setScalar(0.33 * r);
      t.modeRing.visible = this.lockMode && !board.locked[i];
      (t.modeRing.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.2 * Math.sin(this.time * 3);
    }

    for (const gh of this.ghosts) {
      const t = this.tiles[gh.of]!;
      gh.holder.position.copy(t.holder.position).add(gh.offset);
      gh.holder.scale.copy(t.holder.scale);
      gh.spin.rotation.y = t.spin.rotation.y;
    }
    this.syncBridges();
  }

  private syncBridges() {
    const an = this.analysis;
    const kit = this.bridges;
    if (!kit) return;
    const board = this.board!;
    const g = board.grid;
    const vecs = dirVecs(this.sides);
    const len = M.gap + 0.06;
    const m = new THREE.Matrix4();
    const side = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const Y = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const at = new THREE.Vector3();
    let [floors, water, loops] = [0, 0, 0];
    /** The channel leaving tile a through side d; `back` turns it round, so its water runs toward a. */
    const place = (a: number, d: number, wet: boolean, loop: boolean, back: boolean) => {
      const [ux, uy] = vecs[d];
      const home = this.tiles[a]!.home;
      const from = back ? M.half - 0.03 + len : M.half - 0.03;
      at.set(home.x + ux * from, 0, home.z + uy * from);
      q.setFromAxisAngle(Y, -Math.atan2(uy, ux) + (back ? Math.PI : 0));
      m.compose(at, q, one);
      kit.floors.setMatrixAt(floors, m);
      for (const k of [0, 1]) {
        side.makeTranslation(0, 0, (k ? 1 : -1) * (M.groove / 2 + 0.025));
        kit.walls.setMatrixAt(floors * 2 + k, side.premultiply(m));
      }
      floors++;
      if (wet && loop) kit.loop.setMatrixAt(loops++, m);
      else if (wet) kit.water.setMatrixAt(water++, m);
    };
    if (an) {
      const half = this.sides / 2;
      const resting = (v: (typeof this.vis)[number]) => Math.abs(this.cellScale(v) - 1) < 0.01 && v.shake <= 0 && v.press < 0.02;
      for (const i of g.cells) {
        const vi = this.vis[i];
        for (let d = 1; d <= half; d++) {
          if (!(an.linked[i] & (1 << d))) continue;
          const j = g.neighbor(i, d);
          const vj = this.vis[j];
          if (!resting(vi) || !resting(vj)) continue;
          const intoJ = an.inflow[j] === g.opposite(d);
          const intoI = an.inflow[i] === d;
          const wet = (intoJ && vj.water > 0.02) || (intoI && vi.water > 0.02) || (vi.water >= 1 && vj.water >= 1);
          const loop = (an.loopSides[i] & (1 << d)) !== 0 && Math.max(vi.loop, vj.loop) > 0.4;
          // The current runs the way the water goes: from i to j, unless j feeds i.
          const toJ = !intoI;
          const wrapped = g.wrap && Math.abs(g.x(i) - g.x(j)) + Math.abs(g.y(i) - g.y(j)) !== 1;
          if (!wrapped) {
            place(i, d, wet, loop, !toJ);
          } else {
            // Across a joined edge, a channel leaves each tile toward the strip.
            place(i, d, wet, loop, !toJ);
            place(j, g.opposite(d), wet, loop, toJ);
          }
        }
      }
    }
    kit.floors.count = floors;
    kit.walls.count = floors * 2;
    kit.water.count = water;
    kit.loop.count = loops;
    for (const mesh of [kit.floors, kit.walls, kit.water, kit.loop]) mesh.instanceMatrix.needsUpdate = true;
  }

  draw() {
    const ctx = this.ctx;
    (ctx as CanvasRenderingContext2D & { reset?: () => void }).reset?.();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.bg) ctx.drawImage(this.bg, 0, 0, this.width, this.height);
    else ctx.clearRect(0, 0, this.width, this.height);
    if (this.board && this.tiles.length) {
      this.sync();
      this.gl.render(this.scene, this.camera);
      ctx.drawImage(this.gl.domElement, 0, 0, this.width, this.height);
      this.drawHold();
      this.drawSpotlight3D();
    }
    if (!this.still) this.particles.draw(ctx, this.time);
  }

  private drawHold() {
    const hold = this.hold;
    if (!hold) return;
    const elapsed = performance.now() / 1000 - hold.start;
    if (elapsed <= HOLD_VISIBLE_AFTER) return;
    const p = clamp01((elapsed - HOLD_VISIBLE_AFTER) / (hold.duration - HOLD_VISIBLE_AFTER));
    const [cx, cy] = this.facePos(hold.cell);
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = P.lockRing;
    ctx.lineWidth = Math.max(2.5, this.tile * 0.06);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, this.tile * 0.38, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Tutorial focus: the rest of the garden is dimmed, the tile pulses and an arrow points at it. */
  private drawSpotlight3D() {
    const s = this.spotlight;
    if (!s || !this.board) return;
    const ctx = this.ctx;
    const t = this.tile;
    const g = this.board.grid;
    let box: { x: number; y: number; w: number; h: number };
    if (s.ghost) {
      // Its copy in the strip below the garden.
      const home = this.tiles[s.cell]!.home;
      const z0 = g.height / 2 + (0.5 - M.half);
      const pts: THREE.Vector3[] = [];
      for (const x of [home.x - M.half, home.x + M.half]) for (const z of [z0, z0 + GHOST]) for (const y of [-M.body, M.turf]) pts.push(new THREE.Vector3(x, y, z));
      box = this.boxOnScreen(pts);
    } else {
      const p = this.tiles[s.cell]!.holder.position;
      const pts: THREE.Vector3[] = [];
      for (const x of [-M.half, M.half]) for (const z of [-M.half, M.half]) for (const y of [-M.body, M.turf]) pts.push(new THREE.Vector3(p.x + x, p.y + y, p.z + z));
      box = this.boxOnScreen(pts);
    }
    const pad = t * 0.04;
    const [x0, y0, w, h] = [box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2];
    const cx = x0 + w / 2;
    const cy = s.ghost ? y0 + h / 2 : this.facePos(s.cell)[1];
    ctx.save();
    ctx.fillStyle = 'rgba(70, 45, 70, 0.32)';
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    roundRectPath(ctx, x0, y0, w, h, t * 0.2, true);
    ctx.fill('evenodd');

    const pulse = (this.time * 0.9) % 1;
    const grow = pulse * t * 0.22;
    ctx.globalAlpha = 1 - pulse;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, t * 0.04);
    roundRectPath(ctx, x0 - grow, y0 - grow, w + grow * 2, h + grow * 2, t * 0.22);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (s.kind === 'hold') {
      const p = (this.time * 0.6) % 1;
      ctx.strokeStyle = P.lockRing;
      ctx.lineWidth = Math.max(3, t * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, t * 0.38, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
    }

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
}

/**
 * Ghost copies fade into a mist toward the outside of their strip, as in
 * the 2D garden.
 */
function misty<T extends THREE.Material>(m: T, strip: THREE.Vector4, mist: THREE.Color): T {
  const before = m.onBeforeCompile;
  const key = m.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    before.call(m, shader, renderer);
    Object.assign(shader.uniforms, { uStrip: { value: strip }, uMist: { value: mist.clone().convertLinearToSRGB() } });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGhostW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGhostW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGhostW;\nuniform vec4 uStrip;\nuniform vec3 uMist;')
      .replace(
        '#include <colorspace_fragment>',
        `#include <colorspace_fragment>
float ghostOut = clamp(dot(vGhostW.xz - uStrip.xy, uStrip.zw) / ${GHOST.toFixed(2)}, 0.0, 1.0);
gl_FragColor.rgb = mix(gl_FragColor.rgb, uMist, 0.25 + 0.6 * ghostOut);`,
      );
  };
  m.customProgramCacheKey = () => `${key}-ghost`;
  return m;
}
