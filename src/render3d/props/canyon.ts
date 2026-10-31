/** Canyon in 3D: layered red rock, hoodoos, natural arches, junipers, bighorn sheep, camp and canoes. */
import { quadruped, rock3d } from './common';
import type { ModelMap } from './kit';
import { plank3d } from './montagne';

const ROCK = '#D9825C';
const ROCK_DARK = '#B8673F';
const ROCK_LIGHT = '#F0A27A';

export const canyon: ModelMap = {
  hoodoo(k, { v }) {
    const tall = 0.8 + v * 0.3;
    // Pinched column in sandstone layers, with a pale cap stone.
    k.cyl([ROCK_DARK, ROCK], [0, 0, 0], 0.42, 0.55, { sides: 7, top: 0.7 });
    k.cyl(ROCK_LIGHT, [0, 0.55, 0], 0.3, 0.07, { sides: 7 });
    k.cyl(ROCK, [0, 0.62, 0], 0.28, 0.35 * tall, { sides: 7, top: 0.62 });
    k.cyl([ROCK, ROCK_LIGHT], [0, 0.62 + 0.35 * tall, 0], 0.175, 0.45 * tall, { sides: 7, top: 1.3 });
    k.rock(['#C9B49A', '#E3D2BA'], [0, 0.66 + 0.8 * tall, 0], [0.38, 0.13, 0.34], { rot: [0, v * 6, 0] });
  },
  'rock-arch'(k) {
    for (const s of [-1, 1]) {
      k.cyl([ROCK_DARK, ROCK], [s * 0.62, 0, 0], 0.28, 1.2, { sides: 6, top: 0.75, rz: 0.32 });
      k.rock(ROCK, [s * 0.42, 1.12, 0], [0.24, 0.2, 0.26], { rot: [0, s, 0] });
    }
    k.rock(ROCK, [0, 1.3, 0], [0.85, 0.22, 0.3]);
    k.rock(ROCK_LIGHT, [-0.05, 1.45, 0], [0.55, 0.08, 0.2]);
  },
  juniper(k, { v }) {
    const trunk = '#8A6248';
    k.stick(trunk, [0, 0, 0], [-0.12, 0.5, 0], 0.12);
    k.stick(trunk, [-0.12, 0.5, 0], [0.08, 0.95, 0], 0.11);
    k.stick(trunk, [0.08, 0.95, 0], [0.12, 1.3, 0], 0.09);
    k.stick(trunk, [0.05, 0.9, 0], [-0.4, 1.2, 0], 0.08);
    const blobs: Array<[number, number, number, number]> = [
      [-0.45, 1.33, -0.05, 0.3],
      [0.1, 1.55, -0.1, 0.37],
      [0.45, 1.25, 0.05, 0.28],
      [-0.1, 1.2, 0.2, 0.24],
    ];
    for (const [x, y, z, s] of blobs) k.ball(['#8FA07A', '#A6B592'], [x, y, z], [s, s * 0.85, s], { sides: 0, rot: [0, v * 6, 0] });
    // Greener with the water, and blue berries.
    k.bloom(0.5, () => {
      for (const [x, y, z, s] of blobs) k.ball(['#6E9E6A', '#88B884'], [x, y, z], [s * 1.04, s * 0.9, s * 1.04], { sides: 0, rot: [0, v * 6, 0] });
      for (const [x, y] of [
        [-0.35, 1.45],
        [0.25, 1.75],
        [0.4, 1.35],
      ]) {
        k.ball('#8CA8D8', [x, y, 0.3], [0.06, 0.06, 0.06], { sides: 0 });
      }
    });
  },
  sagebrush(k) {
    for (const [x, h, z, s] of [
      [-0.4, 0.5, 0, 0.35],
      [0.35, 0.45, 0.06, 0.32],
      [0, 0.75, -0.25, 0.42],
      [-0.15, 0.4, 0.18, 0.3],
      [0.2, 0.33, 0.24, 0.28],
    ]) {
      k.ball(['#A8B898', '#C2D0B2'], [x, h, z], [s, s * 0.85, s], { sides: 0 });
    }
    for (const [x, y, z] of [
      [-0.3, 0.85, 0.1],
      [0.2, 1.1, -0.1],
      [0.45, 0.75, 0.15],
    ]) {
      k.ball('#FFD45A', [x, y, z], [0.06, 0.06, 0.06], { sides: 0 });
    }
  },
  bighorn(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      quadruped(k, { body: '#C9A27A', legs: '#A8845E', size: [0.5, 0.3], neck: 0.35, legLen: 0.42 });
      const [hx, hy] = [0.475, 0.98];
      k.ball('#F2E6D4', [-0.45, 0.62, 0], [0.12, 0.14, 0.26], { sides: 0 });
      k.ball('#F2E6D4', [hx + 0.2, hy - 0.06, 0], [0.1, 0.09, 0.12], { sides: 0 });
      // Curled horns.
      for (const z of [-0.2, 0.2]) k.ring('#E8D3B0', [hx - 0.1, hy + 0.02, z], 0.17, 0.12, { rot: [Math.PI / 2, 0, 0] });
    });
  },
  camp(k) {
    const along: [number, number, number] = [-Math.PI / 2, 0, 0];
    // Tent: a triangular prism along z, with its dark doorway.
    k.cyl(['#4A93AD', '#5EAFC9'], [-0.3, 0.4, 0.5], 0.69, 1.1, { sides: 3, rz: 0.8, rot: along });
    k.cyl('#2F6E86', [-0.3, 0.2, 0.52], 0.3, 0.02, { sides: 3, rz: 0.4, rot: along });
    k.stick('#8A6248', [-0.3, 1.18, 0.5], [-0.3, 1.38, 0.55], 0.05);
    // Campfire, lit with the water.
    k.stick('#8A6248', [0.4, 0.05, 0.3], [0.8, 0.12, 0.6], 0.1);
    k.stick('#8A6248', [0.8, 0.05, 0.3], [0.4, 0.12, 0.6], 0.1);
    k.bloom(0.4, () => {
      // Flames flickering.
      k.swing([0.6, 0.06, 0.45], [0, 0, 1], 0.18, 3.1, () => k.cone('#FF9F43', [0.6, 0.06, 0.45], 0.17, 0.45, { sides: 5 }));
      k.swing([0.6, 0.06, 0.53], [1, 0, 0.3], 0.25, 4.3, () => k.cone('#FFD45A', [0.6, 0.06, 0.53], 0.1, 0.28, { sides: 5 }));
    });
  },
  rock: rock3d(ROCK, ROCK_DARK, ROCK_LIGHT),
  'plank-bridge': plank3d('#B8875A', '#A67648', '#7A5A3E'),
  canoe(k, { v }) {
    k.ball(v > 0.5 ? '#E8553F' : '#F2B33D', [0, 0.04, 0], [0.45, 0.28, 1.15]);
    k.ball('#8A5A3A', [0, 0.3, 0], [0.31, 0.03, 0.95], { sides: 0 });
    for (const z of [-0.4, 0.4]) k.box('#C98A5A', [0, 0.28, z], [0.62, 0.05, 0.1]);
    k.stick('#C98A5A', [-0.55, 0.45, -0.1], [0.6, 0.05, 0.15], 0.07);
    k.ball('#C98A5A', [0.65, 0.02, 0.17], [0.1, 0.03, 0.2], { sides: 0 });
  },
};
