import { describe, expect, it } from 'vitest';
import { buildLevel } from '../src/core/levels';
import { bedOutline, canalAreas } from '../src/render3d/models';

describe('3D garden models', () => {
  it('carve the canal of every tile and lay one plinth under every garden', () => {
    for (let n = 1; n <= 120; n++) {
      const p = buildLevel(n);
      const g = p.grid;
      for (const i of g.cells) {
        const { turf, water } = canalAreas(p.solution[i], g.sides, i === p.source);
        expect(turf.length, `level ${n} cell ${i}`).toBeGreaterThan(0);
        expect(water.length).toBeGreaterThan(0);
      }
      const centers = g.cells.map((i) => (g.hex ? g.center(i) : ([g.x(i) + 0.5, g.y(i) + 0.5] as [number, number])));
      expect(() => bedOutline(centers, g.sides, 0.1), `level ${n}`).not.toThrow();
    }
  }, 30_000);
});
