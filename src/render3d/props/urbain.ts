/** City park in 3D: street lamps, benches, bikes, hot-dog carts, pigeons, fountains and rowing boats. */
import { bridge3d, tree3d } from './common';
import type { ModelMap } from './kit';
import { sideEyes } from './montagne';

const IRON = '#4A4E5A';
const Q = Math.PI / 4;

export const urbain: ModelMap = {
  'street-lamp'(k) {
    k.cyl(IRON, [0, 0, 0], 0.22, 0.3, { top: 0.6 });
    k.cyl(IRON, [0, 0.25, 0], 0.07, 1.6);
    k.cyl(IRON, [0, 1.8, 0], 0.3, 0.06, { sides: 4, rot: [0, Q, 0] });
    k.cyl('#E3E6EE', [0, 1.85, 0], 0.26, 0.42, { sides: 4, top: 1.25, rot: [0, Q, 0] });
    k.cone(IRON, [0, 2.25, 0], 0.42, 0.25, { sides: 4, rot: [0, Q, 0] });
    k.ball(IRON, [0, 2.52, 0], [0.06, 0.06, 0.06], { sides: 0 });
    // Lit once the garden is watered.
    k.bloom(0.5, () => k.cyl('#FFE9A0', [0, 1.86, 0], 0.27, 0.4, { sides: 4, top: 1.25, rot: [0, Q, 0] }));
  },
  'park-bench'(k) {
    const wood = '#C98A5A';
    for (const x of [-0.75, 0.75]) {
      k.box(IRON, [x, 0, 0.02], [0.08, 0.42, 0.48]);
      k.stick(IRON, [x, 0.4, -0.22], [x, 0.98, -0.32], 0.08);
    }
    k.box(wood, [0, 0.42, 0.12], [1.85, 0.08, 0.26]);
    k.box(wood, [0, 0.42, -0.14], [1.85, 0.08, 0.24]);
    k.box(wood, [0, 0.6, -0.28], [1.8, 0.14, 0.05], { rot: [-0.15, 0, 0] });
    k.box(wood, [0, 0.82, -0.31], [1.8, 0.14, 0.05], { rot: [-0.15, 0, 0] });
  },
  bike(k, { v }) {
    const frame = v > 0.25 && v < 0.75 ? '#5EAFE0' : '#FF7A8A';
    const up: [number, number, number] = [Math.PI / 2, 0, 0];
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.5, 0.5]) k.ring('#3E3440', [x, 0.38, 0], 0.34, 0.07, { rot: up });
      k.stick(frame, [-0.5, 0.38, 0], [-0.1, 0.38, 0], 0.08);
      k.stick(frame, [-0.1, 0.38, 0], [0.3, 0.93, 0], 0.08);
      k.stick(frame, [0.3, 0.93, 0], [-0.2, 0.93, 0], 0.08);
      k.stick(frame, [-0.2, 0.93, 0], [-0.5, 0.38, 0], 0.08);
      k.stick(frame, [-0.1, 0.38, 0], [-0.25, 1.08, 0], 0.08);
      k.stick(frame, [0.5, 0.38, 0], [0.32, 1.13, 0], 0.08);
      k.box('#3E3440', [-0.25, 1.08, 0], [0.26, 0.06, 0.12]);
      k.stick('#3E3440', [0.32, 1.13, -0.2], [0.32, 1.13, 0.2], 0.06);
      // Basket of flowers in front.
      k.box('#D9A066', [0.52, 0.86, 0], [0.3, 0.22, 0.3]);
      for (const [x, z, c] of [
        [0.45, 0.06, '#FF8FB6'],
        [0.56, -0.06, '#FFD45A'],
        [0.6, 0.08, '#FFFFFF'],
      ] as const) {
        k.ball(c, [x, 1.1, z], [0.07, 0.06, 0.07], { sides: 0 });
      }
    });
  },
  'hotdog-cart'(k) {
    const side: [number, number, number] = [Math.PI / 2, 0, 0];
    k.box('#E8EEF4', [0, 0.22, 0], [1.3, 0.62, 0.7]);
    k.box('#FFC94D', [0, 0.5, 0], [1.32, 0.13, 0.72]);
    for (const x of [-0.4, 0.4]) {
      k.cyl('#3E3440', [x, 0.2, 0.33], 0.2, 0.07, { sides: 8, rot: side });
      k.cyl('#3E3440', [x, 0.2, -0.4], 0.2, 0.07, { sides: 8, rot: side });
    }
    // A hot dog on the counter, under a striped parasol.
    k.ball('#E8A06A', [-0.2, 0.88, 0.1], [0.25, 0.07, 0.09], { sides: 0 });
    k.ball('#D9534F', [-0.2, 0.93, 0.1], [0.22, 0.05, 0.05], { sides: 0 });
    k.stick('#B8B8C0', [0, 0.84, 0], [0, 1.6, 0], 0.05);
    k.cone(['#FF7A6B', '#FF7A6B'], [0, 1.45, 0], 0.8, 0.35, { sides: 6 });
    k.cone('#FFFFFF', [0, 1.62, 0], 0.32, 0.18, { sides: 6 });
  },
  pigeons(k, { v, v2 }) {
    const one = (x: number, z: number, dir: number, s: number) =>
      k.at([x, 0, z], dir > 0 ? 0 : Math.PI, s, () => {
        k.stick('#E88A8A', [-0.02, 0, 0.06], [-0.02, 0.18, 0.06], 0.04);
        k.stick('#E88A8A', [0.08, 0, -0.06], [0.08, 0.18, -0.06], 0.04);
        k.ball('#A9AEC4', [0, 0.36, 0], [0.38, 0.22, 0.22], { rot: [0, 0, 0.2] });
        k.ball('#8E93AC', [-0.12, 0.42, 0], [0.26, 0.13, 0.24], { rot: [0, 0, 0.2], sides: 0 });
        k.ball('#8E93AC', [-0.42, 0.42, 0], [0.18, 0.04, 0.1], { rot: [0, 0, 0.3], sides: 0 });
        k.ball('#8FC9B0', [0.24, 0.52, 0], [0.13, 0.11, 0.14], { sides: 0 });
        k.ball('#9DA3BB', [0.3, 0.68, 0], [0.16, 0.16, 0.15]);
        k.ball('#E8A06A', [0.47, 0.66, 0], [0.08, 0.035, 0.035], { sides: 0 });
        sideEyes(k, 0.38, 0.72, 0.1, 0.035);
      });
    one(-0.35, -0.15, v > 0.5 ? 1 : -1, 1);
    one(0.4, 0.3, v2 > 0.5 ? 1 : -1, 0.85);
  },
  hydrant(k) {
    k.cyl('#D94A4A', [0, 0, 0], 0.48, 0.15, { sides: 8 });
    k.cyl(['#E04E4A', '#F25C54'], [0, 0.15, 0], 0.33, 0.85, { sides: 8 });
    k.dome('#D94A4A', [0, 0.98, 0], [0.37, 0.32, 0.37]);
    k.cyl('#D94A4A', [0, 1.25, 0], 0.1, 0.14);
    k.stick('#D94A4A', [-0.62, 0.62, 0], [0.62, 0.62, 0], 0.22, 6);
    k.cyl('#D94A4A', [0, 0.55, 0.2], 0.13, 0.2, { rot: [Math.PI / 2, 0, 0] });
  },
  'planter-tree': tree3d({ foliage: ['#6FC266', '#5FB45B', '#86CF72'], trunk: '#7A5547', pot: '#B8AC9C' }),
  'city-fountain'(k) {
    k.cyl('#D9D2C6', [0, 0, 0], 0.9, 0.32, { sides: 10 });
    k.cyl('#CFC8BC', [0, 0.3, 0], 0.78, 0.03, { sides: 10 });
    k.cyl('#E8E2D8', [0, 0.3, 0], 0.1, 0.65);
    k.cyl('#E8E2D8', [0, 0.92, 0], 0.18, 0.14, { sides: 8, top: 2 });
    // Water and a frozen splash once it flows.
    k.bloom(0.4, () => {
      k.cyl('#7FD0F2', [0, 0.3, 0], 0.79, 0.04, { sides: 10 });
      k.ball('#BDE9FF', [0, 1.25, 0], [0.06, 0.25, 0.06], { sides: 0 });
      for (let n = 0; n < 4; n++) {
        const a = n * (Math.PI / 2) + 0.4;
        for (const d of [0.25, 0.48]) {
          k.ball('#BDE9FF', [Math.cos(a) * d, d === 0.25 ? 1.2 : 0.8, Math.sin(a) * d], [0.05, 0.05, 0.05], { sides: 0 });
        }
      }
    });
  },
  'stone-bridge': bridge3d({ deck: '#EDE6DA', deckShade: '#CFC5B5', side: '#BFB4A2', rail: '#F7F2EA', cap: '#D9CFBF', hump: 0.07 }),
  rowboat(k, { v }) {
    k.ball('#FFFFFF', [0, 0.04, 0], [0.58, 0.3, 1.0]);
    k.ball(v > 0.5 ? '#5EAFE0' : '#5FB45B', [0, 0.32, 0], [0.46, 0.04, 0.85], { sides: 0 });
    k.box('#D9A066', [0, 0.32, 0], [0.95, 0.06, 0.16]);
    for (const s of [-1, 1]) {
      k.stick('#C98A5A', [s * 0.3, 0.4, 0], [s * 1.0, 0.04, 0.12], 0.06);
      k.ball('#C98A5A', [s * 1.02, 0.02, 0.14], [0.08, 0.03, 0.16], { sides: 0 });
    }
  },
};
