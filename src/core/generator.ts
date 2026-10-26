/**
 * Seeded garden generator.
 *
 * 1. Grow a random spanning tree from the central spring (growing-tree
 *    algorithm: `windiness` balances long winding canals vs bushy branches).
 * 2. Ask the solver whether the tiles admit a single, deducible solution.
 *    While some tiles stay ambiguous, locally rewire the tree around them
 *    (add an edge next to an ambiguous tile, remove another one on the loop
 *    it creates) and try again.
 * 3. Advanced levels: keep rewiring at random, accepting only gardens that
 *    stay uniquely solvable with hypothesis reasoning ("if this tile pointed
 *    there, these two dead ends would close on themselves") but leave more and
 *    more tiles that plain deductions cannot settle.
 * 4. Scramble every tile with a random rotation.
 *
 * Everything is driven by the seed, so a level never needs to be stored.
 */
import { Grid, opposite, popcount4, rotateMask } from './grid';
import { Rng } from './rng';
import { buildShape, ShapeId, sourceCell } from './shapes';
import { solve } from './solver';

export interface GenParams {
  width: number;
  height: number;
  shape: ShapeId;
  seed: number | string;
  /** 0 = bushy (many short branches), 1 = long winding canals. */
  windiness: number;
  /** Max connections for regular tiles (the spring can always have 4). */
  maxDegree?: 3 | 4;
  /** 0 = solvable by pure deduction, 1 = may need one step of trial. */
  solverDepth?: 0 | 1;
  maxRepairs?: number;
  wrap?: boolean;
  /**
   * Share of tiles (0..1) that plain deductions must leave open, so that the
   * garden needs hypothesis reasoning. 0 or undefined: a "direct" garden.
   */
  advanced?: number;
  maxHarden?: number;
}

export interface Puzzle {
  grid: Grid;
  source: number;
  /** Connection mask of every cell in the solved garden. */
  solution: Uint8Array;
  /** Scrambled masks: what the player starts with. */
  tiles: Uint8Array;
  /** True when the solver proved the solution unique. */
  unique: boolean;
  repairs: number;
  /** Tiles plain deductions cannot settle (they need hypothesis reasoning). */
  deepCells?: number;
}

function link(conn: Uint8Array, grid: Grid, i: number, d: number): void {
  const j = grid.neighbor(i, d);
  conn[i] |= 1 << d;
  conn[j] |= 1 << opposite(d);
}

function unlink(conn: Uint8Array, grid: Grid, i: number, d: number): void {
  const j = grid.neighbor(i, d);
  conn[i] &= ~(1 << d);
  conn[j] &= ~(1 << opposite(d));
}

function growTree(grid: Grid, source: number, rng: Rng, windiness: number, maxDegree: number): Uint8Array {
  const conn = new Uint8Array(grid.size);
  const inTree = new Uint8Array(grid.size);
  inTree[source] = 1;
  let count = 1;
  const total = grid.cells.length;
  let active = [source];
  let relaxed = false;
  const cap = (i: number) => (i === source || relaxed ? 4 : maxDegree);

  while (count < total) {
    while (active.length) {
      const idx = rng.chance(windiness) ? active.length - 1 : rng.int(active.length);
      const c = active[idx];
      const cand: number[] = [];
      if (popcount4(conn[c]) < cap(c)) {
        for (let d = 0; d < 4; d++) {
          const j = grid.neighbor(c, d);
          if (j >= 0 && !inTree[j]) cand.push(d);
        }
      }
      if (!cand.length) {
        active.splice(idx, 1);
        continue;
      }
      const d = rng.pick(cand);
      const j = grid.neighbor(c, d);
      link(conn, grid, c, d);
      inTree[j] = 1;
      active.push(j);
      count++;
    }
    if (count < total) {
      // Degree caps walled off part of the garden: allow 4-way tiles to finish.
      relaxed = true;
      active = grid.cells.filter((i) => inTree[i]);
    }
  }
  return conn;
}

/** Cells on the tree path from a to b (inclusive). */
function treePath(grid: Grid, conn: Uint8Array, a: number, b: number): number[] {
  const prev = new Int32Array(grid.size).fill(-2);
  prev[a] = -1;
  const queue = [a];
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (i === b) break;
    for (let d = 0; d < 4; d++) {
      if (!(conn[i] & (1 << d))) continue;
      const j = grid.neighbor(i, d);
      if (prev[j] !== -2) continue;
      prev[j] = i;
      queue.push(j);
    }
  }
  const path: number[] = [];
  for (let i = b; i !== -1; i = prev[i]) path.push(i);
  return path.reverse();
}

