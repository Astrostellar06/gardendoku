/** Spring garden in 3D: tulips, ladybugs, birdhouse, watering can, ducklings. */
import { bridge3d, lilyPads3d, mushroom3d, rock3d, snail3d } from './common';
import { eyes, type ModelMap } from './kit';

export const printemps: ModelMap = {
  tulips(k, { v }) {
    const colors = ['#FF7FA8', '#FFC94D', '#C9A0FF', '#FF9C6B'];
    const stems: Array<[number, number, number]> = [
      [-0.4, 0.1, 0.85],
      [0, -0.15, 1],
      [0.4, 0.15, 0.8],
    ];
    stems.forEach(([x, z, h], n) => {
      const top = 1.5 * h;
      k.stick('#5FB45B', [x, 0, z], [x * 0.85, top, z], 0.08);
      k.ball('#6FC266', [x + 0.15, 0.4, z], [0.22, 0.06, 0.1], { rot: [0, 0, 0.6], sides: 0 });
      const c = colors[Math.floor(v * 4 + n) % 4];
      k.cyl([c, c], [x * 0.85, top - 0.05, z], 0.2, 0.32, { sides: 5, top: 1.3 });
      k.dome(c, [x * 0.85, top - 0.05, z], [0.2, -0.14, 0.2]);
    });
  },
  ladybug(k, { v }) {
    k.at([0, 0, 0], v * 6.28, 1, () => {
      k.dome(['#E04050', '#FF5C6C'], [0, 0.02, 0], [0.8, 0.55, 0.65]);
      k.box('#3E3440', [0, 0.02, -0.01], [1.5, 0.58, 0.05]);
      k.ball('#3E3440', [0.8, 0.18, 0], [0.32, 0.25, 0.32], { sides: 0 });
      for (const [x, z] of [
        [-0.3, 0.3],
        [0.3, 0.32],
        [-0.25, -0.32],
        [0.25, -0.3],
      ]) {
        k.ball('#3E3440', [x, 0.45, z], [0.12, 0.08, 0.12], { sides: 0 });
      }
    });
  },
  snail: snail3d('#FFB3CB', '#E67FA2'),
  mushroom: mushroom3d(['#FF7A8A', '#FFB347', '#C9A0FF']),
  rock: rock3d('#E9E2F0', '#C9BFD6', '#FFFFFF', '#9FD98A'),
  birdhouse(k, { v }) {
    const wall = v > 0.5 ? '#9FD4F5' : '#FFC1D6';
    k.cyl('#C88E5C', [0, 0, 0], 0.08, 1.2, { sides: 4 });
    k.box(wall, [0, 1.1, 0], [0.75, 0.7, 0.7]);
    k.box('#E46C6C', [-0.2, 1.75, 0], [0.62, 0.08, 0.86], { rot: [0, 0, 0.7] });
    k.box('#E46C6C', [0.2, 1.75, 0], [0.62, 0.08, 0.86], { rot: [0, 0, -0.7] });
    k.cyl('#5A4048', [0, 1.4, 0.34], 0.14, 0.04, { rot: [Math.PI / 2, 0, 0], sides: 8 });
    k.stick('#C88E5C', [0, 1.22, 0.36], [0, 1.22, 0.55], 0.06);
  },
  'watering-can'(k, { v }) {
    const c = v > 0.5 ? '#8DC8FF' : '#B9A3F2';
    k.cyl([c, c], [0, 0, 0], 0.45, 0.85, { sides: 8 });
    k.stick(c, [0.35, 0.3, 0], [0.95, 0.85, 0], 0.13);
    k.cyl(c, [0.95, 0.8, 0], 0.12, 0.08, { rot: [0, 0, -0.7], sides: 6 });
    k.stick(c, [-0.35, 0.85, 0], [-0.05, 1.15, 0], 0.1);
    k.stick(c, [-0.05, 1.15, 0], [0.25, 0.85, 0], 0.1);
    k.ball('#FFFFFF', [-0.2, 0.55, 0.42], [0.12, 0.22, 0.04], { sides: 0 });
  },
  bee(k, { v }) {
    k.at([0, 1.1, 0], v * 6.28, 1, () => {
      k.ball('#FFD045', [0, 0, 0], [0.55, 0.38, 0.38]);
      k.box('#4A3A44', [-0.12, -0.38, 0], [0.13, 0.76, 0.78]);
      k.box('#4A3A44', [0.18, -0.36, 0], [0.13, 0.72, 0.74]);
      k.ball('rgba(255,255,255,1)', [-0.05, 0.45, 0.22], [0.25, 0.04, 0.18], { rot: [0.5, 0, 0], sides: 0 });
      k.ball('rgba(255,255,255,1)', [-0.05, 0.45, -0.22], [0.25, 0.04, 0.18], { rot: [-0.5, 0, 0], sides: 0 });
    });
  },
  'plank-bridge': bridge3d({ deck: '#E2B07A', deckShade: '#D29C63', side: '#D29C63', rail: '#B97F4E', planks: true, hump: 0.035 }),
  duckling(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      k.ball(['#FFC93A', '#FFD84D'], [0, 0.15, 0], [0.55, 0.38, 0.75]);
      k.ball('#FFE066', [0, 0.65, 0.55], [0.38, 0.36, 0.36]);
      k.ball('#FF9F43', [0, 0.6, 0.95], [0.16, 0.08, 0.14], { sides: 0 });
      eyes(k, 0, 0.75, 0.86, 0.17, 0.06);
      k.ball('#FFC93A', [0, 0.35, -0.75], [0.15, 0.1, 0.18], { rot: [0.6, 0, 0], sides: 0 });
    });
  },
  'lily-pads': lilyPads3d('#FFB3CB'),
};
