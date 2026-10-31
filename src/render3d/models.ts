/**
 * Geometry of the 3D garden, in tile units (a cell spans -0.5..0.5) with y up.
 * The tile frame of the 2D art maps onto the ground: its x stays x, its y
 * (down on screen) becomes z (toward the camera).
 *
 * A tile is a block of soil with a layer of turf on top; the canal is carved
 * through the turf, down to the groove floor, and the water lies in it.
 */
import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import type { MultiPolygon, Polygon, Ring } from 'polygon-clipping';
import { dirVecs, popcount } from '../core/grid';

export const M = {
  /** Centre to the middle of a side of the tile's face. */
  half: 0.45,
  corner: 0.16,
  hexCorner: 0.09,
  /** Soil block under the turf (from -body to 0). */
  body: 0.24,
  /** Turf layer, from 0 to turf: the canal is carved through it. */
  turf: 0.085,
  bevel: 0.024,
  groove: 0.25,
  pond: 0.29,
  basin: 0.17,
  /** Height of the water surface in the groove. */
  waterY: 0.05,
  /** Gap between two neighbouring faces, crossed by a little stone bridge. */
  gap: 0.1,
} as const;

type V2 = [number, number];

/** Polygon with its corners rounded off (radius r), as a list of points. */
export function roundedPolygon(verts: V2[], r: number, segs = 5): V2[] {
  const out: V2[] = [];
  const n = verts.length;
  for (let k = 0; k < n; k++) {
    const [vx, vy] = verts[k];
    const [px, py] = verts[(k + n - 1) % n];
    const [nx, ny] = verts[(k + 1) % n];
    let ax = px - vx;
    let ay = py - vy;
    let bx = nx - vx;
    let by = ny - vy;
    const al = Math.hypot(ax, ay);
    const bl = Math.hypot(bx, by);
    ax /= al;
    ay /= al;
    bx /= bl;
    by /= bl;
    const half = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by))) / 2;
    const t = r / Math.tan(half);
    const bis = Math.hypot(ax + bx, ay + by);
    const d = r / Math.sin(half);
    const cx = vx + ((ax + bx) / bis) * d;
    const cy = vy + ((ay + by) / bis) * d;
    const a0 = Math.atan2(vy + ay * t - cy, vx + ax * t - cx);
    let a1 = Math.atan2(vy + by * t - cy, vx + bx * t - cx);
    // The short way round.
    while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
    for (let s = 0; s <= segs; s++) {
      const a = a0 + ((a1 - a0) * s) / segs;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return out;
}

/** Outline of a tile's face (rounded square, or flat-topped hexagon), `half` from the centre to a side. */
export function faceOutline(sides: number, half: number = M.half, corner?: number): V2[] {
  if (sides === 6) {
    const R = (half * 2) / Math.sqrt(3);
    const verts: V2[] = [];
    for (let k = 0; k < 6; k++) verts.push([Math.cos((k * Math.PI) / 3) * R, Math.sin((k * Math.PI) / 3) * R]);
    return roundedPolygon(verts, corner ?? M.hexCorner);
  }
  return roundedPolygon(
    [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ],
    corner ?? M.corner,
  );
}

export function circle(r: number, n = 28): V2[] {
  const pts: V2[] = [];
  for (let k = 0; k < n; k++) pts.push([Math.cos((k / n) * Math.PI * 2) * r, Math.sin((k / n) * Math.PI * 2) * r]);
  return pts;
}

/** Closed ring, snapped to a fine grid: polygon clipping trips over nearly equal coordinates. */
const ring = (pts: V2[]): Ring => {
  const snapped = pts.map(([x, y]) => [Math.round(x * 4096) / 4096, Math.round(y * 4096) / 4096] as V2);
  return [...snapped, snapped[0]];
};

function armRect(u: readonly [number, number], w: number, len: number): V2[] {
  const nx = -u[1] * (w / 2);
  const ny = u[0] * (w / 2);
  return [
    [nx, ny],
    [nx + u[0] * len, ny + u[1] * len],
    [-nx + u[0] * len, -ny + u[1] * len],
    [-nx, -ny],
  ];
}

/** The canal of a tile (arms and their hub), and the turf left around it. */
export function canalAreas(mask: number, sides: number, isSource: boolean): { turf: MultiPolygon; water: MultiPolygon } {
  const vecs = dirVecs(sides);
  const parts: Polygon[] = [];
  for (let d = 0; d < sides; d++) if (mask & (1 << d)) parts.push([ring(armRect(vecs[d], M.groove, 0.8))]);
  const hub = isSource ? M.pond : popcount(mask) === 1 ? M.basin : M.groove / 2;
  parts.push([ring(circle(hub, isSource ? 36 : 24))]);
  const canal = polygonClipping.union(parts[0], ...parts.slice(1));
  const face: Polygon = [ring(faceOutline(sides))];
  return { turf: polygonClipping.difference(face, canal), water: polygonClipping.intersection(face, canal) };
}

