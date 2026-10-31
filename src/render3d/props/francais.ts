/** French formal garden in 3D: clipped topiaries, statue, stone vase, parterre, fountain and swans. */
import { bridge3d, tree3d } from './common';
import type { ModelMap } from './kit';

const MARBLE = '#F4F0EA';
const MARBLE_SHADE = '#D9D2C8';
const UPRIGHT: [number, number, number] = [Math.PI / 2, 0, 0];

export const francais: ModelMap = {
  'cone-topiary': tree3d({ foliage: ['#4E9E5E', '#62B370'], trunk: '#7A5547', shape: 'cone' }),
  'orange-tree': tree3d({ foliage: ['#5FB45B', '#78C266'], trunk: '#7A5547', shape: 'ball', pot: '#4F8A72', fruit: '#FFA23A' }),
  statue(k, { v }) {
    k.box(MARBLE, [0, 0, 0], [0.84, 0.1, 0.84]);
    k.box(MARBLE_SHADE, [0, 0.1, 0], [0.68, 0.42, 0.68]);
    k.box(MARBLE, [0, 0.5, 0], [0.84, 0.1, 0.84]);
    // Draped figure holding up an arm.
    const s = v > 0.5 ? 1 : -1;
    k.cyl([MARBLE_SHADE, MARBLE], [0, 0.6, 0], 0.26, 0.72, { sides: 7, top: 0.55 });
    k.ball(MARBLE, [0, 1.3, 0], [0.17, 0.1, 0.13], { sides: 0 });
    k.ball(MARBLE, [0, 1.5, 0], [0.15, 0.16, 0.15]);
    k.stick(MARBLE, [s * 0.12, 1.3, 0], [s * 0.33, 1.72, 0.05], 0.08);
    k.stick(MARBLE, [-s * 0.13, 1.3, 0], [-s * 0.2, 0.98, 0.1], 0.08);
  },
  'stone-vase'(k) {
    k.box(MARBLE_SHADE, [0, 0, 0], [0.6, 0.5, 0.6]);
    k.cyl(MARBLE, [0, 0.5, 0], 0.1, 0.28, { sides: 6 });
    k.cyl([MARBLE_SHADE, MARBLE], [0, 0.72, 0], 0.2, 0.5, { sides: 8, top: 2.5 });
    k.cyl('#FFFFFF', [0, 1.2, 0], 0.55, 0.08, { sides: 8 });
    for (const s of [-1, 1]) k.ring(MARBLE, [s * 0.45, 1.0, 0], 0.12, 0.04, { rot: UPRIGHT });
    k.bloom(0.4, () => {
      for (const [x, y, z, c] of [
        [-0.12, 1.32, -0.05, '#5FB45B'],
        [0.15, 1.32, 0.05, '#5FB45B'],
        [-0.3, 1.38, 0.05, '#FF8FB6'],
        [0, 1.48, 0, '#FFFFFF'],
        [0.3, 1.38, -0.05, '#C4A4F8'],
      ] as const) {
        k.ball(c, [x, y, z], [0.16, 0.14, 0.16], { sides: 0 });
      }
    });
  },
  parterre(k, { v }) {
    const hedge: [string, string] = ['#3F8A4F', '#4E9E5E'];
    k.at([0, 0, 0], Math.floor(v * 4) * (Math.PI / 2), 1, () => {
      // Clipped box hedge embroidery around a flower bed.
      for (const z of [-0.55, 0.55]) k.box(hedge, [0, 0, z], [1.76, 0.15, 0.16]);
      for (const x of [-0.8, 0.8]) k.box(hedge, [x, 0, 0], [0.16, 0.15, 0.94]);
      for (const x of [-0.2, 0.2]) k.ring(hedge, [x, 0.07, 0], 0.17, 0.07);
      k.bloom(0.4, () => {
        for (const [x, z] of [
          [-0.55, -0.3],
          [0.55, -0.3],
          [-0.55, 0.3],
          [0.55, 0.3],
          [0, -0.3],
          [0, 0.3],
        ]) {
          k.ball('#FF8FB6', [x, 0.08, z], [0.09, 0.08, 0.09], { sides: 0 });
        }
      });
    });
  },
  'tiered-fountain'(k) {
    k.cyl([MARBLE_SHADE, MARBLE], [0, 0, 0], 0.9, 0.35, { sides: 12 });
    k.cyl(MARBLE_SHADE, [0, 0.35, 0], 0.78, 0.01, { sides: 12 });
    k.cyl(MARBLE, [0, 0.3, 0], 0.1, 0.65, { sides: 6 });
    k.cyl([MARBLE_SHADE, MARBLE], [0, 0.92, 0], 0.15, 0.2, { sides: 10, top: 3 });
    k.cyl(MARBLE, [0, 1.1, 0], 0.05, 0.35, { sides: 6 });
    k.ball(MARBLE, [0, 1.47, 0], [0.07, 0.07, 0.07], { sides: 0 });
    // Water in both basins and a spout, once the garden is watered.
    k.bloom(0.3, () => {
      k.cyl('#7FD0F2', [0, 0.355, 0], 0.78, 0.01, { sides: 12 });
      k.cyl('#9CDCF5', [0, 1.115, 0], 0.4, 0.01, { sides: 10 });
      // The jet bubbles up and the drops falling from the upper basin circle round.
      k.hover(0.06, () => k.ball('#BDE9FF', [0, 1.62, 0], [0.05, 0.15, 0.05], { sides: 0 }));
      k.spin([0, 0, 0], [0, 1, 0], 1.3, () => {
        for (let n = 0; n < 6; n++) {
          const a = (n / 6) * Math.PI * 2 + 0.4;
          k.ball('#BDE9FF', [Math.cos(a) * 0.5, 0.75 + (n % 2) * 0.14, Math.sin(a) * 0.5], [0.04, 0.09, 0.04], { sides: 0 });
        }
      });
    });
  },
  'balustrade-bridge': bridge3d({ deck: '#F4EEE2', deckShade: '#D8CDB8', side: '#CFC2AA', rail: '#FFFFFF', cap: '#E8DFCC', hump: 0.05 }),
  swan(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      k.ball(['#E6ECF2', '#FFFFFF'], [0, 0.1, -0.1], [0.5, 0.32, 0.75]);
      for (const s of [-1, 1]) k.ball('#EEF2F6', [s * 0.27, 0.3, -0.2], [0.22, 0.16, 0.5], { rot: [0.2, s * 0.15, 0] });
      k.ball('#FFFFFF', [0, 0.38, -0.72], [0.15, 0.14, 0.18], { rot: [-0.6, 0, 0], sides: 0 });
      // S-shaped neck.
      k.stick('#FFFFFF', [0, 0.3, 0.38], [0, 0.78, 0.5], 0.16, 6);
      k.stick('#FFFFFF', [0, 0.78, 0.5], [0, 1.05, 0.42], 0.14, 6);
      k.ball('#FFFFFF', [0, 1.1, 0.48], [0.12, 0.12, 0.17]);
      k.cone('#FF9F43', [0, 1.06, 0.6], 0.06, 0.2, { rot: UPRIGHT });
      k.ball('#3E3440', [0, 1.08, 0.6], [0.05, 0.05, 0.04], { sides: 0 });
      for (const s of [-1, 1]) k.ball('#3E3440', [s * 0.1, 1.15, 0.52], [0.03, 0.03, 0.03], { sides: 0 });
    });
  },
};
