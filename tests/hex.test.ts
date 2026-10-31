import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import { Puzzle } from '../src/core/generator';
import { distinctRotations, Grid, HN, HNE, HS, HSE, HSW, HNW, rotateMask } from '../src/core/grid';
import { buildLevel, isHardLevel, isHexLevel, levelInfo } from '../src/core/levels';
import { buildShape, HEX_SHAPES } from '../src/core/shapes';
import { solve } from '../src/core/solver';
import { timeModel } from '../src/core/timing';
import { TUTORIALS } from '../src/tutorial';

describe('hexagonal grid', () => {
  it('rotates six-sided masks clockwise', () => {
    expect(rotateMask(HN, 1, 6)).toBe(HNE);
    expect(rotateMask(HNW, 1, 6)).toBe(HN);
    expect(rotateMask(HN | HS, 3, 6)).toBe(HN | HS);
    expect(rotateMask(HN | HSE, 2, 6)).toBe(HSE | HSW);
    expect(distinctRotations(HN | HS, 6)).toHaveLength(3);
    expect(distinctRotations(HN | HSE | HSW, 6)).toHaveLength(2);
  });

  it('links every cell to its six neighbours both ways', () => {
    const grid = Grid.hexRect(5, 4);
    for (const i of grid.cells) {
      for (let d = 0; d < 6; d++) {
        const j = grid.neighbor(i, d);
        if (j >= 0) expect(grid.neighbor(j, grid.opposite(d)), `cell ${i} side ${d}`).toBe(i);
      }
    }
    // A cell in the middle has six neighbours, and they are one tile away.
    const mid = grid.index(2, 1);
    expect(grid.openMask(mid)).toBe(63);
    const [cx, cy] = grid.center(mid);
    for (let d = 0; d < 6; d++) {
      const [nx, ny] = grid.center(grid.neighbor(mid, d));
      expect(Math.hypot(nx - cx, ny - cy)).toBeCloseTo(1, 6);
    }
  });

  it('never wraps', () => {
    expect(new Grid(5, 5, new Uint8Array(25).fill(1), true, true).wrap).toBe(false);
  });

  it('builds hexagons, honeycombs and crowns', () => {
    const count = (shape: (typeof HEX_SHAPES)[number], w: number, h: number) =>
      buildShape(shape, w, h, undefined, true).reduce((a, b) => a + b, 0);
    expect(count('hexagon', 5, 5)).toBe(19);
    expect(count('hexagon', 7, 7)).toBe(37);
    expect(count('hexagon', 9, 9)).toBe(61);
    expect(count('crown', 7, 7)).toBe(30);
    expect(count('comb', 5, 6)).toBe(30);
  });

  it('analyses water on hexagons', () => {
    const grid = Grid.hexRect(3, 1);
    // Columns 0 and 2 sit higher than column 1: (0,0) -> SE -> (1,0) -> NE -> (2,0).
    const tiles = new Uint8Array([HSE, HNW | HNE, HSW]);
    const puzzle: Puzzle = { grid, source: 0, solution: tiles, tiles, unique: false, repairs: 0 };
    const an = new Board(puzzle).analyze();
    expect(an.solved).toBe(true);
    expect(an.inflow[2]).toBe(4); // enters through its south-west side
  });

  it('turns a tile one sixth at a time', () => {
    const grid = Grid.hexRect(3, 3);
    const tiles = new Uint8Array(9).fill(HN);
    const board = new Board({ grid, source: 4, solution: tiles, tiles, unique: false, repairs: 0 });
    for (let k = 0; k < 5; k++) board.rotate(0);
    expect(board.mask(0)).toBe(HNW);
    board.rotate(0);
    expect(board.mask(0)).toBe(HN);
  });
});

/** The first `count` hexagonal levels. */
function hexLevels(count: number): number[] {
  const levels: number[] = [];
  for (let n = 1; levels.length < count; n++) if (isHexLevel(n)) levels.push(n);
  return levels;
}

describe('hexagonal levels', () => {
  it('come about once in four normal levels, never two in a row', () => {
    // Set by hand at first: hexagonal at 4 and 8 only.
    expect(Array.from({ length: 9 }, (_, k) => levelInfo(k + 1).hex)).toEqual([false, false, false, true, false, false, false, true, false]);
    let normal = 0;
    let hex = 0;
    for (let n = 1; n <= 1000; n++) {
      if (isHardLevel(n)) {
        expect(isHexLevel(n), `level ${n}`).toBe(false);
        continue;
      }
      normal++;
      if (!isHexLevel(n)) continue;
      hex++;
      expect(isHexLevel(n - 1), `levels ${n - 1} and ${n}`).toBe(false);
    }
    expect(hex / normal).toBeGreaterThan(0.22);
    expect(hex / normal).toBeLessThan(0.28);
  });

  it('grow one garden after the other, never with the same shape twice in a row', () => {
    const infos = hexLevels(30).map(levelInfo);
    // A small first one (12 tiles), then 19.
    expect([infos[0].cells, infos[1].cells]).toEqual([12, 19]);
    infos.forEach((info, k) => {
      expect(info.hex).toBe(true);
      expect(info.wrap).toBe(false);
      expect(HEX_SHAPES).toContain(info.shape);
      if (k > 0) expect(info.shape, `level ${info.index}`).not.toBe(infos[k - 1].shape);
    });
    expect(infos[10].cells).toBeGreaterThan(50);
  });

  it('are uniquely solvable', () => {
    for (const n of hexLevels(24)) {
      const p = buildLevel(n);
      expect(p.grid.hex, `level ${n}`).toBe(true);
      expect(p.unique, `level ${n}`).toBe(true);
      const res = solve(p.grid, p.tiles, 1);
      expect(res.status).toBe('solved');
      expect(Array.from(res.solution!)).toEqual(Array.from(p.solution));
      expect(new Board(p).analyze().solved).toBe(false);
      const board = new Board(p);
      board.solveInstantly();
      expect(board.analyze().solved).toBe(true);
    }
  });

  it('are expected to take longer than square gardens of the same size', () => {
    const hex = buildLevel(hexLevels(2)[1]);
    const tiles = hex.grid.cells.length;
    const median = timeModel(hex).median;
    expect(median).toBeGreaterThan(0.8 * tiles ** 1.3 * 1.3);
  });
});

describe('tutorials', () => {
  it.each(Object.entries(TUTORIALS))('%s: one tap on each tile to turn solves the garden', (_id, tutorial) => {
    const board = tutorial.build();
    expect(board.analyze().solved).toBe(false);
    const cells = tutorial.steps.filter((s) => (s.kind === 'turn' || s.kind === 'free') && s.cell !== undefined).map((s) => s.cell!);
    for (const cell of cells) {
      expect(board.isCorrect(cell)).toBe(false);
      board.rotate(cell);
      expect(board.isCorrect(cell), `cell ${cell}`).toBe(true);
    }
    expect(board.analyze().solved).toBe(true);
  });

  it('wrap: the first tile drinks through the left edge, the second through the bottom one', () => {
    const board = TUTORIALS.wrap.build();
    board.rotate(2);
    const an = board.analyze();
    expect(an.watered[2]).toBe(1);
    expect(an.inflow[2]).toBe(1); // from its east side, across the edge
    board.rotate(1);
    expect(board.analyze().inflow[1]).toBe(0); // from its north side, across the edge
  });
});
