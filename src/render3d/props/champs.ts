/** Fields in 3D: hay bales, windmill, poppies, lavender, wheat sheaf, rabbit and tractor. */
import { bunny3d } from './amitie';
import { bridge3d, lilyPads3d } from './common';
import type { ModelMap } from './kit';

const UPRIGHT: [number, number, number] = [Math.PI / 2, 0, 0];

export const champs: ModelMap = {
  'hay-bale'(k, { v }) {
    // Round bale on its side, its spiral face turned toward the camera.
    k.at([0, 0, 0], -0.45 + (v - 0.5) * 0.6, 1, () => {
      k.cyl(['#D2A848', '#E8C060'], [0, 0.55, -0.55], 0.55, 1.05, { sides: 10, rot: UPRIGHT });
      k.cyl('#F2CF6A', [0, 0.55, 0.5], 0.5, 0.03, { sides: 10, rot: UPRIGHT });
      k.ring('#D2A848', [0, 0.55, 0.53], 0.32, 0.03, { rot: UPRIGHT });
      k.ring('#D2A848', [0, 0.55, 0.53], 0.12, 0.03, { rot: UPRIGHT });
      k.ring('#C99A3A', [0, 0.55, -0.05], 0.43, 0.05, { rot: UPRIGHT });
    });
  },
  windmill(k, { v }) {
    k.cyl(['#EDE0CE', '#FFF4E6'], [0, 0, 0], 0.45, 1.45, { sides: 8, top: 0.6 });
    k.dome('#C95A48', [0, 1.42, 0], [0.32, 0.32, 0.32]);
    k.box('#8A5A3A', [0, 0, 0.38], [0.22, 0.42, 0.08]);
    k.box('#9FD4F5', [0, 0.78, 0.31], [0.17, 0.2, 0.06]);
    // Four sails on a hub, turning in the wind.
    const hub: [number, number, number] = [0, 1.42, 0.38];
    k.spin(hub, [0, 0, 1], -1.4 - v * 0.6, () => {
      for (let n = 0; n < 4; n++) {
        const a = v * 6 + (n * Math.PI) / 2;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        k.stick('#8A5A3A', hub, [c * 0.95, hub[1] + s * 0.95, hub[2]], 0.05);
        k.box('#FFFFFF', [c * 0.28 - s * 0.13, hub[1] + s * 0.28 + c * 0.13, hub[2] + 0.02], [0.22, 0.66, 0.03], { rot: [0, 0, a - Math.PI / 2] });
      }
      k.ball('#8A5A3A', hub, [0.08, 0.08, 0.08], { sides: 0 });
    });
  },
  poppies(k) {
    for (const [x, z, h] of [
      [-0.45, 0.1, 0.75],
      [-0.1, -0.15, 1],
      [0.25, 0.2, 0.85],
      [0.5, -0.1, 0.6],
    ]) {
      const top = 1.45 * h;
      k.stick('#6FA84A', [x, 0, z], [x + 0.05, top, z], 0.05);
      k.cyl(['#FF4A4A', '#FF6A5A'], [x + 0.05, top - 0.1, z], 0.07, 0.15, { sides: 5, top: 3 });
      k.ball('#3E3440', [x + 0.05, top + 0.05, z], [0.06, 0.04, 0.06], { sides: 0 });
    }
    k.ball('#6FA84A', [0.05, 0.25, 0.25], [0.2, 0.05, 0.08], { rot: [0, 0.4, 0.5], sides: 0 });
  },
  lavender(k) {
    for (const [x, z, s] of [
      [-0.45, -0.1, 0.8],
      [0.05, 0.15, 1],
      [0.5, -0.05, 0.85],
    ]) {
      k.dome(['#7FA88A', '#8FB89A'], [x, 0, z], [0.32 * s, 0.4 * s, 0.32 * s]);
      for (let n = -2; n <= 2; n++) {
        const lean = n * 0.22;
        const y = (0.62 - Math.abs(n) * 0.06) * s;
        k.ball(n % 2 ? '#A98AE8' : '#9673DC', [x + Math.sin(lean) * 0.25 * s, y, z + (n % 2) * 0.06], [0.05 * s, 0.15 * s, 0.05 * s], { rot: [0, 0, -lean], sides: 0 });
      }
    }
  },
  'wheat-sheaf'(k) {
    const stalk = '#D9B070';
    k.cyl(stalk, [0, 0, 0], 0.32, 0.7, { sides: 8, top: 0.6 });
    k.cyl(stalk, [0, 0.7, 0], 0.19, 0.5, { sides: 8, top: 1.9 });
    k.cyl('#C95A48', [0, 0.58, 0], 0.22, 0.14, { sides: 8 });
    for (let n = 0; n < 8; n++) {
      const a = (n / 8) * Math.PI * 2;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      k.ball('#F2CF6A', [c * 0.3, 1.32, s * 0.3], [0.06, 0.2, 0.06], { rot: [s * 0.45, 0, -c * 0.45], sides: 0 });
    }
    k.ball('#F2CF6A', [0, 1.38, 0], [0.07, 0.22, 0.07], { sides: 0 });
  },
  rabbit(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 0.9, () => bunny3d(k, '#C9A48A', '#B8907A'));
  },
  tractor(k, { v }) {
    const body = v > 0.3 && v < 0.7 ? '#5FB45B' : '#E8554F';
    const side = (z: number) => (z > 0 ? 0 : Math.PI);
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      k.box(body, [0.3, 0.45, 0], [0.72, 0.45, 0.5]);
      k.box(body, [-0.3, 0.4, 0], [0.52, 1.0, 0.66]);
      k.box('#CFEAF7', [-0.3, 0.98, 0], [0.54, 0.32, 0.5]);
      k.box('#CFEAF7', [-0.3, 0.98, 0], [0.38, 0.32, 0.68]);
      k.box('#FFFFFF', [-0.3, 1.4, 0], [0.68, 0.08, 0.8]);
      k.stick('#5A5A64', [0.45, 0.85, 0], [0.45, 1.2, 0], 0.07);
      k.ball('#FFF2A8', [0.67, 0.68, 0.14], [0.05, 0.06, 0.06], { sides: 0 });
      for (const z of [-1, 1]) {
        const turn = side(z);
        k.at([-0.35, 0.4, z * 0.33], turn, 1, () => {
          k.cyl('#3E3440', [0, 0, 0], 0.4, 0.2, { sides: 10, rot: UPRIGHT });
          k.cyl('#FFC93A', [0, 0, 0.2], 0.17, 0.02, { sides: 8, rot: UPRIGHT });
        });
        k.at([0.45, 0.25, z * 0.25], turn, 1, () => {
          k.cyl('#3E3440', [0, 0, 0], 0.25, 0.14, { sides: 8, rot: UPRIGHT });
          k.cyl('#FFC93A', [0, 0, 0.14], 0.1, 0.02, { sides: 6, rot: UPRIGHT });
        });
      }
    });
  },
  'plank-bridge': bridge3d({ deck: '#D2A06A', deckShade: '#BE8C58', side: '#BE8C58', rail: '#9A6A42', planks: true, hump: 0.035 }),
  'lily-pads': lilyPads3d('#FFFFFF'),
};
