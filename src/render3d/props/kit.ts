/**
 * Low-poly kit for the styles' props in 3D. A model is a few simple shapes
 * (boxes, balls, cylinders, cones, rocks), merged into its tile's single mesh:
 * a whole tile, props included, is drawn in one call.
 *
 * Prop frame, in units of the prop's footprint radius `r`:
 *   - y goes up from the ground (the turf, or the water surface for water props);
 *   - z points toward the camera (down the screen), x to the right;
 *   - canal props: x crosses the canal, z runs along it, outward.
 * Ground props should stay roughly within 1 unit of the centre on the ground;
 * upright ones may rise to about 2.5 units (trees), most stay under 1.8.
 */
import * as THREE from 'three';
import type { ThemeId } from '../../render/themes/types';
import { color } from '../materials';
import { PartsBuilder, STILL, type Motion } from '../models';

/** A colour, or a gradient from the bottom to the top of the shape. */
export type Paint = string | [string, string];
export type Vec = [number, number, number];

export interface ShapeOptions {
  /** Rotation in radians, applied x then y then z (Euler 'XYZ'). */
  rot?: Vec;
  /** Number of sides of cylinders and cones (default 6), detail of balls (0 or 1, default 1). */
  sides?: number;
}

/** What a model knows about its prop. */
export interface ModelInfo {
  /** Two stable random numbers in [0, 1) for variations (same as the 2D drawing). */
  v: number;
  v2: number;
  /** Half width of the canal, in prop units (canal props). */
  canalHalf: number;
  /** Height of the water surface below the ground, in prop units (canal props, negative). */
  waterY: number;
}

export type Model = (k: Kit, info: ModelInfo) => void;
/** Models of one style's props, by prop id. */
export type ModelMap = Partial<Record<string, Model>>;
export type StyleModels = Partial<Record<ThemeId, ModelMap>>;

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  ball0: new THREE.IcosahedronGeometry(1, 0),
  ball1: new THREE.IcosahedronGeometry(1, 1),
  rock: new THREE.DodecahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.3, 5, 10).rotateX(Math.PI / 2),
  cyl: new Map<number, THREE.BufferGeometry>(),
  cone: new Map<number, THREE.BufferGeometry>(),
  dome: new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
};

function cylGeo(sides: number): THREE.BufferGeometry {
  let g = GEO.cyl.get(sides);
  if (!g) {
    g = new THREE.CylinderGeometry(1, 1, 1, sides, 1).translate(0, 0.5, 0);
    GEO.cyl.set(sides, g);
  }
  return g;
}

function coneGeo(sides: number): THREE.BufferGeometry {
  let g = GEO.cone.get(sides);
  if (!g) {
    g = new THREE.ConeGeometry(1, 1, sides, 1).translate(0, 0.5, 0);
    GEO.cone.set(sides, g);
  }
  return g;
}

const paints = new Map<string, THREE.Color>();
function paintOf(p: Paint): THREE.Color | ((t: number) => THREE.Color) {
  const one = (css: string) => {
    let c = paints.get(css);
    if (!c) {
      c = color(css);
      paints.set(css, c);
    }
    return c;
  };
  if (typeof p === 'string') return one(p);
  const a = one(p[0]);
  const b = one(p[1]);
  return (t: number) => a.clone().lerp(b, t);
}

/**
 * Places shapes in a prop's frame. Positions are in prop units; `at` nests a
 * frame (moved, turned about y, scaled) for parts such as an animal's head.
 */
export class Kit {
  private stack: THREE.Matrix4[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private own = false;
  private motion: Motion = STILL;

  constructor(
    private builder: PartsBuilder,
    base: THREE.Matrix4,
    private anchor: THREE.Vector3,
    private delay: number,
    /** Growth: 1 always there, 2 opens once the water is in, 3 sprouts with the grass. */
    private kind: number,
  ) {
    this.stack = [base.clone()];
  }

  private put(geo: THREE.BufferGeometry, pos: Vec, scale: Vec, paint: Paint, rot?: Vec) {
    this.e.set(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0);
    this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(...pos), this.q, new THREE.Vector3(...scale));
    this.m.premultiply(this.stack[this.stack.length - 1]);
    this.builder.add(geo, this.m, paintOf(paint), this.anchorOf(), this.delay, this.kind, this.motion);
  }

  /** Parts sprouting on their own grow from where they are. */
  private anchorOf(): THREE.Vector3 {
    return this.own ? new THREE.Vector3().setFromMatrixPosition(this.m) : this.anchor;
  }

  /** Box standing on (x, y, z): w wide (x), h high, d deep (z). */
  box(paint: Paint, pos: Vec, size: Vec, o: ShapeOptions = {}) {
    this.put(GEO.box, pos, size, paint, o.rot);
  }

  /** Ball (ellipsoid) centred on pos, with radii rx, ry, rz. */
  ball(paint: Paint, pos: Vec, radii: Vec, o: ShapeOptions = {}) {
    this.put(o.sides === 0 ? GEO.ball0 : GEO.ball1, pos, radii, paint, o.rot);
  }

  /** Half ball (dome) sitting on pos, with radii rx, height, rz. */
  dome(paint: Paint, pos: Vec, radii: Vec, o: ShapeOptions = {}) {
    this.put(GEO.dome, pos, radii, paint, o.rot);
  }