function dirTo(grid: Grid, a: number, b: number): number {
  for (let d = 0; d < 4; d++) if (grid.neighbor(a, d) === b) return d;
  return -1;
}

/** Rewire the tree next to an ambiguous tile. Returns false if nothing could be changed. */
function repair(
  grid: Grid,
  conn: Uint8Array,
  ambiguous: number[],
  rng: Rng,
  source: number,
  maxDegree: number,
): boolean {
  const cap = (i: number) => (i === source ? 4 : maxDegree);
  for (let attempt = 0; attempt < 24; attempt++) {
    const c = rng.pick(ambiguous);
    const dirs = rng.shuffle([0, 1, 2, 3]);
    for (const d of dirs) {
      const j = grid.neighbor(c, d);
      if (j < 0 || conn[c] & (1 << d)) continue;
      const path = treePath(grid, conn, c, j);
      const degC = popcount4(conn[c]) + 1;
      const degJ = popcount4(conn[j]) + 1;
      const options: number[] = [];
      for (let k = 0; k + 1 < path.length; k++) {
        const a = path[k];
        const b = path[k + 1];
        const touchC = a === c || b === c ? 1 : 0;
        const touchJ = a === j || b === j ? 1 : 0;
        if (degC - touchC <= cap(c) && degJ - touchJ <= cap(j)) options.push(k);
      }
      if (!options.length) continue;
      const k = rng.pick(options);
      link(conn, grid, c, d);
      unlink(conn, grid, path[k], dirTo(grid, path[k], path[k + 1]));
      return true;
    }
  }
  return false;
}

export function generate(params: GenParams): Puzzle {
  const rng = new Rng(params.seed);
  const shapeRng = rng.fork('shape');
  const treeRng = rng.fork('tree');
  const repairRng = rng.fork('repair');
  const scrambleRng = rng.fork('scramble');

  const { width, height } = params;
  const maxDegree = params.maxDegree ?? 3;
  const depth = params.solverDepth ?? 0;
  // Joined edges remove the borders the deductions start from: allow more rewiring.
  const maxRepairs = params.maxRepairs ?? (params.wrap ? 3000 : 400);

  const active = buildShape(params.shape, width, height, shapeRng);
  const grid = new Grid(width, height, active, params.wrap ?? false);
  const source = sourceCell(active, width, height);

  const conn = growTree(grid, source, treeRng, params.windiness, maxDegree);

  let unique = false;
  let repairs = 0;
  for (; repairs <= maxRepairs; repairs++) {
    const res = solve(grid, conn, depth);
    if (res.status === 'solved') {
      unique = true;
      break;
    }
    if (res.status !== 'stuck' || repairs === maxRepairs) break;
    if (!repair(grid, conn, res.undetermined, repairRng, source, maxDegree)) break;
  }
  // Last resort: one level of trial can still prove the solution unique.
  if (!unique && depth === 0) unique = solve(grid, conn, 1).status === 'solved';

  const openAfterBasics = () => {
    const res = solve(grid, conn, 0);
    return res.status === 'solved' ? 0 : res.undetermined.length;
  };
  let deepCells = unique ? openAfterBasics() : 0;
  if (params.advanced && unique) {
    const hardenRng = rng.fork('harden');
    const target = Math.max(2, Math.round(grid.cells.length * params.advanced));
    // Too many open tiles would turn the garden into a chain of guesses.
    const ceiling = target * 2;
    const maxHarden = params.maxHarden ?? 1200;
    for (let k = 0; k < maxHarden && deepCells < target; k++) {
      const saved = conn.slice();
      if (!repair(grid, conn, grid.cells, hardenRng, source, maxDegree)) break;
      const open = openAfterBasics();
      if (open < deepCells || open > ceiling || (open > 0 && solve(grid, conn, 1).status !== 'solved')) {
        conn.set(saved);
        continue;
      }
      deepCells = open;
    }
  }

  const tiles = new Uint8Array(grid.size);
  let scrambled = 0;
  for (const i of grid.cells) {
    tiles[i] = rotateMask(conn[i], scrambleRng.int(4));
    if (tiles[i] !== conn[i]) scrambled++;
  }
  // Make sure the garden never starts (almost) solved.
  if (scrambled < Math.min(3, grid.cells.length)) {
    for (const i of grid.cells) tiles[i] = rotateMask(conn[i], 1);
  }

  return { grid, source, solution: conn, tiles, unique, repairs, deepCells };
}
