/** Desert & oasis in 3D: cacti, palm, clay jar, camel, lizard and succulents. */
import { bridge3d, lilyPads3d, rock3d } from './common';
import type { ModelMap } from './kit';
import { sideEyes } from './savane';

const CACTUS = '#6DBF7A';
const CACTUS_DARK = '#4FA663';

export const desert: ModelMap = {
  saguaro(k, { v }) {
    const dir = v > 0.5 ? 1 : -1;
    k.cyl([CACTUS_DARK, CACTUS], [0, 0, 0], 0.18, 1.62, { sides: 8 });
    k.dome(CACTUS, [0, 1.6, 0], [0.18, 0.18, 0.18]);
    const arm = (x: number, y: number, up: number) => {
      k.stick(CACTUS, [0, y, 0], [x, y, 0], 0.22, 6);
      k.ball(CACTUS, [x, y, 0], [0.11, 0.11, 0.11], { sides: 0 });
      k.cyl([CACTUS_DARK, CACTUS], [x, y, 0], 0.11, up, { sides: 6 });
      k.dome(CACTUS, [x, y + up, 0], [0.11, 0.1, 0.11]);
    };
    arm(dir * 0.42, 0.85, 0.45);
    arm(-dir * 0.38, 1.1, 0.35);
    k.bloom(0.5, () => {
      for (let n = 0; n < 5; n++) {
        const a = (n / 5) * Math.PI * 2;
        k.ball('#FF8FB6', [Math.cos(a) * 0.1, 1.8, Math.sin(a) * 0.1], [0.1, 0.05, 0.07], { rot: [0, -a, 0.4], sides: 0 });
      }
      k.ball('#FFD45A', [0, 1.83, 0], [0.06, 0.04, 0.06], { sides: 0 });
    });
  },
  'barrel-cactus'(k, { v }) {
    k.ball([CACTUS_DARK, CACTUS], [0, 0.6, 0], [0.7, 0.62, 0.7]);
    // Ribs: thin discs just proud of the body.
    for (let n = 0; n < 4; n++) k.ball(CACTUS_DARK, [0, 0.6, 0], [0.72, 0.64, 0.04], { rot: [0, (n * Math.PI) / 4, 0] });
    k.bloom(0.5, () => {
      const c = v > 0.5 ? '#FFD45A' : '#FF7A59';
      for (let n = 0; n < 6; n++) {
        const a = (n / 6) * Math.PI * 2;
        k.ball(c, [Math.cos(a) * 0.15, 1.22, Math.sin(a) * 0.15], [0.14, 0.05, 0.08], { rot: [0, -a, 0.35], sides: 0 });
      }
      k.ball('#FFF2B0', [0, 1.25, 0], [0.07, 0.05, 0.07], { sides: 0 });
    });
  },
  palm(k, { v }) {
    const dir = v > 0.5 ? 1 : -1;
    const at = (t: number): [number, number, number] => [dir * Math.sin(t * 1.6) * 0.3, t * 1.8, 0];
    for (let n = 0; n < 6; n++) k.stick(n % 2 ? '#C99A66' : '#B8875A', at(n / 6), at((n + 1) / 6), 0.24 - n * 0.015, 6);
    const [tx, ty] = at(1);
    for (let n = 0; n < 6; n++) {
      const a = (n / 6) * Math.PI * 2 + v * 3;
      k.ball(n % 2 ? '#5DB86A' : '#4CA85E', [tx + Math.cos(a) * 0.5, ty - 0.1, Math.sin(a) * 0.5], [0.55, 0.05, 0.16], { rot: [0, -a, -0.4], sides: 0 });
    }
    k.ball('#8A5A3A', [tx - 0.09, ty - 0.12, 0.08], [0.09, 0.09, 0.09], { sides: 0 });
    k.ball('#9A6A48', [tx + 0.08, ty - 0.14, 0.06], [0.09, 0.09, 0.09], { sides: 0 });
  },
  'clay-jar'(k, { v }) {
    const clay = v > 0.5 ? '#E58A5A' : '#D9774A';
    k.ball(['#C96A3E', clay], [0, 0.58, 0], [0.55, 0.58, 0.55]);
    k.cyl('#F2C28A', [0, 0.52, 0], 0.56, 0.1, { sides: 10 });
    k.cyl(clay, [0, 1.0, 0], 0.22, 0.32, { sides: 8 });
    k.cyl('#C96A3E', [0, 1.28, 0], 0.32, 0.12, { sides: 8 });
  },
  camel(k, { v }) {
    const fur = '#E2B57A';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.38, 0.25]) for (const z of [-0.12, 0.12]) k.stick(fur, [x, 0, z], [x, 0.9, z], 0.09);
      k.ball(fur, [-0.05, 0.95, 0], [0.55, 0.25, 0.28]);
      // Saddle blanket around the hump.
      k.ball('#FF7A8A', [-0.12, 0.98, 0], [0.26, 0.25, 0.3], { sides: 0 });
      k.ball(fur, [-0.12, 1.15, 0], [0.26, 0.25, 0.2]);
      for (const x of [-0.3, 0.06]) k.ball('#FFD45A', [x, 0.76, 0.27], [0.05, 0.05, 0.04], { sides: 0 });
      k.stick(fur, [0.42, 0.95, 0], [0.62, 0.85, 0], 0.16, 5);
      k.stick(fur, [0.62, 0.85, 0], [0.62, 1.38, 0], 0.15, 5);
      k.ball(fur, [0.74, 1.42, 0], [0.21, 0.12, 0.11], { rot: [0, 0, -0.2] });
      sideEyes(k, 0.76, 1.49, 0.09, 0.035);
      k.stick(fur, [-0.58, 0.98, 0], [-0.66, 0.7, 0], 0.04);
    });
  },
  lizard(k, { v }) {
    const skin = '#7FCB8A';
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      k.ball(skin, [0, 0.08, 0], [0.16, 0.08, 0.38]);
      k.ball(skin, [0, 0.1, -0.48], [0.14, 0.08, 0.17]);
      k.stick(skin, [0, 0.06, 0.3], [0.1, 0.05, 0.65], 0.12);
      k.stick(skin, [0.1, 0.05, 0.65], [0.48, 0.04, 0.76], 0.08);
      for (const s of [-1, 1]) {
        k.stick(skin, [0, 0.06, -0.15], [s * 0.3, 0.03, -0.3], 0.07);
        k.stick(skin, [0, 0.06, 0.2], [s * 0.28, 0.03, 0.35], 0.07);
        k.ball('#3E3440', [s * 0.08, 0.16, -0.54], [0.035, 0.035, 0.035], { sides: 0 });
      }
      k.ball('#FFD45A', [0, 0.15, -0.05], [0.05, 0.03, 0.05], { sides: 0 });
    });
  },
  succulent(k, { v }) {
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      for (let n = 0; n < 8; n++) {
        const a = (n / 8) * Math.PI * 2;
        k.ball(n % 2 ? '#8CC9B0' : '#79B8A0', [Math.cos(a) * 0.5, 0.12, Math.sin(a) * 0.5], [0.45, 0.1, 0.17], { rot: [0, -a, 0.3], sides: 0 });
      }
      for (let n = 0; n < 5; n++) {
        const a = (n / 5) * Math.PI * 2 + 0.3;
        k.ball('#A7DCC6', [Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25], [0.28, 0.1, 0.13], { rot: [0, -a, 0.7], sides: 0 });
      }
      k.ball('#F2A8C4', [0, 0.32, 0], [0.12, 0.08, 0.12], { sides: 0 });
    });
  },
  rock: rock3d('#E9C8A0', '#C9A274', '#FBE7CC'),
  'desert-bridge': bridge3d({ deck: '#B9774A', deckShade: '#94603C', side: '#8E5634', rail: '#6E4028', planks: true, hump: 0.04 }),
  'lily-pads': lilyPads3d('#7FD3FF'),
};
