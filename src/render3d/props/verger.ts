/** Orchard and kitchen garden in 3D: fruit trees, vegetable rows, scarecrows, beehives and hens. */
import { tree3d } from './common';
import { eyes, type ModelMap } from './kit';
import { plank3d, sideEyes } from './montagne';

export const verger: ModelMap = {
  'apple-tree': tree3d({ foliage: ['#6FC266', '#86CF72', '#5FB45B'], trunk: '#8A6248', fruit: '#FF5C5C' }),
  'cherry-tree': tree3d({ foliage: ['#5FB45B', '#78C266', '#6FC266'], trunk: '#7A5547', fruit: '#D9304F' }),
  'veg-patch'(k, { v }) {
    k.at([0, 0, 0], Math.floor(v * 4) * (Math.PI / 2), 1, () => {
      k.box('#B98458', [0, 0, 0], [1.7, 0.1, 1.4]);
      for (let row = 0; row < 3; row++) {
        const z = -0.45 + row * 0.45;
        for (const x of [-0.5, 0, 0.5]) {
          if (row === 1) {
            // Cabbages.
            k.ball('#9FD48A', [x, 0.22, z], [0.2, 0.15, 0.2], { sides: 0 });
            k.ball('#C4EBA8', [x, 0.33, z], [0.12, 0.08, 0.12], { sides: 0 });
          } else {
            // Lettuces.
            k.cyl(row ? '#6FC266' : '#86CF72', [x, 0.08, z], 0.1, 0.22, { sides: 5, top: 2.2, rot: [0, x * 3, 0] });
          }
        }
      }
    });
  },
  carrots(k) {
    for (const x of [-0.45, 0, 0.45]) {
      k.dome('#A47248', [x, 0, 0], [0.2, 0.07, 0.16]);
      k.cone('#FF9A3D', [x, 0, 0], 0.12, 0.2, { sides: 5 });
      for (const t of [-1, 0, 1]) {
        k.ball(t ? '#5FB45B' : '#78C266', [x + t * 0.09, 0.42, t * 0.03], [0.06, 0.26, 0.04], { rot: [0, 0, -t * 0.35], sides: 0 });
      }
    }
  },
  'tomato-stake'(k) {
    k.stick('#C9A06A', [0, 0, 0], [0, 1.85, 0], 0.08);
    for (let n = 0; n < 4; n++) {
      const y = 0.35 + n * 0.42;
      const s = n % 2 ? 1 : -1;
      k.ball('#5FB45B', [s * 0.2, y, 0.02], [0.22, 0.05, 0.12], { rot: [0, 0, s * 0.5], sides: 0 });
      k.ball('#78C266', [-s * 0.17, y + 0.12, -0.02], [0.18, 0.05, 0.1], { rot: [0, 0, -s * 0.5], sides: 0 });
    }
    for (const [x, y, r] of [
      [-0.25, 0.67, 0.16],
      [0.28, 0.97, 0.15],
      [-0.22, 1.32, 0.13],
      [0.22, 0.42, 0.14],
    ]) {
      k.ball('#FF5A4E', [x, y, 0.1], [r, r, r]);
    }
  },
  scarecrow(k, { v }) {
    const shirt = v > 0.5 ? '#E8735A' : '#6FA8DC';
    k.stick('#A47248', [0, 0, 0], [0, 1.5, 0], 0.09);
    k.stick('#A47248', [-0.9, 1.3, 0], [0.9, 1.3, 0], 0.07);
    k.cyl(shirt, [0, 0.75, 0], 0.28, 0.62, { top: 1.6, rz: 0.18 });
    k.box('#FFD45A', [0.12, 1.0, 0.2], [0.18, 0.18, 0.04]);
    k.stick(shirt, [-0.35, 1.3, 0], [-0.78, 1.3, 0], 0.2);
    k.stick(shirt, [0.35, 1.3, 0], [0.78, 1.3, 0], 0.2);
    for (const x of [-0.9, 0.9]) k.ball('#F2CF6A', [x, 1.24, 0], [0.08, 0.12, 0.08], { sides: 0 });
    k.ball('#F2D8A0', [0, 1.62, 0], [0.24, 0.24, 0.22]);
    eyes(k, 0, 1.66, 0.2, 0.08, 0.04);
    k.box('#8A5A3A', [0, 1.52, 0.2], [0.16, 0.025, 0.02]);
    k.cyl('#C9A060', [0, 1.8, 0], 0.42, 0.04, { sides: 8 });
    k.cyl('#D9B070', [0, 1.83, 0], 0.2, 0.25, { top: 0.8 });
    k.cyl('#E8735A', [0, 1.84, 0], 0.205, 0.06);
  },
  wheelbarrow(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const z of [-0.2, 0.2]) {
        k.stick('#8A6248', [0.4, 0.5, z], [-0.85, 0.85, z * 1.25], 0.07);
        k.stick('#8A6248', [-0.3, 0.5, z], [-0.35, 0, z], 0.06);
      }
      k.cyl(['#6FA8A0', '#86BDB4'], [0.12, 0.45, 0], 0.45, 0.45, { sides: 4, top: 1.45, rot: [0, Math.PI / 4, 0] });
      k.cyl('#3E3440', [0.45, 0.24, -0.06], 0.24, 0.12, { sides: 8, rot: [Math.PI / 2, 0, 0] });
      k.cyl('#B8B8C0', [0.45, 0.24, -0.08], 0.1, 0.16, { sides: 6, rot: [Math.PI / 2, 0, 0] });
      // Pumpkins and apples piled in.
      k.bloom(0.4, () => {
        k.ball('#FF9F43', [0.02, 0.95, 0], [0.25, 0.2, 0.25]);
        k.ball('#FFB35A', [0.35, 0.93, 0.08], [0.2, 0.16, 0.2]);
        k.ball('#FF5C5C', [0.2, 1.1, -0.12], [0.12, 0.12, 0.12], { sides: 0 });
        k.stick('#6E8E3E', [0.02, 1.12, 0], [0.05, 1.22, 0], 0.05);
      });
    });
  },
  beehive(k) {
    k.box('#A47248', [0, 0, 0], [1.1, 0.2, 0.9]);
    // Straw skep in stacked rings.
    for (let n = 0; n < 5; n++) {
      const w = 0.55 - n * 0.08;
      k.cyl(n % 2 ? '#F2C55C' : '#E8B44A', [0, 0.2 + n * 0.24, 0], w, 0.26, { sides: 8, top: (w - 0.05) / w });
    }
    k.ball('#F2C55C', [0, 1.42, 0], [0.15, 0.12, 0.15], { sides: 0 });
    k.ball('#6E4E3E', [0, 0.32, 0.5], [0.14, 0.1, 0.05], { sides: 0 });
    k.bloom(0.5, () => {
      for (const [x, y, z] of [
        [0.6, 1.3, 0.2],
        [-0.65, 1.1, 0.1],
      ]) {
        k.ball('#FFD045', [x, y, z], [0.12, 0.08, 0.08], { sides: 0 });
        k.box('#4A3A44', [x, y - 0.08, z], [0.04, 0.16, 0.17]);
        k.ball('#FFFFFF', [x, y + 0.1, z], [0.07, 0.03, 0.09], { sides: 0 });
      }
    });
  },
  hen(k, { v }) {
    const feather = v > 0.3 && v < 0.7 ? '#FFFFFF' : '#C9885A';
    const wing = v > 0.3 && v < 0.7 ? '#EDE6DE' : '#B07448';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const z of [-0.1, 0.1]) k.stick('#FF9F43', [z, 0, z], [z, 0.22, z], 0.05);
      k.ball(feather, [0, 0.5, 0], [0.5, 0.36, 0.34]);
      k.ball(feather, [-0.52, 0.75, 0], [0.12, 0.3, 0.2], { rot: [0, 0, 0.5], sides: 0 });
      k.ball(wing, [-0.05, 0.52, 0], [0.3, 0.18, 0.36], { rot: [0, 0, -0.2], sides: 0 });
      k.ball(feather, [0.42, 0.98, 0], [0.22, 0.22, 0.2]);
      k.ball('#FF5A4E', [0.36, 1.2, 0], [0.08, 0.08, 0.05], { sides: 0 });
      k.ball('#FF5A4E', [0.47, 1.18, 0], [0.07, 0.07, 0.05], { sides: 0 });
      k.ball('#FFC93A', [0.64, 0.95, 0], [0.1, 0.05, 0.06], { sides: 0 });
      k.ball('#FF5A4E', [0.58, 0.83, 0], [0.05, 0.08, 0.04], { sides: 0 });
      sideEyes(k, 0.52, 1.03, 0.15);
    });
  },
  'plank-bridge': plank3d('#D2A06A', '#BE8C58', '#9A6A42'),
};
