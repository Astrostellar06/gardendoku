import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import { generate, Puzzle } from '../src/core/generator';
import { E, Grid, N, rotateMask, S, W } from '../src/core/grid';
import { buildLevel, levelInfo } from '../src/core/levels';
import { solve } from '../src/core/solver';

describe('grid', () => {
  it('rotates masks clockwise', () => {
    expect(rotateMask(N, 1)).toBe(E);
    expect(rotateMask(N | E, 1)).toBe(E | S);
    expect(rotateMask(W, 1)).toBe(N);
    expect(rotateMask(N | S, 2)).toBe(N | S);
  });
});

describe('generator', () => {
  it('is deterministic for a given seed', () => {
    const a = generate({ width: 7, height: 7, shape: 'rect', seed: 'abc', windiness: 0.5 });
    const b = generate({ width: 7, height: 7, shape: 'rect', seed: 'abc', windiness: 0.5 });
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    const c = generate({ width: 7, height: 7, shape: 'rect', seed: 'abd', windiness: 0.5 });
    expect(Array.from(a.tiles)).not.toEqual(Array.from(c.tiles));
  });

  it('builds a spanning tree with no loop', () => {
    for (let n = 1; n <= 40; n++) {
      const p = buildLevel(n);
      const board = new Board(p);
      board.solveInstantly();
      const an = board.analyze();
      expect(an.solved, `level ${n}`).toBe(true);
    }
  });

  it('never starts solved', () => {
    for (let n = 1; n <= 40; n++) {
      expect(new Board(buildLevel(n)).analyze().solved).toBe(false);
    }
  });

  it('produces uniquely solvable gardens for the first 150 levels', () => {
    const failures: number[] = [];
    for (let n = 1; n <= 150; n++) {
      const p: Puzzle = buildLevel(n);
      if (!p.unique) failures.push(n);
      // Advanced levels need hypothesis reasoning (depth 1); it also settles the others.
      const res = solve(p.grid, p.tiles, 1);
      if (p.unique) {
        expect(res.status).toBe('solved');
        expect(Array.from(res.solution!)).toEqual(Array.from(p.solution));
      }
    }
    expect(failures).toEqual([]);
  });

  it('keeps level parameters stable', () => {
    const info = levelInfo(1);
    expect([info.width, info.height, info.shape]).toEqual([5, 5, 'rect']);
  });
});

describe('board analysis', () => {
  it('detects a loop', () => {
    const grid = Grid.rect(2, 2);
    // Four corners forming a closed square: (0,0)=E|S, (1,0)=S|W, (0,1)=N|E, (1,1)=N|W
    const tiles = new Uint8Array([E | S, S | W, N | E, N | W]);
    const puzzle: Puzzle = { grid, source: 0, solution: tiles, tiles, unique: false, repairs: 0 };
    const an = new Board(puzzle).analyze();
    expect(an.loopCells).toBe(4);
    expect(an.solved).toBe(false);
    expect(an.wateredCount).toBe(4);
  });

  it('reports dry tiles and inflow direction', () => {
    const grid = Grid.rect(3, 1);
    const tiles = new Uint8Array([E, W | E, N]);
    const puzzle: Puzzle = { grid, source: 0, solution: tiles, tiles, unique: false, repairs: 0 };
    const an = new Board(puzzle).analyze();
    expect(Array.from(an.watered)).toEqual([1, 1, 0]);
    expect(an.inflow[1]).toBe(3); // water enters from the west
    expect(an.loopCells).toBe(0);
  });
});

describe('advanced levels', () => {
  it('ask for hypothesis reasoning from level 21 on', () => {
    expect(levelInfo(20).advanced).toBe(0);
    expect(levelInfo(21).advanced).toBeGreaterThan(0);
    let needing = 0;
    let total = 0;
    for (let n = 21; n <= 60; n++) {
      if (n % 5 === 0) continue;
      const p = buildLevel(n);
      expect(p.unique, `level ${n}`).toBe(true);
      total++;
      if ((p.deepCells ?? 0) > 0) needing++;
    }
    expect(needing).toBeGreaterThan(total * 0.7);
  });
});

describe('hard levels (joined edges)', () => {
  it('appear every 5 levels on square gardens', () => {
    for (let n = 1; n <= 60; n++) {
      const info = levelInfo(n);
      expect(info.wrap, `level ${n}`).toBe(n % 5 === 0);
      if (info.wrap) expect(info.width).toBe(info.height);
    }
  });

  it('are uniquely solvable and solved by their own solution', () => {
    for (let n = 5; n <= 150; n += 5) {
      const p = buildLevel(n);
      expect(p.grid.wrap).toBe(true);
      expect(p.unique, `level ${n}`).toBe(true);
      const board = new Board(p);
      board.solveInstantly();
      expect(board.analyze().solved).toBe(true);
    }
  });

  it('lets water cross an edge', () => {
    const grid = Grid.rect(3, 3, true);
    // Source in the middle row sends water west, out of the garden and back from the east.
    const tiles = new Uint8Array(9);
    tiles[3] = W | E; // (0,1) straight
    tiles[4] = W; // source (1,1) pointing west
    tiles[5] = E; // (2,1) receives water through the joined edge
    const puzzle: Puzzle = { grid, source: 4, solution: tiles, tiles, unique: false, repairs: 0 };
    const an = new Board(puzzle).analyze();
    expect(an.watered[5]).toBe(1);
    expect(an.inflow[5]).toBe(1); // enters from its east side, i.e. across the edge
  });
});
