/** Mountain pasture in 3D: firs, chalets, marmots, ibexes, cows with bells, cairns and edelweiss. */
import { bridge3d, pine3d, quadruped, rock3d } from './common';
import { eyes, type Kit, type ModelMap } from './kit';

/** Plank footbridge with a style's wood (the counterpart of plankBridge). */
export const plank3d = (wood: string, woodDark: string, rail: string) =>
  bridge3d({ deck: wood, deckShade: woodDark, side: woodDark, rail, planks: true, hump: 0.035 });

/** Pitched roof on walls `w` wide and `d` deep ending at `top`: a gable prism and two slabs. */
export function gableRoof(k: Kit, w: number, d: number, top: number, rise: number, wall: string, left: string, right = left) {
  const half = w / 2;
  // A three-sided cylinder lying along z, apex up.
  k.cyl(wall, [0, top + rise / 3, d / 2], half / 0.866, d, { sides: 3, rz: (rise * 2) / 3, rot: [-Math.PI / 2, 0, 0] });
  const a = Math.atan(rise / half);
  const reach = half + 0.2;
  const [mx, my] = [reach / 2, top + rise - (reach / 2) * Math.tan(a)];
  k.box(left, [-mx, my, 0], [reach / Math.cos(a) + 0.04, 0.08, d + 0.2], { rot: [0, 0, a] });
  k.box(right, [mx, my, 0], [reach / Math.cos(a) + 0.04, 0.08, d + 0.2], { rot: [0, 0, -a] });
}

/** Two little eyes on the sides of a head facing +x. */
export function sideEyes(k: Kit, x: number, y: number, z: number, s = 0.04) {
  k.ball('#2E2428', [x, y, z], [s, s, s * 0.7], { sides: 0 });
  k.ball('#2E2428', [x, y, -z], [s, s, s * 0.7], { sides: 0 });
}