  /** Rough rock centred on pos. */
  rock(paint: Paint, pos: Vec, radii: Vec, o: ShapeOptions = {}) {
    this.put(GEO.rock, pos, radii, paint, o.rot);
  }

  /** Cylinder standing on pos (radius r, height h); `top` narrows its top (1 = straight). */
  cyl(paint: Paint, pos: Vec, r: number, h: number, o: ShapeOptions & { top?: number; rz?: number } = {}) {
    const top = o.top ?? 1;
    if (top === 1) this.put(cylGeo(o.sides ?? 6), pos, [r, h, o.rz ?? r], paint, o.rot);
    else {
      // A tapered cylinder: its own geometry, shared by every taper of that size.
      const key = Math.round(top * 20) / 20;
      const id = (o.sides ?? 6) * 100 + key * 20;
      let g = GEO.cyl.get(1000 + id);
      if (!g) {
        g = new THREE.CylinderGeometry(key, 1, 1, o.sides ?? 6, 1).translate(0, 0.5, 0);
        GEO.cyl.set(1000 + id, g);
      }
      this.put(g, pos, [r, h, o.rz ?? r], paint, o.rot);
    }
  }

  /** Cone standing on pos. */
  cone(paint: Paint, pos: Vec, r: number, h: number, o: ShapeOptions & { rz?: number } = {}) {
    this.put(coneGeo(o.sides ?? 6), pos, [r, h, o.rz ?? r], paint, o.rot);
  }

  /** Flat ring lying on pos (a swim ring, a wheel once turned upright). */
  ring(paint: Paint, pos: Vec, r: number, thick: number, o: ShapeOptions = {}) {
    this.put(GEO.torus, pos, [r, thick / 0.3, r], paint, o.rot);
  }

  /** Stick from a to b (stems, legs, posts), `w` thick. */
  stick(paint: Paint, a: Vec, b: Vec, w: number, sides = 4) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    if (len < 1e-6) return;
    this.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    this.m.compose(new THREE.Vector3(...a), this.q, new THREE.Vector3(w / 2, len, w / 2));
    this.m.premultiply(this.stack[this.stack.length - 1]);
    this.builder.add(cylGeo(sides), this.m, paintOf(paint), this.anchorOf(), this.delay, this.kind, this.motion);
  }

  /** Parts that only sprout once the tile is watered (fruits on a tree that is always there). */
  bloom(delay: number, fn: () => void) {
    const [d, k] = [this.delay, this.kind];
    this.delay = delay;
    this.kind = 3;
    this.own = true;
    fn();
    [this.delay, this.kind] = [d, k];
    this.own = false;
  }

  /** Parts that keep turning about `axis` through `pivot` (prop frame), `speed` radians a second: windmill sails. */
  spin(pivot: Vec, axis: Vec, speed: number, fn: () => void) {
    const top = this.stack[this.stack.length - 1];
    const p = new THREE.Vector3(...pivot).applyMatrix4(top);
    const a = new THREE.Vector3(...axis).transformDirection(top);
    this.moving({ ...this.motion, pivot: [p.x, p.y, p.z], axis: [a.x, a.y, a.z], speed }, fn);
  }

  /** Parts that swing to and fro about `axis` through `pivot`, by `amount` radians, `freq` times a second: wings, balloons. */
  swing(pivot: Vec, axis: Vec, amount: number, freq: number, fn: () => void) {
    const top = this.stack[this.stack.length - 1];
    const p = new THREE.Vector3(...pivot).applyMatrix4(top);
    const a = new THREE.Vector3(...axis).transformDirection(top);
    this.moving({ ...this.motion, pivot: [p.x, p.y, p.z], axis: [a.x, a.y, a.z], swing: amount, freq }, fn);
  }

  /** Parts that bob up and down by `amount` (prop units): a swimmer, a bee. */
  hover(amount: number, fn: () => void) {
    const top = this.stack[this.stack.length - 1];
    const scale = new THREE.Vector3().setFromMatrixScale(top).y;
    const p = new THREE.Vector3().setFromMatrixPosition(top);
    const pivot: Vec = this.motion.speed || this.motion.swing ? this.motion.pivot : [p.x, p.y, p.z];
    this.moving({ ...this.motion, pivot, bob: amount * scale }, fn);
  }

  private moving(motion: Motion, fn: () => void) {
    const before = this.motion;
    this.motion = motion;
    fn();
    this.motion = before;
  }

  /** Shapes drawn by `fn` in a frame moved to pos, turned by `turn` about y, scaled by `scale`. */
  at(pos: Vec, turn: number, scale: number, fn: () => void) {
    this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...pos), this.q.clone(), new THREE.Vector3(scale, scale, scale));
    this.stack.push(this.stack[this.stack.length - 1].clone().multiply(local));
    fn();
    this.stack.pop();
  }
}

/** Little eyes on a face looking along +z (toward the camera), at height y. */
export function eyes(k: Kit, x: number, y: number, z: number, gap: number, size = 0.07) {
  k.ball('#3E3440', [x - gap, y, z], [size, size, size * 0.6], { sides: 0 });
  k.ball('#3E3440', [x + gap, y, z], [size, size, size * 0.6], { sides: 0 });
}
