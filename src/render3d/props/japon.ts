/** Japanese garden in 3D: red bridge, stone lantern, pagoda, torii, sakura, bonsai pine, bamboo and koi. */
import { bridge3d, rock3d } from './common';
import type { ModelMap, Vec } from './kit';

const RED = '#E8574F';
const RED_DARK = '#C9443E';
const ROOF = '#5E6B7A';
const SQUARE = Math.PI / 4;

export const japon: ModelMap = {
  'red-bridge': bridge3d({ deck: '#EBCFA6', deckShade: '#C9A27A', side: RED, rail: RED, cap: '#F0C04A', hump: 0.085 }),
  'stone-lantern'(k) {
    const stone = '#CFC8BE';
    const shade = '#ABA295';
    const hex = { sides: 6, rot: [0, Math.PI / 6, 0] as Vec };
    k.cyl(shade, [0, 0, 0], 0.42, 0.22, hex);
    k.cyl(stone, [0, 0.22, 0], 0.14, 0.62, hex);
    k.cyl(shade, [0, 0.84, 0], 0.38, 0.15, hex);
    k.cyl(stone, [0, 0.99, 0], 0.3, 0.38, hex);
    // Light window, glowing once the garden is alive.
    k.box('#8C8478', [0, 1.06, 0.26], [0.2, 0.24, 0.04]);
    k.bloom(0.5, () => k.box('#FFE9A3', [0, 1.05, 0.27], [0.22, 0.26, 0.04]));
    k.cone(shade, [0, 1.37, 0], 0.6, 0.38, hex);
    k.ball(shade, [0, 1.8, 0], [0.1, 0.1, 0.1], { sides: 0 });
  },
  pagoda(k) {
    // Three storeys, each a red room under thin eaves, so the walls show between the roofs.
    for (let n = 0; n < 3; n++) {
      const w = 0.6 - n * 0.13;
      const y = n * 0.62;
      k.box(n === 0 ? '#F4E6D2' : RED, [0, y, 0], [w * 1.1, 0.48, w * 1.1]);
      if (n === 0) k.box(RED_DARK, [0, 0, w * 0.55], [w * 0.36, 0.34, 0.04]);
      k.cyl(RED_DARK, [0, y + 0.44, 0], (w * 0.55 + 0.1) * Math.SQRT2, 0.05, { sides: 4, rot: [0, SQUARE, 0] });
      k.cyl(['#7F8C9B', '#A3AEBB'], [0, y + 0.48, 0], (w * 0.55 + 0.14) * Math.SQRT2, 0.12, { sides: 4, top: 0.5, rot: [0, SQUARE, 0] });
    }
    k.stick(ROOF, [0, 1.6, 0], [0, 2.2, 0], 0.06);
    k.ball('#F0C04A', [0, 2.0, 0], [0.07, 0.07, 0.07], { sides: 0 });
  },
  torii(k) {
    for (const x of [-0.47, 0.47]) {
      k.cyl(RED, [x, 0, 0], 0.08, 1.45, { sides: 8 });
      k.cyl('#3F3A44', [x, 0, 0], 0.11, 0.12, { sides: 8 });
    }
    k.box(RED_DARK, [0, 1.15, 0], [1.44, 0.13, 0.12]);
    k.box(RED, [0, 1.38, 0], [1.7, 0.12, 0.16]);
    // Dark top beam, its ends sweeping up.
    k.box('#3F3A44', [0, 1.5, 0], [1.0, 0.1, 0.22]);
    k.box('#3F3A44', [-0.68, 1.5, 0], [0.5, 0.1, 0.22], { rot: [0, 0, -0.18] });
    k.box('#3F3A44', [0.68, 1.5, 0], [0.5, 0.1, 0.22], { rot: [0, 0, 0.18] });
  },
  'stepping-stones'(k, { v }) {
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      for (let n = 0; n < 3; n++) {
        const z = Math.sin(n * 2 + v * 5) * 0.25;
        k.cyl(['#A89F92', '#D9D2C6'], [(n - 1) * 0.62, -0.02, z], 0.3, 0.1, { sides: 7, rz: 0.24, top: 0.9, rot: [0, n, 0] });
      }
    });
  },
  sakura(k, { v }) {
    k.cyl('#8A5A4A', [0, 0, 0], 0.11, 1.0, { top: 0.7 });
    k.stick('#8A5A4A', [0, 0.85, 0], [-0.45, 1.2, 0.05], 0.08);
    k.stick('#8A5A4A', [0.03, 0.95, 0], [0.45, 1.25, -0.05], 0.08);
    const pinks = ['#FFB3CE', '#FFC9DA', '#FF9DBF'];
    const blobs: Array<[number, number, number, number]> = [
      [0, 1.4, 0, 0.45],
      [-0.45, 1.2, 0.1, 0.33],
      [0.45, 1.25, -0.05, 0.35],
      [-0.15, 1.72, -0.05, 0.28],
      [0.22, 1.66, 0.12, 0.26],
    ];
    blobs.forEach(([x, y, z, s], n) => k.ball(pinks[(n + Math.floor(v * 3)) % 3], [x, y, z], [s, s * 0.9, s]));
    for (let n = 0; n < 4; n++) {
      const a = n * 1.3 + v;
      k.ball('#FFFFFF', [Math.cos(a) * 0.38, 1.4 + Math.sin(n * 2.1) * 0.2, 0.3], [0.06, 0.06, 0.06], { sides: 0 });
    }
  },
  'bonsai-pine'(k, { v }) {
    const d = v > 0.5 ? 1 : -1;
    const trunk: Vec[] = [
      [0, 0, 0],
      [d * 0.3, 0.55, 0],
      [-d * 0.05, 1.0, 0],
      [-d * 0.2, 1.3, 0],
      [d * 0.1, 1.55, 0],
    ];
    for (let n = 0; n + 1 < trunk.length; n++) k.stick('#7A5547', trunk[n], trunk[n + 1], 0.16 - n * 0.02, 5);
    // Flat cloud-like pads of needles.
    for (const [x, y, s, c] of [
      [d * 0.35, 0.8, 1, '#4E8A5C'],
      [-d * 0.38, 1.18, 0.95, '#5E9C6A'],
      [d * 0.15, 1.58, 1.05, '#4E8A5C'],
    ] as const) {
      k.ball(c, [x, y, 0], [0.4 * s, 0.15, 0.32 * s]);
      k.dome('#7DBA82', [x - 0.03, y + 0.06, -0.02], [0.27 * s, 0.11, 0.22 * s]);
    }
  },
  bamboo(k) {
    for (const [x, z, h] of [
      [-0.35, -0.1, 1],
      [0, 0.1, 1.15],
      [0.35, -0.05, 0.9],
    ]) {
      const top = 1.75 * h;
      k.cyl(['#6DB862', '#8ACD7C'], [x, 0, z], 0.08, top, { sides: 6 });
      for (let y = 0.45; y < top - 0.15; y += 0.45) k.cyl('#4F9A4C', [x, y, z], 0.095, 0.04, { sides: 6 });
      const s = x > 0 ? 1 : -1;
      k.ball('#5DB05A', [x + s * 0.22, top - 0.2, z], [0.26, 0.03, 0.08], { rot: [0, 0.3, s * -0.45], sides: 0 });
      k.ball('#5DB05A', [x - s * 0.18, top - 0.45, z + 0.05], [0.22, 0.03, 0.07], { rot: [0, -0.4, s * 0.45], sides: 0 });
    }
  },
  koi(k, { v, v2 }) {
    const body = v > 0.5 ? '#FF8A3D' : '#FFFFFF';
    const spot = v > 0.5 ? '#FFFFFF' : '#FF6A3D';
    k.at([0, 0, 0], (v2 > 0.5 ? 0 : Math.PI) + (v - 0.5) * 0.4, 1, () => {
      k.ball(body, [0, 0, 0], [0.38, 0.16, 0.85]);
      k.ball(body, [0.1, 0.03, -1.0], [0.3, 0.04, 0.35], { rot: [0, 0.3, 0], sides: 0 });
      k.ball(body, [-0.42, 0.03, 0.25], [0.2, 0.03, 0.1], { rot: [0, 0.5, 0], sides: 0 });
      k.ball(body, [0.42, 0.03, 0.25], [0.2, 0.03, 0.1], { rot: [0, -0.5, 0], sides: 0 });
      k.ball(spot, [0.1, 0.11, 0.1], [0.2, 0.07, 0.2], { sides: 0 });
      k.ball(spot, [-0.12, 0.1, -0.35], [0.14, 0.06, 0.14], { sides: 0 });
      k.ball('#3E3440', [-0.14, 0.1, 0.62], [0.05, 0.04, 0.05], { sides: 0 });
      k.ball('#3E3440', [0.14, 0.1, 0.62], [0.05, 0.04, 0.05], { sides: 0 });
    });
  },
  'red-maple'(k) {
    k.cyl('#7A5547', [0, 0, 0], 0.1, 1.0, { top: 0.7 });
    k.stick('#7A5547', [0, 0.7, 0], [0.32, 1.0, 0], 0.08);
    for (const [x, y, z, s, c] of [
      [0, 1.38, 0, 0.45, '#F06A4E'],
      [-0.4, 1.12, 0.12, 0.3, '#FF8A5C'],
      [0.4, 1.15, -0.05, 0.32, '#E9564A'],
      [0.05, 1.7, 0.05, 0.28, '#FF9F6B'],
    ] as const) {
      k.ball(c, [x, y, z], [s, s * 0.85, s]);
    }
  },
  rock: rock3d('#D5CEC3', '#ADA497', '#F4F0EA', '#8FC27A'),
};
