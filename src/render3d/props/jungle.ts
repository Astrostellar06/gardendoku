/** Jungle in 3D: monstera, ferns, hibiscus, bamboo, toucan, tiki, frogs, turtles and crocodiles. */
import { bridge3d, rock3d } from './common';
import type { ModelMap } from './kit';

const CROC = '#5FA85A';
const CROC_LIGHT = '#86C474';
const CROC_DARK = '#468A45';

export const jungle: ModelMap = {
  monstera(k, { v }) {
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      k.ball(['#257A40', '#2F9450'], [0, 0.1, 0.1], [0.62, 0.06, 0.72]);
      // Lobes between the splits of the leaf.
      for (let n = 0; n < 7; n++) {
        const a = -Math.PI / 2 + (n - 3) * 0.45;
        k.ball('#2F9450', [Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6], [0.3, 0.05, 0.12], { rot: [0, -a, 0.15], sides: 0 });
      }
      k.stick('#5DBA6A', [0, 0.17, 0.82], [0, 0.17, -0.6], 0.06);
      k.stick('#5DBA6A', [0, 0.02, 1.0], [0, 0.15, 0.78], 0.06);
    });
  },
  fern(k, { v }) {
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      for (let n = 0; n < 5; n++) {
        const a = (n / 5) * Math.PI * 2;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        // Each frond arches up then down.
        k.ball('#4FAE62', [c * 0.3, 0.2, s * 0.3], [0.32, 0.04, 0.2], { rot: [0, -a, 0.45], sides: 0 });
        k.ball('#3E9A55', [c * 0.72, 0.22, s * 0.72], [0.3, 0.04, 0.14], { rot: [0, -a, -0.35], sides: 0 });
      }
      k.ball('#3E9A55', [0, 0.12, 0], [0.15, 0.12, 0.15], { sides: 0 });
    });
  },
  hibiscus(k, { v }) {
    const c = ['#FF5E7E', '#FF9F43', '#FF7AC6', '#FFD45A'][Math.floor(v * 4)];
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      k.ball('#3E9A55', [0.42, 0.05, 0.45], [0.5, 0.04, 0.17], { rot: [0, -0.82, 0], sides: 0 });
      k.ball('#2F9450', [-0.45, 0.05, 0.35], [0.45, 0.04, 0.15], { rot: [0, -2.51, 0], sides: 0 });
      for (let n = 0; n < 5; n++) {
        const a = (n / 5) * Math.PI * 2;
        k.ball(c, [Math.cos(a) * 0.35, 0.22, Math.sin(a) * 0.35], [0.38, 0.06, 0.3], { rot: [0, -a, 0.35], sides: 0 });
      }
      k.ball('#C8325A', [0, 0.2, 0], [0.18, 0.06, 0.18], { sides: 0 });
      k.stick('#FFE07A', [0, 0.2, 0], [0.3, 0.55, -0.25], 0.06);
      k.ball('#FFC83A', [0.3, 0.56, -0.25], [0.08, 0.08, 0.08], { sides: 0 });
    });
  },
  bamboo(k) {
    for (const [x, z, h] of [
      [-0.35, 0.05, 1.75],
      [0, -0.15, 2.0],
      [0.35, 0.12, 1.6],
    ]) {
      k.cyl(['#8CBB4A', '#9CCB5A'], [x, 0, z], 0.08, h, { sides: 6 });
      for (let y = 0.35; y < h - 0.15; y += 0.45) k.cyl('#6E9A3A', [x, y, z], 0.095, 0.05, { sides: 6 });
      const side = x > 0 ? 1 : -1;
      k.ball('#5DB05A', [x + side * 0.3, h - 0.15, z], [0.32, 0.04, 0.09], { rot: [0, 0, -side * 0.45], sides: 0 });
    }
  },
  toucan(k, { v }) {
    const black = '#3E3A48';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      // Perch.
      for (const x of [-0.5, 0.5]) k.stick('#8A5A3A', [x, 0, 0], [x, 0.33, 0], 0.08);
      k.stick('#8A5A3A', [-0.62, 0.33, 0], [0.62, 0.33, 0], 0.1);
      k.stick(black, [-0.15, 0.55, 0], [-0.42, 0.08, 0], 0.16);
      k.ball(black, [-0.05, 0.8, 0], [0.28, 0.45, 0.26], { rot: [0, 0, 0.15] });
      k.ball('#FFF3C2', [0.12, 1.0, 0], [0.16, 0.24, 0.2], { sides: 0 });
      k.ball(black, [0.05, 1.33, 0], [0.24, 0.23, 0.22]);
      // Big colourful beak.
      k.ball('#FF9F43', [0.48, 1.3, 0], [0.38, 0.11, 0.1], { rot: [0, 0, -0.15] });
      k.ball('#E8574F', [0.83, 1.24, 0], [0.09, 0.06, 0.06], { sides: 0 });
      for (const s of [-1, 1]) {
        k.ball('#9CE0FF', [0.1, 1.38, s * 0.18], [0.09, 0.09, 0.05], { sides: 0 });
        k.ball('#3E3440', [0.12, 1.38, s * 0.22], [0.045, 0.045, 0.03], { sides: 0 });
      }
    });
  },
  tiki(k) {
    const stone = '#B8A890';
    const dark = '#8E806A';
    k.cyl(['#A89880', stone], [0, 0, 0], 0.42, 1.65, { sides: 8, rz: 0.32 });
    k.dome(stone, [0, 1.65, 0], [0.42, 0.18, 0.32]);
    for (const s of [-1, 1]) k.box(dark, [s * 0.18, 1.3, 0.27], [0.24, 0.2, 0.08]);
    k.box(stone, [0, 0.95, 0.27], [0.16, 0.36, 0.12]);
    k.box(dark, [0, 0.95, 0.3], [0.16, 0.06, 0.06]);
    k.box(dark, [0, 0.62, 0.27], [0.56, 0.2, 0.08]);
    k.box('#F4EEE2', [0, 0.72, 0.29], [0.4, 0.09, 0.08]);
    k.bloom(0.4, () => {
      k.ball('#5DBA6A', [-0.2, 1.8, 0], [0.3, 0.07, 0.15], { rot: [0, 0.3, -0.3], sides: 0 });
      k.ball('#5DBA6A', [0.35, 0.08, 0.3], [0.25, 0.06, 0.12], { rot: [0, -0.5, 0.2], sides: 0 });
    });
  },
  'banana-plant'(k, { v }) {
    k.cyl(['#7AAE4A', '#8BBF5A'], [0, 0, 0], 0.11, 1.05, { sides: 6, top: 0.8 });
    for (let n = 0; n < 4; n++) {
      const a = (n / 4) * Math.PI * 2 + 0.4 + v * 2;
      k.ball(n % 2 ? '#5DBA6A' : '#4FAE62', [Math.cos(a) * 0.4, 1.35, Math.sin(a) * 0.4], [0.55, 0.04, 0.17], { rot: [0, -a, 0.65], sides: 0 });
    }
    for (let n = 0; n < 4; n++) k.ball('#FFD45A', [0.15 + n * 0.03, 0.95 - n * 0.1, 0.12], [0.14, 0.05, 0.05], { rot: [0, 0, 0.5], sides: 0 });
  },
  'dart-frog'(k, { v }) {
    const c = v > 0.5 ? '#3FA9F5' : '#FF5E5E';
    k.at([0, 0, 0], v * Math.PI * 2, 1, () => {
      for (const s of [-1, 1]) {
        k.ball(c, [s * 0.5, 0.06, -0.4], [0.25, 0.06, 0.12], { rot: [0, s * 0.6, 0], sides: 0 });
        k.ball(c, [s * 0.55, 0.06, 0.45], [0.25, 0.06, 0.12], { rot: [0, -s * 0.7, 0], sides: 0 });
        k.ball('#3E3440', [s * 0.25, 0.3, -0.5], [0.12, 0.12, 0.12], { sides: 0 });
      }
      k.ball(c, [0, 0.16, 0], [0.45, 0.2, 0.6]);
      k.ball('#3E3440', [-0.2, 0.33, -0.1], [0.11, 0.04, 0.11], { sides: 0 });
      k.ball('#3E3440', [0.18, 0.31, 0.2], [0.09, 0.04, 0.09], { sides: 0 });
    });
  },
  rock: rock3d('#B8B09A', '#948A74', '#DCD6C6', '#5DBA6A'),
  'plank-bridge': bridge3d({ deck: '#B8875A', deckShade: '#A67648', side: '#A67648', rail: '#8A6A48', planks: true, hump: 0.035, vines: '#5DB05A' }),
  turtle(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const s of [-1, 1]) {
        k.ball('#8CCB7A', [s * 0.6, 0, 0.35], [0.28, 0.05, 0.13], { rot: [0, s * 0.6, 0], sides: 0 });
        k.ball('#8CCB7A', [s * 0.5, 0, -0.45], [0.28, 0.05, 0.13], { rot: [0, -s * 0.7, 0], sides: 0 });
      }
      k.ball('#8CCB7A', [0, 0.08, 0.82], [0.22, 0.17, 0.22]);
      for (const s of [-1, 1]) k.ball('#3E3440', [s * 0.12, 0.16, 0.98], [0.035, 0.035, 0.03], { sides: 0 });
      k.dome(['#3F8A63', '#4E9E73'], [0, -0.05, 0], [0.62, 0.38, 0.72]);
      for (const [x, z] of [
        [0, 0],
        [-0.3, -0.3],
        [0.3, -0.3],
        [-0.3, 0.3],
        [0.3, 0.3],
      ]) {
        k.ball('#6FBF7A', [x, x || z ? 0.22 : 0.33, z], [0.17, 0.05, 0.17], { sides: 0 });
      }
    });
  },
  'croc-swim'(k, { v }) {
    // Gliding along the canal, snout toward +z, mostly under water.
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const s of [-1, 1]) {
        k.ball(CROC, [s * 0.46, -0.02, 0.3], [0.22, 0.05, 0.09], { rot: [0, s * 0.8, 0], sides: 0 });
        k.ball(CROC, [s * 0.44, -0.02, -0.35], [0.22, 0.05, 0.09], { rot: [0, -s * 0.8, 0], sides: 0 });
      }
      k.ball(CROC, [0, 0, -0.05], [0.42, 0.14, 0.75]);
      k.cone(CROC, [0, 0, -0.6], 0.26, 0.85, { sides: 4, rz: 0.08, rot: [-Math.PI / 2, 0, 0] });
      k.ball(CROC, [0, 0.02, 0.78], [0.24, 0.09, 0.42]);
      k.ball(CROC_LIGHT, [0, 0.1, -0.05], [0.12, 0.06, 0.45], { sides: 0 });
      for (let n = 0; n < 3; n++) {
        for (const s of [-1, 1]) k.ball(CROC_DARK, [s * 0.1, 0.11, -0.4 + n * 0.25], [0.06, 0.04, 0.06], { sides: 0 });
      }
      for (const s of [-1, 1]) {
        k.ball(CROC_LIGHT, [s * 0.16, 0.1, 0.52], [0.11, 0.1, 0.11], { sides: 0 });
        k.ball('#3E3440', [s * 0.16, 0.16, 0.58], [0.05, 0.05, 0.04], { sides: 0 });
        k.ball(CROC_DARK, [s * 0.07, 0.1, 1.1], [0.035, 0.03, 0.035], { sides: 0 });
      }
    });
  },
  'croc-bank'(k, { v }) {
    // Basking side on, with a big friendly smile.
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.25, 0.3]) for (const z of [-0.24, 0.24]) k.cyl(CROC_DARK, [x, 0, z], 0.08, 0.3, { sides: 5 });
      k.ball(CROC, [0, 0.38, 0], [0.58, 0.26, 0.32]);
      k.ball('#C9E3A0', [0, 0.3, 0], [0.48, 0.15, 0.33], { sides: 0 });
      k.cone(CROC, [-0.45, 0.3, 0], 0.22, 0.75, { sides: 4, rz: 0.18, rot: [0, 0, Math.PI / 2 + 0.3] });
      for (let n = 0; n < 3; n++) k.ball(CROC_DARK, [-0.35 + n * 0.25, 0.63, 0], [0.07, 0.06, 0.07], { sides: 0 });
      k.ball(CROC, [0.45, 0.48, 0], [0.22, 0.2, 0.2]);
      k.ball(CROC, [0.72, 0.42, 0], [0.34, 0.1, 0.17]);
      for (const s of [-1, 1]) {
        k.stick('#3E5A3E', [0.42, 0.4, s * 0.16], [0.98, 0.43, s * 0.1], 0.035);
        k.ball('#FFFFFF', [0.65, 0.38, s * 0.15], [0.03, 0.03, 0.02], { sides: 0 });
        k.ball('#FFFFFF', [0.5, 0.71, s * 0.1], [0.08, 0.08, 0.06], { sides: 0 });
        k.ball('#3E3440', [0.53, 0.72, s * 0.15], [0.045, 0.045, 0.03], { sides: 0 });
      }
    });
  },
};