/**
 * Shapes for three.js. The y axis is flipped: shapes are laid on the ground by
 * a turn of -90° about x, which sends shape y to -z.
 */
function toShapes(mp: MultiPolygon): THREE.Shape[] {
  const pts = (r: Ring) => r.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, -y));
  return mp.map(([outer, ...holes]) => {
    const shape = new THREE.Shape(pts(outer));
    shape.holes = holes.map((h) => new THREE.Path(pts(h)));
    return shape;
  });
}

export function polyShapes(pts: V2[]): THREE.Shape[] {
  return toShapes([[ring(pts)]]);
}

/** Shapes raised from `base` to `base + height`, with rounded edges. Group 0: top and bottom, group 1: sides. */
export function extrude(shapes: THREE.Shape[], height: number, base: number, bevel: number = M.bevel): THREE.BufferGeometry {
  const bt = Math.min(bevel, height / 2 - 0.002);
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.002, height - bt * 2),
    bevelEnabled: true,
    bevelThickness: bt,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  g.translate(0, base - g.boundingBox!.min.y, 0);
  return g;
}

/** Flat shapes lying at height y, facing up. */
export function flat(shapes: THREE.Shape[], y: number): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shapes, 6);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

export interface CanalModel {
  turf: THREE.BufferGeometry;
  water: THREE.BufferGeometry;
}

const canalCache = new Map<string, CanalModel>();

/** Turf and water of a tile, shared by every tile with the same canal. */
export function canalModel(mask: number, sides: number, isSource: boolean): CanalModel {
  const key = `${sides}:${mask}:${isSource ? 1 : 0}`;
  let model = canalCache.get(key);
  if (!model) {
    const { turf, water } = canalAreas(mask, sides, isSource);
    model = { turf: extrude(toShapes(turf), M.turf, 0, 0.022), water: flat(toShapes(water), M.waterY) };
    canalCache.set(key, model);
  }
  return model;
}

const bodyCache = new Map<number, THREE.BufferGeometry>();

/** Soil block of a tile. */
export function bodyModel(sides: number): THREE.BufferGeometry {
  let g = bodyCache.get(sides);
  if (!g) {
    g = extrude(polyShapes(faceOutline(sides)), M.body + 0.01, -M.body, 0.035);
    bodyCache.set(sides, g);
  }
  return g;
}

/** Evenly spaced points along a closed outline. */
function resample(pts: V2[], n: number): V2[] {
  const lens: number[] = [0];
  for (let k = 1; k <= pts.length; k++) {
    const [ax, ay] = pts[k - 1];
    const [bx, by] = pts[k % pts.length];
    lens.push(lens[k - 1] + Math.hypot(bx - ax, by - ay));
  }
  const total = lens[pts.length];
  const out: V2[] = [];
  let seg = 0;
  for (let s = 0; s < n; s++) {
    const at = (s / n) * total;
    while (lens[seg + 1] < at) seg++;
    const f = (at - lens[seg]) / (lens[seg + 1] - lens[seg] || 1);
    const [ax, ay] = pts[seg];
    const [bx, by] = pts[(seg + 1) % pts.length];
    out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }
  return out;
}

const ringCache = new Map<string, THREE.BufferGeometry>();

/**
 * Flat band following the outline of a face, `inset` inside it and `width`
 * wide; with `dashes`, cut into that many dashes.
 */
export function outlineBand(sides: number, inset: number, width: number, dashes = 0): THREE.BufferGeometry {
  const key = `${sides}:${inset}:${width}:${dashes}`;
  let g = ringCache.get(key);
  if (g) return g;
  const n = 96;
  const corner = sides === 6 ? M.hexCorner : M.corner;
  const outer = resample(faceOutline(sides, M.half - inset, Math.max(0.02, corner - inset)), n);
  const inner = resample(faceOutline(sides, M.half - inset - width, Math.max(0.02, corner - inset - width)), n);
  const pos: number[] = [];
  for (let k = 0; k < n; k++) {
    if (dashes && Math.floor((k / n) * dashes * 2) % 2 === 1) continue;
    const a = outer[k];
    const b = outer[(k + 1) % n];
    const c = inner[(k + 1) % n];
    const d = inner[k];
    pos.push(a[0], 0, a[1], d[0], 0, d[1], b[0], 0, b[1], b[0], 0, b[1], d[0], 0, d[1], c[0], 0, c[1]);
  }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  ringCache.set(key, g);
  return g;
}

