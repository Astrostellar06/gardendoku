/** Autumn garden in 3D: maple leaves, acorns, pumpkins, hedgehog, squirrel and forest mushrooms. */
import { bridge3d, mushroom3d, rock3d, tree3d } from './common';
import type { Kit, ModelMap, Vec } from './kit';

const LEAVES = ['#F2804E', '#E85D4A', '#FFB347', '#F5C04A', '#D9643A'];

/** Maple leaf lying flat: lobes fanning from its centre, pointing along angle a (in the ground plane). */
export function mapleLeaf3d(k: Kit, [x, y, z]: Vec, s: number, a: number, color: string, lobes = 5) {
  const fan = lobes === 5 ? [0, -1.25, 1.25, -2.4, 2.4] : [0, -1.3, 1.3];
  fan.forEach((d, n) => {
    const t = a + d;
    const l = n > 2 ? 0.65 : 1;
    k.ball(color, [x + Math.cos(t) * 0.45 * s * l, y + n * 0.004, z + Math.sin(t) * 0.45 * s * l], [0.52 * s * l, 0.03, 0.2 * s * l], {
      rot: [0, -t, 0],
      sides: 0,
    });
  });
}

export const automne: ModelMap = {
  'fallen-leaves'(k, { v }) {
    for (let n = 0; n < 4; n++) {
      const a = v * Math.PI * 2 + n * 1.7;
      const d = n === 0 ? 0 : 0.55;
      mapleLeaf3d(k, [Math.cos(a) * d, 0.03 + n * 0.02, Math.sin(a) * d], 0.42 - n * 0.04, a * 1.3, LEAVES[(n + Math.floor(v * 5)) % 5]);
    }
  },
  acorns(k) {
    const one = (x: number, z: number, s: number, tilt: number) => {
      const o = { rot: [0, 0, tilt] as Vec };
      const along = (t: number): Vec => [x - Math.sin(tilt) * t * s, Math.cos(tilt) * t * s, z];
      k.ball('#D4924F', along(0.45), [0.34 * s, 0.45 * s, 0.34 * s], o);
      k.dome('#8A5A3A', along(0.62), [0.4 * s, 0.24 * s, 0.4 * s], o);
      k.stick('#6E452C', along(0.82), along(1.02), 0.08 * s);
    };
    one(-0.35, -0.05, 1, 0.3);
    one(0.4, 0.3, 0.85, -0.4);
  },
  pumpkin(k, { v }) {
    const c = v > 0.3 ? '#FF9A3C' : '#FFC45A';
    const dark = v > 0.3 ? '#E8782A' : '#EAA53A';
    k.ball(c, [0, 0.48, 0], [0.5, 0.47, 0.5]);
    for (let n = 0; n < 6; n++) {
      const a = (n / 6) * Math.PI * 2 + 0.3;
      k.ball(n % 2 ? c : dark, [Math.cos(a) * 0.35, 0.46, Math.sin(a) * 0.35], [0.32, 0.44, 0.28], { rot: [0, -a, 0] });
    }
    k.stick('#6E8A3A', [0, 0.85, 0], [0.1, 1.15, 0], 0.12);
    k.ball('#8DB04A', [0.32, 0.98, 0.1], [0.3, 0.04, 0.13], { rot: [0, -0.3, -0.3], sides: 0 });
  },
  hedgehog(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? -0.4 : Math.PI + 0.4, 1, () => {
      k.ball('#A57A5C', [-0.05, 0.28, 0], [0.65, 0.28, 0.42]);
      k.dome('#8A6248', [-0.15, 0.18, 0], [0.72, 0.58, 0.52]);
      // Spikes standing out of the back.
      for (const tz of [-0.6, 0, 0.6]) {
        for (const tx of [0.35, 0.95, 1.45]) {
          const dir: Vec = [-Math.sin(tx), Math.cos(tx) * Math.cos(tz), Math.cos(tx) * Math.sin(tz)];
          k.cone('#8A6248', [-0.15 + dir[0] * 0.62, 0.18 + dir[1] * 0.5, dir[2] * 0.45], 0.11, 0.3, { sides: 4, rot: [tz, 0, tx] });
        }
      }
      k.ball('#F3DDBF', [0.55, 0.3, 0], [0.36, 0.24, 0.26], { rot: [0, 0, -0.2] });
      k.ball('#4A3A44', [0.9, 0.24, 0], [0.07, 0.07, 0.07], { sides: 0 });
      k.ball('#4A3A44', [0.6, 0.4, 0.2], [0.05, 0.05, 0.04], { sides: 0 });
      k.ball('#4A3A44', [0.6, 0.4, -0.2], [0.05, 0.05, 0.04], { sides: 0 });
    });
  },
  'autumn-tree'(k, info) {
    const c = info.v > 0.5 ? ['#FF9A3C', '#F2804E', '#FFC45A'] : ['#E85D4A', '#F28C5A', '#FFB347'];
    tree3d({ foliage: c, trunk: '#8A5A3A' })(k, info);
    mapleLeaf3d(k, [0.55, 0.03, 0.75], 0.2, 0.8, c[1], 3);
  },
  'leaf-pile'(k, { v }) {
    k.dome('#D9643A', [0, 0, 0], [0.85, 0.32, 0.65]);
    k.dome('#F2804E', [0.15, 0, -0.1], [0.6, 0.42, 0.45]);
    for (let n = 0; n < 5; n++) {
      const a = n * 2.4 + v * 5;
      const d = n ? 0.42 : 0.05;
      const [x, z] = [Math.cos(a) * d, Math.sin(a) * d * 0.7];
      mapleLeaf3d(k, [x, 0.36 - d * 0.35, z], 0.33, a, LEAVES[(n + 2) % 5], 3);
    }
  },
  apples(k) {
    for (const [x, z, c] of [
      [-0.35, 0.15, '#E9564A'],
      [0.38, 0.25, '#F27C4E'],
      [0, -0.2, '#D9443E'],
    ] as const) {
      k.ball(c, [x, 0.34, z], [0.38, 0.35, 0.38]);
      k.stick('#6E452C', [x, 0.62, z], [x + 0.05, 0.82, z], 0.07);
    }
    k.ball('#7DB04A', [0.12, 0.72, -0.2], [0.17, 0.03, 0.08], { rot: [0, 0.3, 0.3], sides: 0 });
  },
  squirrel(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? -0.4 : Math.PI + 0.4, 1, () => {
      // Big curled tail behind.
      k.ball('#C96A3A', [-0.42, 0.75, 0], [0.3, 0.62, 0.24], { rot: [0, 0, -0.3] });
      k.ball('#D9804A', [-0.32, 1.35, 0], [0.28, 0.24, 0.22]);
      k.ball('#D9804A', [0.1, 0.45, 0], [0.34, 0.45, 0.3]);
      k.ball('#F6D2A8', [0.22, 0.45, 0], [0.24, 0.32, 0.2]);
      k.ball('#D9804A', [0.25, 1.0, 0], [0.28, 0.26, 0.24]);
      for (const z of [-0.12, 0.12]) k.cone('#C96A3A', [0.18, 1.18, z], 0.07, 0.2, { sides: 4 });
      k.ball('#4A3A44', [0.43, 1.04, 0.14], [0.05, 0.05, 0.04], { sides: 0 });
      k.ball('#4A3A44', [0.43, 1.04, -0.14], [0.05, 0.05, 0.04], { sides: 0 });
      k.ball('#4A3A44', [0.53, 0.97, 0], [0.04, 0.04, 0.04], { sides: 0 });
      // Holding an acorn.
      k.ball('#D4924F', [0.45, 0.62, 0], [0.12, 0.14, 0.12], { sides: 0 });
      k.dome('#8A5A3A', [0.45, 0.7, 0], [0.13, 0.08, 0.13]);
      for (const z of [-0.15, 0.15]) k.ball('#C96A3A', [0.25, 0.05, z], [0.16, 0.06, 0.08], { sides: 0 });
    });
  },
  'forest-mushrooms'(k, { v }) {
    const flip = v > 0.5 ? 1 : -1;
    // Cep: thick cream stem, round brown cap.
    const cx = -flip * 0.32;
    k.ball('#F4E3C3', [cx, 0.35, -0.1], [0.26, 0.38, 0.26]);
    k.cyl('#7E4A28', [cx, 0.64, -0.1], 0.47, 0.04, { sides: 8 });
    k.dome(['#9A5E34', '#A86A3E'], [cx, 0.66, -0.1], [0.48, 0.38, 0.48]);
    // Fly agaric: slim white stem with a ring, red cap with white dots.
    const ax = flip * 0.4;
    k.cyl('#FFF8EE', [ax, 0, 0], 0.11, 0.78, { top: 0.8 });
    k.cyl('#F1E4D2', [ax, 0.5, 0], 0.17, 0.04, { sides: 8 });
    k.dome('#E8473F', [ax, 0.72, 0], [0.36, 0.32, 0.36]);
    for (const [dx, dy, dz] of [
      [-0.15, 0.93, 0.18],
      [0.12, 0.98, 0.1],
      [0.02, 1.02, -0.08],
    ]) {
      k.ball('#FFFFFF', [ax + dx, dy, dz], [0.06, 0.04, 0.06], { sides: 0 });
    }
    // A tiny one in front.
    k.cyl('#F4E3C3', [0, 0, 0.45], 0.06, 0.2, { sides: 5 });
    k.dome('#C97A44', [0, 0.17, 0.45], [0.16, 0.13, 0.16]);
  },
  mushroom: mushroom3d(['#E9564A', '#C96A3A', '#F2A65A']),
  rock: rock3d('#D9C3AE', '#B49A82', '#F3E6D8', '#C9A64A'),
  'plank-bridge': bridge3d({ deck: '#C98A5A', deckShade: '#B57846', side: '#B57846', rail: '#8A5A3A', planks: true, hump: 0.035 }),
  'floating-leaf'(k, { v }) {
    mapleLeaf3d(k, [0, 0.02, 0], 0.75, v * Math.PI * 2, LEAVES[Math.floor(v * 5)]);
    mapleLeaf3d(k, [0.4, 0.03, 0.9], 0.45, v * 9, LEAVES[(Math.floor(v * 5) + 2) % 5], 3);
  },
};
