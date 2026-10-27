import { describe, expect, it } from 'vitest';
import { E, N, S, W } from '../src/core/grid';
import { makeDecor } from '../src/render/decor';
import { THEMES, setTheme } from '../src/render/themes';
import { drawTile, drawTileCritters, drawTileProps, drawTileWater } from '../src/render/tileArt';

/** Canvas stand-in that only tracks the save()/restore() balance. */
function mockContext() {
  const state = { depth: 0, minDepth: 0 };
  const gradient = { addColorStop() {} };
  const target: Record<string, unknown> = {
    save: () => state.depth++,
    restore: () => {
      state.depth--;
      state.minDepth = Math.min(state.minDepth, state.depth);
    },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  const ctx = new Proxy(target, {
    get: (t, key: string) => (key in t ? t[key] : () => undefined),
    set: (t, key: string, value) => {
      t[key] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, state };
}

const MASKS = [N | S, N | E, N | E | S, N | E | S | W, W, E | S];
/** Hexagonal tiles: straight, sharp and wide bends, a fork, a dead end, a star. */
const HEX_MASKS = [9, 3, 5, 21, 1, 63];

describe('garden styles', () => {
  it.each(THEMES.map((t) => [t.id]))('%s: every prop keeps save()/restore() balanced', (id) => {
    const theme = setTheme(id);
    for (const def of theme.props) {
      for (const bloom of [0, 0.4, 1]) {
        for (const water of [0, 1]) {
          const { ctx, state } = mockContext();
          def.draw(ctx, { r: 0.1, bloom, water, time: 1.3, v: 0.3, v2: 0.7 });
          expect(state.depth, `${id}/${def.id} bloom=${bloom} water=${water}`).toBe(0);
          expect(state.minDepth, `${id}/${def.id} restores too much`).toBe(0);
        }
      }
    }
  });

  it.each(THEMES.map((t) => [t.id]))('%s: whole tiles keep save()/restore() balanced', (id) => {
    setTheme(id);
    const tiles = [...MASKS.map((m) => [m, 4]), ...HEX_MASKS.map((m) => [m, 6])];
    for (const [mask, sides] of tiles) {
      for (let seed = 0; seed < 12; seed++) {
        const decor = makeDecor(mask, `test:${seed}`, seed === 0, 2, sides);
        for (const bloom of [0, 0.5, 1]) {
          for (const rot of [0, 1]) {
            const { ctx, state } = mockContext();
            const st = { mask, decor, isSource: seed === 0, bloom, water: bloom > 0 ? 1 : 0.4, inflow: 0, loop: 0, rot, sides };
            drawTile(ctx, st);
            drawTileWater(ctx, st, 2.1);
            drawTileProps(ctx, st);
            drawTileCritters(ctx, st, 2.1);
            expect(state.depth, `${id} mask=${mask}/${sides} seed=${seed} bloom=${bloom}`).toBe(0);
          }
        }
      }
    }
    setTheme('printemps');
  });
});
