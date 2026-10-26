/**
 * Logical solver for the pipe puzzle.
 *
 * It only performs sound deductions, so when it reaches a state where every
 * tile has a single orientation left, that solution is guaranteed unique.
 * The generator uses it to reject (and repair) ambiguous gardens.
 *
 * Deductions:
 *  - local: two neighbours agree on their shared side; nothing opens on a border;
 *  - loops: an undecided side joining two already-connected tiles must stay closed;
 *  - isolation: a connected group with a single possible way out must take it,
 *    and two groups that would close each other off must not be joined.
 *  - (optional) trial: an orientation that leads to a contradiction is removed.
 */
import { Grid, distinctRotations, opposite } from './grid';

export type SolveStatus = 'solved' | 'stuck' | 'contradiction';

export interface SolveResult {
  status: SolveStatus;
  /** Cells that still have more than one possible orientation. */
  undetermined: number[];
  /** Final mask for every cell when solved. */
  solution?: Uint8Array;
}

interface State {
  /** Distinct orientation masks for each cell (static). */
  opts: number[][];
  /** Bitset of orientations still possible for each cell. */
  alive: Uint8Array;
}

const EAST = 1;
const SOUTH = 2;

function must(st: State, i: number): number {
  const o = st.opts[i];
  const a = st.alive[i];
  let m = 15;
  for (let k = 0; k < o.length; k++) if (a & (1 << k)) m &= o[k];
  return a ? m : 0;
}

function can(st: State, i: number): number {
  const o = st.opts[i];
  const a = st.alive[i];
  let m = 0;
  for (let k = 0; k < o.length; k++) if (a & (1 << k)) m |= o[k];
  return m;
}

/** Keep only the orientations of cell i whose side `bit` is open (want=true) or closed. */
function restrict(st: State, i: number, bit: number, want: boolean): boolean {
  const o = st.opts[i];
  const a = st.alive[i];
  let na = a;
  for (let k = 0; k < o.length; k++) {
    if (!(a & (1 << k))) continue;
    if (((o[k] & bit) !== 0) !== want) na &= ~(1 << k);
  }
  if (na === a) return false;
  st.alive[i] = na;
  return true;
}

function propagateLocal(grid: Grid, st: State, queue: number[], queued: Uint8Array): boolean {
  while (queue.length) {
    const i = queue.pop()!;
    queued[i] = 0;
    if (!st.alive[i]) return false;
    const m = must(st, i);
    const c = can(st, i);
    for (let d = 0; d < 4; d++) {
      const j = grid.neighbor(i, d);
      if (j < 0) continue;
      const bit = 1 << d;
      const ob = 1 << opposite(d);
      let changed = false;
      if (m & bit) changed = restrict(st, j, ob, true);
      else if (!(c & bit)) changed = restrict(st, j, ob, false);
      if (changed) {
        if (!st.alive[j]) return false;
        if (!queued[j]) {
          queued[j] = 1;
          queue.push(j);
        }
      }
    }
  }
  return true;
}

type GlobalOutcome = 'changed' | 'stable' | 'contradiction';

