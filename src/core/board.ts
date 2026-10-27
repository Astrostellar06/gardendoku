/**
 * Playable state of a garden: tile rotations, locks, and the analysis of
 * the resulting network (which tiles get water, where loops are, victory).
 */
import { Puzzle } from './generator';
import { Grid } from './grid';

export interface Analysis {
  /** Sides of each tile that are joined with the neighbouring tile. */
  linked: Uint8Array;
  /** 1 when the tile is connected to the spring. */
  watered: Uint8Array;
  /** Distance (in tiles) from the spring, -1 when dry. */
  dist: Int32Array;
  /** Side through which water enters the tile, -1 for the spring / dry tiles. */
  inflow: Int8Array;
  /** Sides that belong to a closed loop. */
  loopSides: Uint8Array;
  /** Tiles connected to the spring, in BFS order. */
  order: number[];
  wateredCount: number;
  loopCells: number;
  solved: boolean;
}

export interface BoardSnapshot {
  rot: string;
  locked: string;
  moves: number;
  time: number;
  /** Generator version the garden came from. */
  version?: number;
}

export class Board {
  readonly puzzle: Puzzle;
  readonly grid: Grid;
  readonly source: number;
  readonly base: Uint8Array;
  readonly rot: Uint8Array;
  readonly locked: Uint8Array;
  moves = 0;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.grid = puzzle.grid;
    this.source = puzzle.source;
    this.base = puzzle.tiles;
    this.rot = new Uint8Array(this.grid.size);
    this.locked = new Uint8Array(this.grid.size);
  }

  mask(i: number): number {
    return this.grid.rotate(this.base[i], this.rot[i]);
  }

  /** Rotate clockwise (dir = 1) or counter-clockwise (dir = -1) by one step. Returns false if locked. */
  rotate(i: number, dir: 1 | -1 = 1): boolean {
    if (!this.grid.isActive(i) || this.locked[i]) return false;
    const sides = this.grid.sides;
    this.rot[i] = (this.rot[i] + dir + sides) % sides;
    this.moves++;
    return true;
  }

  toggleLock(i: number): boolean {
    if (!this.grid.isActive(i)) return false;
    this.locked[i] ^= 1;
    return this.locked[i] === 1;
  }

  /** Lock or unlock tile i. Returns true if its state changed. */
  setLock(i: number, on: boolean): boolean {
    if (!this.grid.isActive(i) || (this.locked[i] === 1) === on) return false;
    this.locked[i] = on ? 1 : 0;
    return true;
  }

  reset(): void {
    this.rot.fill(0);
    this.locked.fill(0);
    this.moves = 0;
  }

  isCorrect(i: number): boolean {
    return this.mask(i) === this.puzzle.solution[i];
  }

  /** Turn tile i to its solved orientation and lock it (hint). Returns the steps applied. */
  applySolution(i: number): number {
    const sides = this.grid.sides;
    for (let k = 0; k < sides; k++) {
      if (this.grid.rotate(this.base[i], this.rot[i] + k) === this.puzzle.solution[i]) {
        this.rot[i] = (this.rot[i] + k) % sides;
        this.locked[i] = 1;
        return k;
      }
    }
    return 0;
  }

  /** Put every tile in its solved orientation (debug / end screen). */
  solveInstantly(): void {
    for (const i of this.grid.cells) {
      for (let r = 0; r < this.grid.sides; r++) {
        if (this.grid.rotate(this.base[i], r) === this.puzzle.solution[i]) {
          this.rot[i] = r;
          break;
        }
      }
    }
  }

  analyze(): Analysis {
    const { grid } = this;
    const size = grid.size;
    const sides = grid.sides;
    const linked = new Uint8Array(size);
    for (const i of grid.cells) {
      const m = this.mask(i);
      for (let d = 0; d < sides; d++) {
        if (!(m & (1 << d))) continue;
        const j = grid.neighbor(i, d);
        if (j >= 0 && this.mask(j) & (1 << grid.opposite(d))) linked[i] |= 1 << d;
      }
    }

    // Water spreads from the spring through joined sides.
    const watered = new Uint8Array(size);
    const dist = new Int32Array(size).fill(-1);
    const inflow = new Int8Array(size).fill(-1);
    const order = [this.source];
    watered[this.source] = 1;
    dist[this.source] = 0;
    for (let q = 0; q < order.length; q++) {
      const i = order[q];
      for (let d = 0; d < sides; d++) {
        if (!(linked[i] & (1 << d))) continue;
        const j = grid.neighbor(i, d);
        if (watered[j]) continue;
        watered[j] = 1;
        dist[j] = dist[i] + 1;
        inflow[j] = grid.opposite(d);
        order.push(j);
      }
    }

    const loopSides = findLoopSides(grid, linked);
    let loopCells = 0;
    for (const i of grid.cells) if (loopSides[i]) loopCells++;

    const wateredCount = order.length;
    const solved = wateredCount === grid.cells.length && loopCells === 0;
    return { linked, watered, dist, inflow, loopSides, order, wateredCount, loopCells, solved };
  }

  snapshot(time: number): BoardSnapshot {
    return {
      rot: Array.from(this.rot, (r, i) => (this.grid.active[i] ? String(r) : '0')).join(''),
      locked: Array.from(this.locked, (l) => String(l)).join(''),
      moves: this.moves,
      time,
    };
  }

  restore(snap: BoardSnapshot): boolean {
    if (snap.rot.length !== this.grid.size || snap.locked.length !== this.grid.size) return false;
    for (let i = 0; i < this.grid.size; i++) {
      this.rot[i] = Number(snap.rot[i]) % this.grid.sides;
      this.locked[i] = snap.locked[i] === '1' ? 1 : 0;
    }
    this.moves = snap.moves;
    return true;
  }
}