export const montagne: ModelMap = {
  fir: pine3d('#3F8F6A', '#55A67D'),
  chalet(k) {
    k.box('#D9D2C8', [0, 0, 0], [1.4, 0.45, 1.1]);
    k.box('#C98A5A', [0, 0.45, 0], [1.3, 0.65, 1.0]);
    gableRoof(k, 1.3, 1.0, 1.1, 0.55, '#C98A5A', '#8A5A3A');
    // Balcony with flower boxes, windows lit once watered.
    k.box('#8A5A3A', [0, 0.45, 0.62], [1.4, 0.05, 0.25]);
    k.box('#8A5A3A', [0, 0.5, 0.72], [1.4, 0.16, 0.04]);
    for (const x of [-0.3, 0.3]) {
      k.box('#CFE6F2', [x, 0.72, 0.5], [0.24, 0.22, 0.03]);
      k.box('#A86A3E', [x, 0.66, 0.74], [0.4, 0.08, 0.08]);
    }
    k.box('#8A5A3A', [0, 0, 0.55], [0.3, 0.4, 0.03]);
    k.bloom(0.5, () => {
      for (const x of [-0.3, 0.3]) {
        k.box('#FFE9A0', [x, 0.73, 0.515], [0.2, 0.18, 0.02]);
        k.ball('#FF5A6E', [x - 0.1, 0.78, 0.74], [0.07, 0.07, 0.07], { sides: 0 });
        k.ball('#FF8FB6', [x + 0.1, 0.78, 0.74], [0.07, 0.07, 0.07], { sides: 0 });
      }
    });
  },
  marmot(k) {
    const fur = '#B98A5E';
    k.dome('#8A7A6A', [0, 0, 0], [0.55, 0.1, 0.45]);
    k.ball([fur, fur], [0, 0.6, 0], [0.36, 0.5, 0.3]);
    k.ball('#E3C8A0', [0, 0.55, 0.13], [0.22, 0.36, 0.2]);
    k.ball(fur, [0, 1.2, 0.02], [0.26, 0.24, 0.24]);
    k.ball(fur, [-0.18, 1.4, 0], [0.08, 0.08, 0.06], { sides: 0 });
    k.ball(fur, [0.18, 1.4, 0], [0.08, 0.08, 0.06], { sides: 0 });
    k.ball('#E3C8A0', [0, 1.13, 0.2], [0.14, 0.09, 0.09], { sides: 0 });
    k.ball('#3E3440', [0, 1.18, 0.29], [0.04, 0.04, 0.03], { sides: 0 });
    eyes(k, 0, 1.28, 0.22, 0.1, 0.045);
    k.stick('#A67A50', [-0.25, 0.85, 0.12], [-0.1, 0.72, 0.28], 0.1);
    k.stick('#A67A50', [0.25, 0.85, 0.12], [0.1, 0.72, 0.28], 0.1);
  },
  ibex(k, { v }) {
    // Standing proudly on a rock, long ridged horns sweeping back.
    k.rock(['#B5AFAA', '#C9C3BE'], [0, 0.12, 0], [0.75, 0.3, 0.55], { rot: [0, v * 6, 0] });
    k.dome('#E3DFDA', [-0.1, 0.32, 0], [0.4, 0.06, 0.3]);
    k.at([0, 0.3, 0], v > 0.5 ? 0 : Math.PI, 0.85, () => {
      quadruped(k, { body: '#B8A288', legs: '#8E7A64', size: [0.5, 0.3], neck: 0.4, legLen: 0.4 });
      const [hx, hy] = [0.475, 1.01];
      k.ball('#8E7A64', [hx + 0.12, hy - 0.22, 0], [0.06, 0.12, 0.06], { sides: 0 });
      for (const z of [-0.08, 0.08]) {
        k.stick('#7A6A58', [hx - 0.05, hy + 0.12, z], [hx - 0.18, hy + 0.5, z * 1.3], 0.09);
        k.stick('#7A6A58', [hx - 0.18, hy + 0.5, z * 1.3], [hx - 0.5, hy + 0.58, z * 1.6], 0.08);
      }
    });
  },
  cow(k, { v }) {
    const coat = v > 0.25 && v < 0.75 ? '#C98A5A' : '#FFFFFF';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      quadruped(k, { body: coat, legs: '#E8DCD0', size: [0.6, 0.38], neck: 0.12, legLen: 0.38 });
      const [hx, hy] = [0.57, 0.77];
      k.ball('#8A5A3A', [-0.2, 0.7, 0.28], [0.18, 0.14, 0.1], { sides: 0 });
      k.ball('#8A5A3A', [0.15, 0.52, -0.3], [0.14, 0.12, 0.08], { sides: 0 });
      k.ball('#FFC1C9', [hx + 0.2, hy - 0.08, 0], [0.12, 0.12, 0.15], { sides: 0 });
      for (const z of [-0.12, 0.12]) k.stick('#E8DCC8', [hx - 0.02, hy + 0.15, z], [hx - 0.04, hy + 0.32, z * 1.8], 0.06);
      k.stick(coat, [-0.6, 0.75, 0], [-0.7, 0.4, 0], 0.05);
      // Bell on a red strap.
      k.stick('#E8414F', [hx - 0.1, hy - 0.08, 0], [hx - 0.08, hy - 0.26, 0], 0.07);
      k.cyl('#FFC93A', [hx - 0.08, hy - 0.42, 0], 0.1, 0.17, { sides: 6, top: 0.55 });
    });
  },
  cairn(k, { v }) {
    const stones: Array<[number, number, number, string]> = [
      [0.18, 0.6, 0.2, '#B8B2AC'],
      [0.52, 0.48, 0.17, '#CFC9C3'],
      [0.82, 0.36, 0.15, '#BCB6B0'],
      [1.06, 0.26, 0.12, '#D9D4CE'],
      [1.24, 0.16, 0.09, '#C4BEB8'],
    ];
    stones.forEach(([y, rx, ry, c], n) => {
      k.rock(c, [Math.sin(n * 2.1 + v * 6) * 0.05, y, 0], [rx, ry, rx * 0.85], { rot: [0, v * 6 + n, 0] });
    });
  },
  edelweiss(k, { v }) {
    for (const [x, z, s] of [
      [-0.4, -0.2, 0.5],
      [0.35, 0.1, 0.45],
      [-0.05, 0.4, 0.4],
    ]) {
      // Two crossed triangles make a six-pointed star.
      const turn = v * 6 + x;
      k.cyl('#FFFFFF', [x, 0.03, z], s, 0.05, { sides: 3, rot: [0, turn, 0] });
      k.cyl('#FFFFFF', [x, 0.03, z], s, 0.05, { sides: 3, rot: [0, turn + Math.PI / 3, 0] });
      k.cyl('#F2F4E8', [x, 0.06, z], s * 0.7, 0.04, { sides: 3, rot: [0, turn + Math.PI / 6, 0] });
      k.ball('#E8E070', [x, 0.1, z], [s * 0.25, s * 0.12, s * 0.25], { sides: 0 });
    }
  },
  rock: rock3d('#CFCBC6', '#AEA8A2', '#EFEDEA', '#9AD88A'),
  'plank-bridge': plank3d('#C98A5A', '#B57846', '#8A5A3A'),
};
