/** Wild marsh in 3D: cattails, wildflowers, mossy logs, frogs, ducks and dragonflies. */
import { mushroom3d, rock3d, snail3d, steppingStones3d } from './common';
import { eyes, type ModelMap } from './kit';

export const sauvage: ModelMap = {
  cattails(k, { v }) {
    for (let n = -2; n <= 2; n++) {
      const x = n * 0.2;
      const z = (((n + 2) * 7) % 3) * 0.12 - 0.12;
      const h = 1.7 - Math.abs(n) * 0.2 - ((n + 3 + Math.floor(v * 5)) % 3) * 0.12;
      k.stick(n % 2 ? '#6FAE5A' : '#5E9E4E', [x, 0, z], [x + n * 0.1, h, z], 0.07);
      if (Math.abs(n) !== 1) k.cyl('#8A5A3A', [x + n * 0.09, h - 0.55, z], 0.09, 0.42, { top: 0.8 });
    }
    k.ball('#7FBF6A', [-0.3, 0.55, 0.15], [0.06, 0.6, 0.03], { rot: [0, 0, 0.35], sides: 0 });
    k.ball('#7FBF6A', [0.3, 0.48, 0.12], [0.06, 0.5, 0.03], { rot: [0, 0, -0.45], sides: 0 });
  },
  wildflowers(k, { v }) {
    const colors = ['#FFFFFF', '#FFE14D', '#C9A8F5', '#FF9EBB', '#9ED0FF'];
    for (let n = 0; n < 5; n++) {
      const x = (n - 2) * 0.22;
      const z = ((n * 3) % 5) * 0.1 - 0.2;
      const h = 0.75 + ((n * 7 + Math.floor(v * 9)) % 4) * 0.15;
      k.stick('#6FAE5A', [x * 0.6, 0, z], [x, h, z], 0.05);
      k.cyl(colors[(n + Math.floor(v * 5)) % 5], [x, h, z], 0.17, 0.05, { sides: 5, rot: [0.5, n, 0] });
      k.ball('#FFC83A', [x, h + 0.05, z + 0.03], [0.07, 0.05, 0.07], { sides: 0 });
    }
  },
  log(k, { v }) {
    const along: [number, number, number] = [0, 0, -Math.PI / 2];
    k.at([0, 0, 0], v * 6.28, 1, () => {
      k.cyl(['#86593C', '#9A6A48'], [-0.8, 0.3, 0], 0.3, 1.6, { sides: 7, rot: along });
      k.cyl('#E2B98A', [0.8, 0.3, 0], 0.27, 0.02, { sides: 7, rot: along });
      k.cyl('#C9986A', [0.81, 0.3, 0], 0.12, 0.02, { sides: 7, rot: along });
      k.stick('#9A6A48', [-0.25, 0.45, 0.12], [-0.4, 0.72, 0.3], 0.1);
      k.bloom(0.4, () => {
        k.dome('#7FBF6A', [-0.2, 0.52, 0], [0.4, 0.12, 0.24]);
        k.ball('#FF8A7A', [0.25, 0.62, 0.1], [0.1, 0.06, 0.1], { sides: 0 });
      });
    });
  },
  'frog-pad'(k, { v }) {
    k.at([0, 0, 0], v * 6.28, 1, () => {
      k.cyl('#7FC676', [0, 0, 0], 0.95, 0.05, { sides: 9 });
      // Frog looking along -z.
      k.ball('#6FC266', [0, 0.2, 0.05], [0.34, 0.22, 0.4]);
      for (const s of [-1, 1]) {
        k.ball('#5FB45B', [s * 0.35, 0.12, 0.3], [0.22, 0.1, 0.12], { rot: [0, -s * 0.8, 0], sides: 0 });
        k.ball('#6FC266', [s * 0.17, 0.38, -0.25], [0.13, 0.12, 0.13], { sides: 0 });
        k.ball('#3E3440', [s * 0.17, 0.44, -0.33], [0.06, 0.06, 0.05], { sides: 0 });
      }
    });
  },
  duck(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      k.ball(['#A9825C', '#C9A27A'], [0, 0.12, -0.1], [0.45, 0.3, 0.75]);
      k.ball('#A9825C', [0, 0.32, -0.2], [0.36, 0.12, 0.5], { sides: 0 });
      k.ball('#3E3440', [0, 0.3, -0.8], [0.18, 0.1, 0.2], { rot: [0.5, 0, 0], sides: 0 });
      k.ball('#FFFFFF', [0, 0.46, 0.45], [0.18, 0.06, 0.18], { sides: 0 });
      k.ball('#3F9A6A', [0, 0.7, 0.55], [0.28, 0.27, 0.28]);
      k.ball('#FFC23A', [0, 0.63, 0.88], [0.13, 0.06, 0.14], { sides: 0 });
      eyes(k, 0, 0.78, 0.78, 0.15, 0.05);
    });
  },
  dragonfly(k, { v }) {
    const body = v > 0.5 ? '#3FA9F5' : '#8C6BE0';
    const wing = '#D2EBFF';
    // Hovering, wings spread.
    k.at([0, 1.0, 0], v * 6.28, 1, () => {
      k.stick(body, [-0.85, 0, 0], [0.3, 0, 0], 0.09);
      k.ball(v > 0.5 ? '#2E8FD8' : '#7353C8', [0.36, 0, 0], [0.13, 0.12, 0.13], { sides: 0 });
      for (const s of [-1, 1]) {
        k.ball(wing, [0.12, 0.04, s * 0.42], [0.12, 0.02, 0.42], { rot: [0, s * 0.25, 0], sides: 0 });
        k.ball(wing, [-0.12, 0.04, s * 0.38], [0.1, 0.02, 0.36], { rot: [0, -s * 0.2, 0], sides: 0 });
      }
    });
  },
  mushroom: mushroom3d(['#C96A3A', '#E9564A', '#F2A65A']),
  snail: snail3d('#E2C08A', '#B88A4E'),
  rock: rock3d('#C9C3B0', '#A49D88', '#E8E3D6', '#7FBF6A'),
  'stone-steps': steppingStones3d('#D8D2C2', '#AFA894'),
};
