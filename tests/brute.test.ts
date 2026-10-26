import { expect, it } from 'vitest';
import { generate } from '../src/core/generator';
import { distinctRotations, Grid, opposite } from '../src/core/grid';

/** Count solutions (up to `limit`) by plain backtracking: reading order, check W/N sides, union-find loops. */
function countSolutions(grid: Grid, tiles: ArrayLike<number>, limit = 2): number {
  const cells = grid.cells;
  const choice = new Int32Array(grid.size).fill(-1);
  const parent = new Int32Array(grid.size);
  for (let i = 0; i < grid.size; i++) parent[i] = i;
  const find = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  let count = 0;
  const opts = cells.map((i) => distinctRotations(tiles[i]));
  const rec = (k: number) => {
    if (count >= limit) return;
    if (k === cells.length) {
      // connected: all in one component
      const r = find(cells[0]);
      if (cells.every((c) => find(c) === r)) count++;
      return;
    }
    const i = cells[k];
    for (const m of opts[k]) {
      let ok = true;
      for (let d = 0; d < 4 && ok; d++) {
        const j = grid.neighbor(i, d);
        const open = (m >> d) & 1;
        if (j < 0) { if (open) ok = false; continue; }
        if (choice[j] < 0) continue;
        const back = (choice[j] >> opposite(d)) & 1;
        if (open !== back) ok = false;
      }
      if (!ok) continue;
      const undo: number[] = [];
      let loop = false;
      for (let d = 0; d < 4; d++) {
        const j = grid.neighbor(i, d);
        if (j < 0 || choice[j] < 0 || !((m >> d) & 1)) continue;
        const a = find(i), b = find(j);
        if (a === b) { loop = true; break; }
        parent[a] = b; undo.push(a);
      }
      if (!loop) { choice[i] = m; rec(k + 1); choice[i] = -1; }
      for (const a of undo.reverse()) parent[a] = a;
    }
  };
  rec(0);
  return count;
}

it('solver uniqueness claims match brute force', () => {
  let checked = 0;
  for (let s = 0; s < 60; s++) {
    const w = 4 + (s % 3), h = 4 + ((s >> 1) % 3);
    const p = generate({ width: w, height: h, shape: 'rect', seed: 'bf' + s, windiness: (s % 10) / 10, maxRepairs: 0 });
    const n = countSolutions(p.grid, p.tiles, 2);
    expect(n).toBeGreaterThanOrEqual(1);
    if (p.unique) { expect(n, `seed ${s}`).toBe(1); checked++; }
  }
  console.log('unique puzzles verified:', checked);
});
