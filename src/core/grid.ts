/**
 * Grid topology. Cells are indexed `y * width + x`.
 * Connections of a tile are a 4-bit mask: N=1, E=2, S=4, W=8.
 * Rotating a tile clockwise shifts its mask left (N -> E -> S -> W -> N).
 */

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

/** Direction bits in clockwise order. */
export const DIRS = [N, E, S, W] as const;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export function opposite(dirIndex: number): number {
  return (dirIndex + 2) & 3;
}

/** Rotate a connection mask clockwise by `r` quarter turns. */
export function rotateMask(mask: number, r: number): number {
  r &= 3;
  if (r === 0) return mask;
  return ((mask << r) | (mask >> (4 - r))) & 15;
}

export function popcount4(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
}

/** Distinct orientations a tile can take (a straight pipe only has 2, a cross 1). */
export function distinctRotations(mask: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < 4; r++) {
    const m = rotateMask(mask, r);
    if (!out.includes(m)) out.push(m);
  }
  return out;
}

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly size: number;
  /** active[i] === 1 when the cell belongs to the garden shape. */
  readonly active: Uint8Array;
  readonly wrap: boolean;
  /** Neighbour table: nb[i * 4 + d] = neighbour index or -1. */
  private readonly nb: Int32Array;
  /** Indices of active cells, in reading order. */
  readonly cells: number[];

  constructor(width: number, height: number, active: Uint8Array, wrap = false) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.active = active;
    this.wrap = wrap;
    this.nb = new Int32Array(this.size * 4).fill(-1);
    this.cells = [];
    for (let i = 0; i < this.size; i++) {
      if (!active[i]) continue;
      this.cells.push(i);
      const x = i % width;
      const y = (i / width) | 0;
      for (let d = 0; d < 4; d++) {
        let nx = x + DX[d];
        let ny = y + DY[d];
        if (wrap) {
          nx = (nx + width) % width;
          ny = (ny + height) % height;
        } else if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const j = ny * width + nx;
        if (j !== i && active[j]) this.nb[i * 4 + d] = j;
      }
    }
  }

  static rect(width: number, height: number, wrap = false): Grid {
    return new Grid(width, height, new Uint8Array(width * height).fill(1), wrap);
  }

  neighbor(i: number, d: number): number {
    return this.nb[i * 4 + d];
  }

  x(i: number): number {
    return i % this.width;
  }

  y(i: number): number {
    return (i / this.width) | 0;
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  isActive(i: number): boolean {
    return i >= 0 && i < this.size && this.active[i] === 1;
  }

  /** Mask of directions that lead to another active cell. */
  openMask(i: number): number {
    let m = 0;
    for (let d = 0; d < 4; d++) if (this.nb[i * 4 + d] >= 0) m |= 1 << d;
    return m;
  }
}
