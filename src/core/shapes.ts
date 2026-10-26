/**
 * Garden shapes: masks of active cells inside a width x height box.
 * Every shape keeps the centre cell (the spring) and is reduced to the
 * 4-connected component that contains it.
 */
import { Rng } from './rng';

export type ShapeId =
  | 'rect'
  | 'octagon'
  | 'circle'
  | 'diamond'
  | 'plus'
  | 'heart'
  | 'flower'
  | 'hourglass'
  | 'ponds';

export const SHAPE_NAMES: Record<ShapeId, string> = {
  rect: 'Parterre',
  octagon: 'Cloître',
  circle: 'Rond-point',
  diamond: 'Losange',
  plus: 'Croisée',
  heart: 'Cœur',
  flower: 'Trèfle',
  hourglass: 'Sablier',
  ponds: 'Étangs',
};

export function centerOf(width: number, height: number): number {
  return Math.floor(height / 2) * width + Math.floor(width / 2);
}

/** Normalised coordinates in [-1, 1] for the centre of cell (x, y). */
function norm(x: number, y: number, w: number, h: number): [number, number] {
  const u = w > 1 ? (x - (w - 1) / 2) / ((w - 1) / 2) : 0;
  const v = h > 1 ? (y - (h - 1) / 2) / ((h - 1) / 2) : 0;
  return [u, v];
}

function inside(shape: ShapeId, u: number, v: number, w: number, h: number): boolean {
  // Half a cell in normalised units, used to be generous on the borders.
  const hu = w > 1 ? 1 / (w - 1) : 1;
  const hv = h > 1 ? 1 / (h - 1) : 1;
  switch (shape) {
    case 'rect':
    case 'ponds':
      return true;
    case 'octagon':
      return Math.abs(u) + Math.abs(v) <= 1.45 + (hu + hv) * 0.5;
    case 'circle':
      return u * u + v * v <= 1 + (hu + hv);
    case 'diamond':
      return Math.abs(u) + Math.abs(v) <= 1 + (hu + hv) * 0.6;
    case 'plus':
      return Math.abs(u) <= 0.36 + hu || Math.abs(v) <= 0.36 + hv;
    case 'hourglass':
      return Math.abs(u) <= Math.abs(v) * 1.05 + 0.3 + hu;
    case 'flower': {
      // Quatrefoil: four round petals around a small heart, with notches between them.
      if (Math.hypot(u, v) <= 0.3 + (hu + hv) * 0.5) return true;
      const petals: Array<[number, number]> = [
        [0, -0.6],
        [0.6, 0],
        [0, 0.6],
        [-0.6, 0],
      ];
      return petals.some(([pu, pv]) => Math.hypot(u - pu, v - pv) <= 0.4 + (hu + hv) * 0.3);
    }
    case 'heart': {
      // Two round lobes on top of a triangle pointing down.
      const lobe = (cx: number) => ((u - cx) / 0.52) ** 2 + ((v + 0.48) / 0.52) ** 2 <= 1 + (hu + hv) * 0.9;
      if (lobe(-0.48) || lobe(0.48)) return true;
      if (v < -0.48) return false;
      const halfWidth = ((1 - v) / 1.48) * 1.0;
      return Math.abs(u) <= halfWidth + hu * 0.6;
    }
  }
}

/** Keep only cells 4-connected to `start`. */
function keepConnected(active: Uint8Array, width: number, height: number, start: number): void {
  const seen = new Uint8Array(active.length);
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i / width) | 0;
    const nbs = [
      y > 0 ? i - width : -1,
      x < width - 1 ? i + 1 : -1,
      y < height - 1 ? i + width : -1,
      x > 0 ? i - 1 : -1,
    ];
    for (const j of nbs) {
      if (j >= 0 && active[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  for (let i = 0; i < active.length; i++) if (!seen[i]) active[i] = 0;
}

/** Remove a few isolated cells to create little ponds inside a rectangle. */
function carvePonds(active: Uint8Array, width: number, height: number, rng: Rng): void {
  const center = centerOf(width, height);
  const count = Math.max(1, Math.round((width * height) / 22));
  let placed = 0;
  for (let attempt = 0; attempt < 200 && placed < count; attempt++) {
    const x = rng.range(1, width - 2);
    const y = rng.range(1, height - 2);
    const i = y * width + x;
    if (!active[i] || Math.abs(x - (center % width)) + Math.abs(y - Math.floor(center / width)) < 2) {
      continue;
    }
    // Keep ponds apart so the garden stays well connected.
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) {
      for (let dx = -1; dx <= 1 && ok; dx++) {
        if (!active[(y + dy) * width + x + dx]) ok = false;
      }
    }
    if (!ok) continue;
    active[i] = 0;
    placed++;
  }
}

export function buildShape(shape: ShapeId, width: number, height: number, rng?: Rng): Uint8Array {
  const active = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [u, v] = norm(x, y, width, height);
      if (inside(shape, u, v, width, height)) active[y * width + x] = 1;
    }
  }
  const center = centerOf(width, height);
  active[center] = 1;
  if (shape === 'ponds' && rng) carvePonds(active, width, height, rng);
  keepConnected(active, width, height, center);
  return active;
}