/**
 * Sides that lie on a cycle of the joined network: every edge that is not a
 * bridge (iterative Tarjan, so large gardens cannot overflow the stack).
 */
function findLoopSides(grid: Grid, linked: Uint8Array): Uint8Array {
  const size = grid.size;
  const disc = new Int32Array(size).fill(-1);
  const low = new Int32Array(size);
  const loopSides = new Uint8Array(size);
  const bridge = new Uint8Array(size); // sides that are bridges
  let time = 0;

  const stackNode: number[] = [];
  const stackIn: number[] = []; // direction index used to enter the node (-1 for roots)
  const stackDir: number[] = []; // next direction to explore

  for (const root of grid.cells) {
    if (disc[root] >= 0 || !linked[root]) continue;
    disc[root] = low[root] = time++;
    stackNode.push(root);
    stackIn.push(-1);
    stackDir.push(0);
    while (stackNode.length) {
      const top = stackNode.length - 1;
      const u = stackNode[top];
      const d = stackDir[top];
      if (d < grid.sides) {
        stackDir[top] = d + 1;
        if (!(linked[u] & (1 << d))) continue;
        const inDir = stackIn[top];
        if (inDir >= 0 && d === grid.opposite(inDir)) continue; // edge back to the parent
        const v = grid.neighbor(u, d);
        if (disc[v] < 0) {
          disc[v] = low[v] = time++;
          stackNode.push(v);
          stackIn.push(d);
          stackDir.push(0);
        } else {
          low[u] = Math.min(low[u], disc[v]);
        }
      } else {
        stackNode.pop();
        const inDir = stackIn.pop()!;
        stackDir.pop();
        if (stackNode.length && inDir >= 0) {
          const p = stackNode[stackNode.length - 1];
          low[p] = Math.min(low[p], low[u]);
          if (low[u] > disc[p]) {
            bridge[p] |= 1 << inDir;
            bridge[u] |= 1 << grid.opposite(inDir);
          }
        }
      }
    }
  }

  for (const i of grid.cells) loopSides[i] = linked[i] & ~bridge[i];
  return loopSides;
}
