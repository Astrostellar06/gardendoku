/** Friendship garden in 3D: heart topiaries, picnic, bunnies, heart balloons and paper boats. */
import { bridge3d, lilyPads3d } from './common';
import type { Kit, Model, ModelMap, Paint } from './kit';

/**
 * Heart `s` across, `d` thick, centred on (x, y, z): standing and facing the
 * camera, or lying flat with its point toward the camera.
 */
export function heart3d(k: Kit, paint: Paint, [x, y, z]: [number, number, number], s: number, d: number, flat = false) {
  if (flat) {
    for (const sx of [-1, 1]) k.ball(paint, [x + sx * 0.42 * s, y, z - 0.2 * s], [0.5 * s, d, 0.48 * s], { sides: 0 });
    k.cone(paint, [x, y, z - 0.22 * s], 0.92 * s, s, { sides: 4, rz: d, rot: [Math.PI / 2, 0, 0] });
  } else {
    for (const sx of [-1, 1]) k.ball(paint, [x + sx * 0.42 * s, y + 0.2 * s, z], [0.5 * s, 0.48 * s, d], { sides: 0 });
    k.cone(paint, [x, y + 0.22 * s, z], 0.92 * s, s, { sides: 4, rz: d, rot: [Math.PI, 0, 0] });
  }
}

/** Sitting bunny facing +x, about one unit tall. */
export function bunny3d(k: Kit, fur: string, foot: string) {
  k.ball(fur, [-0.1, 0.4, 0], [0.42, 0.38, 0.32]);
  k.ball('#FFFFFF', [-0.52, 0.42, 0], [0.13, 0.13, 0.13], { sides: 0 });
  k.ball(fur, [0.3, 0.78, 0], [0.26, 0.24, 0.23]);
  for (const z of [-0.08, 0.08]) {
    k.ball(fur, [0.24, 1.15, z], [0.07, 0.28, 0.06], { rot: [z * 2, 0, 0.15], sides: 0 });
    k.ball('#FFC1D6', [0.29, 1.13, z], [0.03, 0.18, 0.04], { rot: [z * 2, 0, 0.15], sides: 0 });
    k.ball('#3E3440', [0.45, 0.83, z * 2.1], [0.04, 0.045, 0.03], { sides: 0 });
  }
  k.ball('#FF8FA8', [0.56, 0.74, 0], [0.04, 0.04, 0.04], { sides: 0 });
  k.ball(foot, [0.15, 0.05, 0.18], [0.16, 0.06, 0.08], { sides: 0 });
}

/** Park bench, its back toward -z. */
export function bench3d(wood: string, metal: string): Model {
  return (k) => {
    for (const x of [-0.75, 0.75]) {
      k.box(metal, [x, 0, 0.18], [0.08, 0.42, 0.08]);
      k.box(metal, [x, 0, -0.26], [0.08, 1.05, 0.08]);
    }
    k.box(wood, [0, 0.4, -0.03], [1.85, 0.09, 0.55]);
    k.box(wood, [0, 0.62, -0.28], [1.8, 0.15, 0.06]);
    k.box(wood, [0, 0.86, -0.28], [1.8, 0.15, 0.06]);
  };
}

const PINK = '#FF7FA8';
const LILAC = '#C4A4F8';