/** Outline of the plinth under the whole garden: the union of slightly enlarged cells. */
export function bedOutline(centers: Array<[number, number]>, sides: number, pad: number): MultiPolygon {
  const cells: Polygon[] = centers.map(([cx, cy]) => {
    const outline = sides === 6 ? faceOutline(6, 0.5 + pad, 0.2) : faceOutline(4, 0.5 + pad, 0.3);
    return [ring(outline.map(([x, y]) => [x + cx, y + cy] as V2))];
  });
  return polygonClipping.union(cells[0], ...cells.slice(1));
}

/** Soft plinth under the whole garden. */
export function bedModel(centers: Array<[number, number]>, sides: number, pad: number): THREE.BufferGeometry {
  let outline: MultiPolygon;
  try {
    outline = bedOutline(centers, sides, pad);
  } catch {
    // Should the union fail, overlapping plinths look much the same.
    outline = centers.map(([cx, cy]) => [ring(faceOutline(sides, 0.5 + pad, sides === 6 ? 0.2 : 0.3).map(([x, y]) => [x + cx, y + cy] as V2))]);
  }
  return extrude(toShapes(outline), 0.16, -M.body - 0.16, 0.05);
}

/** Rounded rectangle plinth (joined-edge gardens, ghost strips included). */
export function trayModel(w: number, h: number, r: number): THREE.BufferGeometry {
  const pts = roundedPolygon(
    [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ],
    r,
    8,
  );
  return extrude(polyShapes(pts), 0.16, -M.body - 0.16, 0.05);
}

/**
 * How a part moves, in the tile's frame: turning about `axis` through `pivot`
 * at `speed` radians a second (windmill sails), or swinging to and fro by
 * `swing` radians `freq` times a second (wings, balloons), and bobbing up and down by `bob`.
 */
export interface Motion {
  pivot: [number, number, number];
  axis: [number, number, number];
  speed: number;
  bob: number;
  swing: number;
  freq: number;
}

export const STILL: Motion = { pivot: [0, 0, 0], axis: [0, 1, 0], speed: 0, bob: 0, swing: 0, freq: 0 };

/**
 * Collects small parts (blades of grass, petals, pebbles) into a single mesh,
 * with vertex colours. Each part keeps its anchor and when it grows, so the
 * shader can make it sprout with the water.
 */
export class PartsBuilder {
  private pos: number[] = [];
  private nrm: number[] = [];
  private col: number[] = [];
  private anchor: number[] = [];
  private grow: number[] = [];
  private move0: number[] = [];
  private move1: number[] = [];
  private move2: number[] = [];

  /**
   * `color` may vary from the bottom (0) to the top (1) of the part.
   * kind 0 grows with the grass, 1 is always there, 2 opens once the water is in.
   */
  add(
    src: THREE.BufferGeometry,
    m: THREE.Matrix4,
    color: THREE.Color | ((t: number) => THREE.Color),
    anchor: THREE.Vector3,
    delay: number,
    kind: number,
    move: Motion = STILL,
  ) {
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.computeBoundingBox();
    const minY = g.boundingBox!.min.y;
    const spanY = g.boundingBox!.max.y - minY || 1;
    const p0 = g.attributes.position;
    const ts: number[] = [];
    for (let k = 0; k < p0.count; k++) ts.push((p0.getY(k) - minY) / spanY);
    g.applyMatrix4(m);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let k = 0; k < p.count; k++) {
      this.pos.push(p.getX(k), p.getY(k), p.getZ(k));
      this.nrm.push(n.getX(k), n.getY(k), n.getZ(k));
      const c = typeof color === 'function' ? color(ts[k]) : color;
      this.col.push(c.r, c.g, c.b);
      this.anchor.push(anchor.x, anchor.y, anchor.z);
      this.grow.push(delay, kind);
      this.move0.push(...move.pivot, move.speed);
      this.move1.push(...move.axis, move.bob);
      this.move2.push(move.swing, move.freq * Math.PI * 2);
    }
    g.dispose();
  }

  get empty(): boolean {
    return this.pos.length === 0;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aAnchor', new THREE.Float32BufferAttribute(this.anchor, 3));
    g.setAttribute('aGrow', new THREE.Float32BufferAttribute(this.grow, 2));
    g.setAttribute('aMove0', new THREE.Float32BufferAttribute(this.move0, 4));
    g.setAttribute('aMove1', new THREE.Float32BufferAttribute(this.move1, 4));
    g.setAttribute('aMove2', new THREE.Float32BufferAttribute(this.move2, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** Shared primitives for the parts, unit sized, standing on y = 0. */
export const PRIM = {
  ball: new THREE.IcosahedronGeometry(1, 1),
  rock: new THREE.IcosahedronGeometry(1, 0),
  blade: new THREE.ConeGeometry(1, 1, 4, 1).translate(0, 0.5, 0),
  stem: new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0),
  disc: new THREE.CylinderGeometry(1, 1, 1, 18, 1).translate(0, 0.5, 0),
  bulb: new THREE.SphereGeometry(1, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2),
};