function globalPass(grid: Grid, st: State): GlobalOutcome {
  const size = grid.size;
  const parent = new Int32Array(size);
  for (let i = 0; i < size; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  const total = grid.cells.length;
  const undecided: number[] = []; // pairs (i, d)

  for (const i of grid.cells) {
    const m = must(st, i);
    const c = can(st, i);
    for (const d of [EAST, SOUTH]) {
      const j = grid.neighbor(i, d);
      if (j < 0) continue;
      const bit = 1 << d;
      if (m & bit) {
        const ri = find(i);
        const rj = find(j);
        if (ri === rj) return 'contradiction'; // closed loop
        parent[ri] = rj;
      } else if (c & bit) {
        undecided.push(i, d);
      }
    }
  }

  // Rule: never close a loop.
  let changed = false;
  for (let k = 0; k < undecided.length; k += 2) {
    const i = undecided[k];
    const d = undecided[k + 1];
    const j = grid.neighbor(i, d);
    if (find(i) === find(j)) {
      restrict(st, i, 1 << d, false);
      restrict(st, j, 1 << opposite(d), false);
      changed = true;
    }
  }
  if (changed) return 'changed';

  const compSize = new Int32Array(size);
  for (const i of grid.cells) compSize[find(i)]++;
  if (total === 1) return 'stable';

  const exits = new Int32Array(size);
  const lastExit = new Int32Array(size).fill(-1);
  const between = new Map<number, number>();
  for (let k = 0; k < undecided.length; k += 2) {
    const i = undecided[k];
    const j = grid.neighbor(i, undecided[k + 1]);
    const ri = find(i);
    const rj = find(j);
    exits[ri]++;
    exits[rj]++;
    lastExit[ri] = k;
    lastExit[rj] = k;
    const key = ri < rj ? ri * size + rj : rj * size + ri;
    between.set(key, (between.get(key) ?? 0) + 1);
  }

  // Rule: a group must reach the rest of the garden.
  for (const i of grid.cells) {
    if (find(i) !== i) continue;
    if (compSize[i] >= total) continue;
    if (exits[i] === 0) return 'contradiction';
    if (exits[i] === 1) {
      const k = lastExit[i];
      const a = undecided[k];
      const d = undecided[k + 1];
      restrict(st, a, 1 << d, true);
      restrict(st, grid.neighbor(a, d), 1 << opposite(d), true);
      changed = true;
    }
  }
  if (changed) return 'changed';

  // Rule: do not join two groups if the union would be sealed off.
  for (let k = 0; k < undecided.length; k += 2) {
    const i = undecided[k];
    const d = undecided[k + 1];
    const j = grid.neighbor(i, d);
    const ri = find(i);
    const rj = find(j);
    if (compSize[ri] + compSize[rj] >= total) continue;
    const key = ri < rj ? ri * size + rj : rj * size + ri;
    const shared = between.get(key) ?? 0;
    if (exits[ri] + exits[rj] - 2 * shared === 0) {
      restrict(st, i, 1 << d, false);
      restrict(st, j, 1 << opposite(d), false);
      changed = true;
    }
  }
  return changed ? 'changed' : 'stable';
}

function countBits(a: number): number {
  return (a & 1) + ((a >> 1) & 1) + ((a >> 2) & 1) + ((a >> 3) & 1);
}

function deduce(grid: Grid, st: State, depth: number): boolean {
  const queued = new Uint8Array(grid.size);
  const queue: number[] = [];
  const enqueueAll = () => {
    for (const i of grid.cells) {
      if (!queued[i]) {
        queued[i] = 1;
        queue.push(i);
      }
    }
  };
  enqueueAll();
  for (;;) {
    if (!propagateLocal(grid, st, queue, queued)) return false;
    const g = globalPass(grid, st);
    if (g === 'contradiction') return false;
    if (g === 'changed') {
      enqueueAll();
      continue;
    }
    if (depth <= 0) return true;

    // Trial: remove orientations that lead to a contradiction.
    let progressed = false;
    for (const i of grid.cells) {
      const a = st.alive[i];
      if (countBits(a) < 2) continue;
      for (let k = 0; k < st.opts[i].length; k++) {
        if (!(st.alive[i] & (1 << k))) continue;
        const trial: State = { opts: st.opts, alive: st.alive.slice() };
        trial.alive[i] = 1 << k;
        if (!deduce(grid, trial, depth - 1)) {
          st.alive[i] &= ~(1 << k);
          if (!st.alive[i]) return false;
          progressed = true;
        }
      }
      if (progressed) break;
    }
    if (!progressed) return true;
    enqueueAll();
  }
}

/**
 * Solve the puzzle made of `tiles` (connection masks in any orientation).
 * `depth` = 0 for pure deduction, 1 to also allow one level of trial.
 */
export function solve(grid: Grid, tiles: ArrayLike<number>, depth = 0): SolveResult {
  const opts: number[][] = [];
  const alive = new Uint8Array(grid.size);
  for (let i = 0; i < grid.size; i++) {
    if (!grid.active[i]) {
      opts.push([]);
      continue;
    }
    const o = distinctRotations(tiles[i]);
    opts.push(o);
    const open = grid.openMask(i);
    let a = 0;
    for (let k = 0; k < o.length; k++) if ((o[k] & ~open) === 0) a |= 1 << k;
    alive[i] = a;
  }
  const st: State = { opts, alive };
  if (grid.cells.some((i) => !st.alive[i]) || !deduce(grid, st, depth)) {
    return { status: 'contradiction', undetermined: [] };
  }
  const undetermined = grid.cells.filter((i) => countBits(st.alive[i]) > 1);
  if (undetermined.length) return { status: 'stuck', undetermined };
  const solution = new Uint8Array(grid.size);
  for (const i of grid.cells) solution[i] = must(st, i);
  return { status: 'solved', undetermined, solution };
}