export const amitie: ModelMap = {
  'heart-topiary'(k, { v }) {
    k.cyl(v > 0.5 ? '#FFC1D6' : '#D9C6FF', [0, 0, 0], 0.3, 0.45, { sides: 8, top: 1.1 });
    k.cyl('#FFFFFF', [0, 0.42, 0], 0.37, 0.1, { sides: 8 });
    k.stick('#9A6A52', [0, 0.45, 0], [0, 1.1, 0], 0.1);
    heart3d(k, ['#4E9E4E', '#5FB45B'], [0, 1.45, 0], 0.55, 0.3);
    heart3d(k, '#78C266', [-0.04, 1.5, 0.06], 0.42, 0.28);
    k.bloom(0.5, () => {
      for (const [x, y] of [
        [-0.3, 1.6],
        [0.28, 1.68],
        [0, 1.3],
        [-0.15, 1.75],
        [0.3, 1.45],
      ]) {
        k.ball('#FF8FB6', [x, y, 0.27], [0.07, 0.07, 0.07], { sides: 0 });
      }
    });
  },
  picnic(k, { v }) {
    k.at([0, 0, 0], (v - 0.5) * 0.8, 1, () => {
      k.box('#FFFFFF', [0, 0, 0], [1.7, 0.03, 1.3]);
      // Gingham checks.
      for (let n = 0; n < 4; n++) {
        k.box('#FFBED1', [-0.74 + n * 0.45, 0.01, 0], [0.22, 0.03, 1.3]);
        k.box('#FFBED1', [0, 0.012, -0.565 + n * 0.35], [1.7, 0.03, 0.17]);
      }
      k.box('#D9A066', [-0.15, 0.03, -0.14], [0.6, 0.32, 0.42]);
      k.ring('#B97F4E', [-0.15, 0.36, -0.14], 0.2, 0.05, { rot: [Math.PI / 2, 0, 0] });
      k.cyl('#FFD45A', [0.4, 0.03, -0.2], 0.12, 0.17, { sides: 6, top: 1.2 });
      k.cyl('#8DC8FF', [0.45, 0.03, 0.25], 0.12, 0.17, { sides: 6, top: 1.2 });
      heart3d(k, '#FF5C8A', [-0.2, 0.06, 0.32], 0.15, 0.03, true);
    });
  },
  'friend-bench': bench3d('#FFB1CB', '#9C7BB8'),
  'heart-balloons'(k, { v }) {
    k.box('#9A6A52', [0, 0, 0], [0.18, 0.16, 0.18]);
    const colors = [PINK, LILAC, '#FFC94D'];
    for (let n = 0; n < 2; n++) {
      const x = n ? 0.38 : -0.32;
      const y = n ? 1.85 : 1.55;
      const z = n ? 0.05 : -0.08;
      k.stick('#7A6386', [0, 0.16, 0], [x, y - 0.25, z], 0.025);
      heart3d(k, colors[Math.floor(v * 3 + n) % 3], [x, y, z], 0.34, 0.16);
      k.ball('#FFFFFF', [x - 0.15, y + 0.15, z + 0.13], [0.05, 0.06, 0.03], { sides: 0 });
    }
  },
  'bunny-pair'(k, { v }) {
    k.at([-0.38, 0, 0], 0, 0.75, () => bunny3d(k, '#FFFFFF', '#F3E4EA'));
    k.at([0.38, 0, 0], Math.PI, 0.75, () => bunny3d(k, v > 0.5 ? '#E9D3C2' : '#D9D2E6', '#B8A8B8'));
    heart3d(k, '#FF5C8A', [0, 1.35, 0], 0.18, 0.07);
  },
  'love-letter'(k, { v }) {
    k.at([0, 0, 0], (v - 0.5) * 1.2, 1, () => {
      k.box('#FFF8F0', [0, 0, 0], [1.6, 0.06, 1.05]);
      // The flap, a flat triangle pointing at the heart seal.
      k.cone('#F3E4D8', [0, 0.06, -0.3], 0.92, 0.03, { sides: 3, rz: 0.4 });
      heart3d(k, '#FF5C8A', [0, 0.1, 0.12], 0.2, 0.04, true);
    });
  },
  'heart-lamp'(k) {
    const metal = '#9C7BB8';
    k.cyl(metal, [0, 0, 0], 0.2, 0.15, { sides: 6 });
    k.stick(metal, [0, 0.1, 0], [0, 1.45, 0], 0.08, 6);
    k.stick(metal, [0, 1.45, 0], [0.12, 1.62, 0], 0.06);
    k.stick(metal, [0.12, 1.62, 0], [0.26, 1.62, 0], 0.06);
    k.stick(metal, [0.26, 1.62, 0], [0.38, 1.45, 0], 0.06);
    k.stick(metal, [0.38, 1.45, 0], [0.38, 1.3, 0], 0.04);
    heart3d(k, '#F3D3E0', [0.38, 1.1, 0], 0.24, 0.12);
    // Lit once the garden is watered.
    k.bloom(0.6, () => heart3d(k, '#FFB1CB', [0.38, 1.1, 0], 0.26, 0.13));
  },
  'friend-bridge': bridge3d({ deck: '#FFE6EE', deckShade: '#F2BACD', side: '#F28BAA', rail: '#FFFFFF', cap: '#FF7FA8', hump: 0.07 }),
  'paper-boat'(k, { v }) {
    k.at([0, 0, 0], (v - 0.5) * 0.6, 1, () => {
      const paper = v > 0.5 ? '#FFFFFF' : '#FFE3EC';
      k.cyl(['#E8D8E4', paper], [0, -0.1, 0], 0.3, 0.32, { sides: 4, top: 1.45, rz: 0.58 });
      k.cone('#F3E4F0', [0, 0.2, 0], 0.03, 0.5, { sides: 4, rz: 0.5 });
      k.at([0.03, 0.36, 0], Math.PI / 2, 1, () => heart3d(k, PINK, [0, 0, 0], 0.13, 0.03));
    });
  },
  'lily-pads': lilyPads3d('#FF8FB6'),
};
