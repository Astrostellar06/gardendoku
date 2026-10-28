/** Winter garden in 3D: snowmen, lit firs, presents, candy canes, penguins and ice floes. */
import { bridge3d } from './common';
import { eyes, type ModelMap, type Vec } from './kit';

const SNOW_SHADE = '#DDE8F5';
const LIGHTS = ['#FF6B6B', '#FFD45A', '#6EC6FF', '#9CF08A', '#FF9DE2'];

export const hiver: ModelMap = {
  snowman(k, { v }) {
    const scarf = v > 0.5 ? '#FF6B6B' : '#6EA8FF';
    k.ball([SNOW_SHADE, '#FFFFFF'], [0, 0.45, 0], [0.52, 0.48, 0.5]);
    k.ball([SNOW_SHADE, '#FFFFFF'], [0, 1.15, 0], [0.34, 0.33, 0.34]);
    k.cyl(scarf, [0, 0.84, 0], 0.3, 0.13, { sides: 8 });
    k.box(scarf, [0.15, 0.5, 0.5], [0.13, 0.32, 0.06], { rot: [-0.25, 0, 0.1] });
    k.cone('#FF9A3C', [0, 1.12, 0.3], 0.06, 0.3, { rot: [Math.PI / 2, 0, 0] });
    eyes(k, 0, 1.24, 0.3, 0.11);
    for (const [y, z] of [
      [0.62, 0.45],
      [0.38, 0.5],
    ]) {
      k.ball('#3E3440', [0, y, z], [0.05, 0.05, 0.03], { sides: 0 });
    }
    k.stick('#8A5A3A', [-0.4, 0.72, 0], [-0.82, 1.0, 0], 0.06);
    k.stick('#8A5A3A', [0.4, 0.72, 0], [0.82, 0.98, 0], 0.06);
    if (Math.floor(v * 10) % 2 === 0) {
      k.cyl('#3E3440', [0, 1.4, 0], 0.3, 0.06, { sides: 8 });
      k.cyl('#3E3440', [0, 1.44, 0], 0.2, 0.32, { sides: 8 });
      k.bloom(0.5, () => k.cyl('#FF6B6B', [0, 1.48, 0], 0.21, 0.07, { sides: 8 }));
    }
  },
  fir(k, { v }) {
    k.cyl('#8A5A3A', [0, 0, 0], 0.11, 0.35);
    const tiers: Vec[] = [
      [0.25, 0.7, 1.0],
      [0.75, 0.55, 0.85],
      [1.2, 0.4, 0.75],
    ];
    tiers.forEach(([y, r, h], n) => {
      k.cone(n % 2 ? '#3F8F66' : '#4E9E73', [0, y, 0], r, h, { sides: 7 });
      k.cone('#FFFFFF', [0, y + h * 0.55, 0], r * 0.48, h * 0.45, { sides: 7 });
    });
    // Lights and a star once watered.
    k.bloom(0.4, () => {
      for (let n = 0; n < 6; n++) {
        const y = 0.4 + n * 0.22;
        const rad = Math.max(...tiers.map(([y0, r, h]) => (y >= y0 && y <= y0 + h ? r * (1 - (y - y0) / h) : 0)));
        const a = ((n * 2.3 + v * 6) % Math.PI) + 0.1;
        k.ball(LIGHTS[n % LIGHTS.length], [Math.cos(a) * rad, y, Math.sin(a) * rad], [0.07, 0.07, 0.07], { sides: 0 });
      }
      k.cyl('#FFD45A', [0, 2.0, -0.03], 0.16, 0.06, { sides: 5, rot: [Math.PI / 2, 0, 0] });
    });
  },
  gift(k, { v, v2 }) {
    const boxes = ['#FF7A8A', '#6EC6FF', '#9CDB7A', '#C9A0FF', '#FFC94D'];
    const box = (x: number, z: number, w: number, h: number, n: number, turn: number) =>
      k.at([x, 0, z], turn, 1, () => {
        const ribbon = boxes[(n + 2) % boxes.length];
        k.box(boxes[n % boxes.length], [0, 0, 0], [w, h, w * 0.9]);
        k.box(ribbon, [0, 0, 0], [w * 0.2, h + 0.01, w * 0.92]);
        k.box(ribbon, [0, 0, 0], [w * 1.02, h + 0.01, w * 0.18]);
        k.ball(ribbon, [-w * 0.15, h + 0.07, 0], [w * 0.16, 0.08, 0.07], { rot: [0, 0, -0.5], sides: 0 });
        k.ball(ribbon, [w * 0.15, h + 0.07, 0], [w * 0.16, 0.08, 0.07], { rot: [0, 0, 0.5], sides: 0 });
      });
    const n = Math.floor(v * 5);
    box(-0.25, -0.05, 0.9, 0.8, n, (v - 0.5) * 0.5);
    if (v2 > 0.4) box(0.48, 0.38, 0.55, 0.5, n + 1, 0.4);
  },
  'candy-cane'(k) {
    // Striped shaft, then the hook, segment by segment.
    const pts: Vec[] = [0, 0.29, 0.58, 0.87, 1.16, 1.45].map((y) => [0.3, y, 0]);
    for (let n = 1; n <= 4; n++) {
      const a = (n / 4) * Math.PI;
      pts.push([-0.02 + Math.cos(a) * 0.32, 1.45 + Math.sin(a) * 0.32, 0]);
    }
    for (let n = 0; n + 1 < pts.length; n++) {
      const c = n % 2 ? '#FFFFFF' : '#FF5A6A';
      k.stick(c, pts[n], pts[n + 1], 0.24, 6);
      if (n >= 5) k.ball(c, pts[n], [0.12, 0.12, 0.12], { sides: 0 });
    }
  },
  holly(k, { v }) {
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      for (const [a, c, l] of [
        [-0.9, '#3F8F66', 0.95],
        [0.9, '#4E9E73', 0.95],
        [Math.PI, '#3F8F66', 0.8],
      ] as const) {
        k.ball(c, [Math.cos(a) * l * 0.5, 0.05, Math.sin(a) * l * 0.5], [l * 0.5, 0.05, 0.18], { rot: [0, -a, 0], sides: 0 });
      }
      for (const [x, z] of [
        [-0.15, -0.1],
        [0.15, -0.08],
        [0, 0.12],
      ]) {
        k.ball('#E8414F', [x, 0.2, z], [0.18, 0.18, 0.18], { sides: 0 });
      }
    });
  },
  penguin(k, { v }) {
    k.at([0, 0, 0], (v - 0.5) * 0.8, 0.9, () => {
      k.ball('#3E4658', [0, 0.78, 0], [0.5, 0.75, 0.45]);
      k.ball('#FFFFFF', [0, 0.72, 0.17], [0.36, 0.58, 0.32]);
      k.ball('#3E4658', [0, 1.42, 0], [0.36, 0.34, 0.34]);
      for (const x of [-0.12, 0.12]) k.ball('#FFFFFF', [x, 1.46, 0.27], [0.12, 0.14, 0.07], { sides: 0 });
      eyes(k, 0, 1.46, 0.33, 0.1, 0.05);
      k.cone('#FF9A3C', [0, 1.34, 0.3], 0.07, 0.16, { sides: 4, rot: [Math.PI / 2, 0, 0] });
      for (const s of [-1, 1]) {
        k.ball('#3E4658', [s * 0.48, 0.85, 0], [0.12, 0.38, 0.14], { rot: [0, 0, s * 0.3] });
        k.ball('#FF9A3C', [s * 0.18, 0.04, 0.3], [0.16, 0.06, 0.18], { sides: 0 });
      }
      if (v > 0.5) {
        // Little red bobble hat.
        k.dome('#FF6B6B', [0, 1.6, 0], [0.3, 0.22, 0.3]);
        k.ball('#FFFFFF', [0, 1.85, 0], [0.09, 0.09, 0.09], { sides: 0 });
      }
    });
  },
  'snowy-rock'(k, { v, v2 }) {
    k.rock(['#9AA6BA', '#B7C1D2'], [0, 0.3, 0], [0.85, 0.55, 0.7], { rot: [0.2, v * 6, 0.1] });
    k.dome(['#EEF4FB', '#FFFFFF'], [-0.05, 0.58, -0.02], [0.66, 0.3, 0.52], { rot: [0, v * 6, 0] });
    if (v2 > 0.45) {
      k.rock(['#9AA6BA', '#B7C1D2'], [0.75, 0.18, 0.35], [0.38, 0.3, 0.32], { rot: [0, v * 3, 0.3] });
      k.dome('#FFFFFF', [0.75, 0.32, 0.35], [0.28, 0.14, 0.24]);
    }
  },
  sled(k, { v }) {
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      for (const z of [-0.42, 0.42]) {
        k.stick('#8A9BB8', [-0.9, 0.05, z], [0.7, 0.05, z], 0.08);
        k.stick('#8A9BB8', [0.7, 0.05, z], [0.92, 0.3, z], 0.08);
        k.stick('#8A9BB8', [-0.3, 0.05, z], [-0.3, 0.16, z], 0.06);
        k.stick('#8A9BB8', [0.35, 0.05, z], [0.35, 0.16, z], 0.06);
      }
      for (let n = 0; n < 4; n++) k.box('#E8574F', [-0.52 + n * 0.36, 0.16, 0], [0.26, 0.06, 1.0]);
    });
  },
  'plank-bridge': bridge3d({ deck: '#C98A5A', deckShade: '#B57846', side: '#B57846', rail: '#8A5A3A', planks: true, hump: 0.035, snow: true }),
  'ice-floe'(k, { v }) {
    k.cyl(['#BFE3F2', '#FFFFFF'], [0, -0.08, 0], 0.8, 0.14, { sides: 7, rz: 0.68, rot: [0, v * 6, 0] });
    k.cyl(['#BFE3F2', '#FFFFFF'], [0.5, -0.06, 0.95], 0.3, 0.1, { sides: 5, rot: [0, v * 9, 0] });
  },
};
