/**
 * Grid topology. Cells are indexed `y * width + x`.
 *
 * Square grids: connections of a tile are a 4-bit mask, N=1, E=2, S=4, W=8.
 * Hexagonal grids (flat-topped hexagons, odd columns shifted half a cell
 * down): a 6-bit mask, N, NE, SE, S, SW, NW from bit 0 to bit 5.
 * Either way, rotating a tile clockwise shifts its mask left by one bit.
 */

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

/** Hexagonal sides, clockwise from the top. */
export const HN = 1;
export const HNE = 2;
export const HSE = 4;
export const HS = 8;
export const HSW = 16;
export const HNW = 32;

/** Direction bits in clockwise order. */
export const DIRS = [N, E, S, W] as const;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

const R3 = Math.sqrt(3) / 2;

/**
 * Unit vectors from a cell centre toward each neighbour's centre, in tile
 * units (neighbours are 1 apart, each side's midpoint is 0.5 away), y down.
 */
export const SQUARE_VECS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const HEX_VECS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [R3, -0.5],
  [R3, 0.5],
  [0, 1],
  [-R3, 0.5],
  [-R3, -0.5],
];

export function dirVecs(sides: number): ReadonlyArray<readonly [number, number]> {
  return sides === 6 ? HEX_VECS : SQUARE_VECS;
}

/** Horizontal distance between two hexagonal columns, in tile units. */
export const HEX_COL = R3;

/** Neighbour offsets [dx, dy] of a hexagonal cell, for even and odd columns. */
const HEX_EVEN: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [-1, -1],
];
const HEX_ODD: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

export function hexOffset(x: number, d: number): readonly [number, number] {
  return (x & 1 ? HEX_ODD : HEX_EVEN)[d];
}

export function opposite(dirIndex: number, sides = 4): number {
  return (dirIndex + sides / 2) % sides;
}

/** Rotate a connection mask clockwise by `r` steps (quarter turns, or sixth turns on hexagons). */
export function rotateMask(mask: number, r: number, sides = 4): number {
  r = ((r % sides) + sides) % sides;
  if (r === 0) return mask;
  return ((mask << r) | (mask >> (sides - r))) & ((1 << sides) - 1);
}

export function popcount(mask: number): number {
  let n = 0;
  for (; mask; mask &= mask - 1) n++;
  return n;
}

/** Number of open sides of a square tile. */
export const popcount4 = popcount;

/** Distinct orientations a tile can take (a straight pipe only has 2, a cross 1). */
export function distinctRotations(mask: number, sides = 4): number[] {
  const out: number[] = [];
  for (let r = 0; r < sides; r++) {
    const m = rotateMask(mask, r, sides);
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
  /** Hexagonal tiles (6 sides) instead of squares. */
  readonly hex: boolean;
  /** Sides of a tile: 4 or 6. */
  readonly sides: 4 | 6;
  /** Neighbour table: nb[i * sides + d] = neighbour index or -1. */
  private readonly nb: Int32Array;
  /** Indices of active cells, in reading order. */
  readonly cells: number[];

  constructor(width: number, height: number, active: Uint8Array, wrap = false, hex = false) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.active = active;
    // A hexagonal garden never wraps: its columns would not line up across the edge.
    this.wrap = wrap && !hex;
    this.hex = hex;
    this.sides = hex ? 6 : 4;
    const sides = this.sides;
    this.nb = new Int32Array(this.size * sides).fill(-1);
    this.cells = [];
    for (let i = 0; i < this.size; i++) {
      if (!active[i]) continue;
      this.cells.push(i);
      const x = i % width;
      const y = (i / width) | 0;
      for (let d = 0; d < sides; d++) {
        const [dx, dy] = hex ? hexOffset(x, d) : [DX[d], DY[d]];
        let nx = x + dx;
        let ny = y + dy;
        if (this.wrap) {
          nx = (nx + width) % width;
          ny = (ny + height) % height;
        } else if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const j = ny * width + nx;
        if (j !== i && active[j]) this.nb[i * sides + d] = j;
      }
    }
  }

  static rect(width: number, height: number, wrap = false): Grid {
    return new Grid(width, height, new Uint8Array(width * height).fill(1), wrap);
  }

  static hexRect(width: number, height: number): Grid {
    return new Grid(width, height, new Uint8Array(width * height).fill(1), false, true);
  }

  neighbor(i: number, d: number): number {
    return this.nb[i * this.sides + d];
  }

  opposite(d: number): number {
    return (d + this.sides / 2) % this.sides;
  }

  rotate(mask: number, r: number): number {
    return rotateMask(mask, r, this.sides);
  }

  /** Mask with every side open. */
  get full(): number {
    return (1 << this.sides) - 1;
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
    for (let d = 0; d < this.sides; d++) if (this.nb[i * this.sides + d] >= 0) m |= 1 << d;
    return m;
  }

  /** Centre of cell i in tile units (square cells: x + 0.5; hexagons: columns 0.87 apart, odd ones half a tile lower). */
  center(i: number): [number, number] {
    const x = this.x(i);
    const y = this.y(i);
    if (!this.hex) return [x + 0.5, y + 0.5];
    return [x * HEX_COL, y + 0.5 + (x & 1 ? 0.5 : 0)];
  }
}
