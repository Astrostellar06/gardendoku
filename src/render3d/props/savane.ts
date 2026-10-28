/** Savanna in 3D: acacias, baobabs, termite mounds, giraffes, meerkats, elephants and hippos. */
import { bridge3d, rock3d } from './common';
import type { Kit, ModelMap } from './kit';

/** Small dark eyes on both sides of a head seen in profile (facing +x). */
export function sideEyes(k: Kit, x: number, y: number, z: number, size = 0.045) {
  for (const s of [-1, 1]) k.ball('#3E3440', [x, y, s * z], [size, size, size * 0.6], { sides: 0 });
}

/** Standing meerkat looking at the camera. */
function meerkat(k: Kit) {
  k.ball('#D9B07A', [0, 0.55, 0], [0.24, 0.52, 0.22]);
  k.ball('#F1D7A8', [0, 0.5, 0.1], [0.14, 0.38, 0.14], { sides: 0 });
  k.ball('#D9B07A', [0, 1.18, 0.03], [0.17, 0.17, 0.19]);
  for (const s of [-1, 1]) {
    k.ball('#5A4048', [s * 0.08, 1.22, 0.17], [0.06, 0.05, 0.03], { sides: 0 });
    k.stick('#C79A66', [s * 0.17, 0.8, 0.08], [s * 0.08, 0.62, 0.2], 0.07);
  }
  k.ball('#3E3440', [0, 1.13, 0.22], [0.035, 0.035, 0.03], { sides: 0 });
  k.stick('#C79A66', [0, 0.15, -0.15], [0.1, 0.02, -0.5], 0.07);
}

export const savane: ModelMap = {
  acacia(k) {
    const bark = '#8A6248';
    k.stick(bark, [0, 0, 0], [0, 0.95, 0], 0.14, 6);
    k.stick(bark, [0, 0.9, 0], [-0.45, 1.42, 0.05], 0.1);
    k.stick(bark, [0, 0.9, 0], [0.5, 1.45, -0.05], 0.1);
    // Dry flat crown, green once watered.
    const crown = (dark: string, light: string, g: number) => {
      k.ball([dark, light], [0, 1.6, 0], [1.0 * g, 0.22 * g, 0.75 * g]);
      k.ball(dark, [-0.5, 1.5, 0.05], [0.45 * g, 0.17 * g, 0.4 * g], { sides: 0 });
      k.ball(dark, [0.55, 1.52, -0.05], [0.45 * g, 0.17 * g, 0.4 * g], { sides: 0 });
    };
    crown('#A3A35A', '#BDB86E', 1);
    k.bloom(0.4, () => crown('#7FA846', '#9CC25A', 1.05));
  },
  baobab(k, { v }) {
    k.cyl(['#A67A5A', '#B98A6A'], [0, 0, 0], 0.45, 1.35, { sides: 7, top: 0.45 });
    const tips: Array<[number, number, number]> = [
      [-0.5, 1.75, 0.1],
      [-0.15, 1.85, -0.2],
      [0.2, 1.82, 0.2],
      [0.5, 1.7, -0.05],
    ];
    for (const t of tips) k.stick('#A67A5A', [0, 1.3, 0], t, 0.09);
    k.bloom(0.4, () => {
      tips.forEach(([x, y, z], n) => k.ball('#86A84A', [x, y + 0.05, z], [0.2, 0.15, 0.2], { sides: 0, rot: [0, v * 6 + n, 0] }));
    });
  },
  'termite-mound'(k) {
    k.cyl(['#B87A4A', '#C98A58'], [0, 0, 0], 0.6, 1.0, { sides: 7, top: 0.38 });
    k.cone('#C98A58', [-0.03, 0.98, 0], 0.23, 0.85, { sides: 7 });
    k.cone(['#A86E42', '#B87A4A'], [0.35, 0, 0.12], 0.25, 0.9, { sides: 6 });
    k.rock('#B87A4A', [-0.4, 0.1, 0.35], [0.22, 0.15, 0.2], { rot: [0, 1, 0] });
  },
  giraffe(k, { v }) {
    const coat = '#FFC75A';
    const spot = '#D98A3A';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.3, 0.2]) for (const z of [-0.11, 0.11]) k.stick(coat, [x, 0, z], [x, 0.85, z], 0.09);
      k.ball(coat, [-0.05, 0.88, 0], [0.45, 0.25, 0.24]);
      k.stick(coat, [0.22, 0.9, 0], [0.45, 1.85, 0], 0.17, 6);
      k.ball(coat, [0.56, 1.88, 0], [0.22, 0.11, 0.11], { rot: [0, 0, -0.4] });
      for (const z of [-0.05, 0.05]) k.stick('#B8763A', [0.45, 1.95, z], [0.42, 2.12, z * 1.4], 0.05);
      sideEyes(k, 0.58, 1.95, 0.1, 0.035);
      k.stick(spot, [-0.48, 0.95, 0], [-0.6, 0.6, 0], 0.04);
      for (const s of [-1, 1]) {
        for (const [x, y, r] of [
          [-0.22, 0.92, 0.09],
          [0.1, 0.95, 0.08],
          [-0.05, 0.78, 0.06],
        ]) {
          k.ball(spot, [x, y, s * 0.21], [r, r, 0.04], { sides: 0 });
        }
        k.ball(spot, [0.35, 1.38, s * 0.07], [0.05, 0.06, 0.03], { sides: 0 });
      }
    });
  },
  meerkat(k, { v2 }) {
    if (v2 > 0.5) {
      k.at([-0.35, 0, 0], 0, 1, () => meerkat(k));
      k.at([0.4, 0, 0.1], 0, 0.85, () => meerkat(k));
    } else meerkat(k);
  },
  elephant(k, { v }) {
    const skin = '#B5B3C8';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.45, 0.15]) for (const z of [-0.18, 0.18]) k.cyl(skin, [x, 0, z], 0.12, 0.6, { sides: 6 });
      k.ball(skin, [-0.15, 0.78, 0], [0.6, 0.42, 0.42]);
      k.stick(skin, [-0.72, 0.85, 0], [-0.8, 0.55, 0], 0.04);
      k.ball(skin, [0.45, 1.0, 0], [0.32, 0.32, 0.3]);
      for (const s of [-1, 1]) k.ball('#C9C7DA', [0.3, 1.0, s * 0.3], [0.07, 0.32, 0.25], { rot: [s * 0.2, 0.3 * s, 0], sides: 0 });
      k.stick(skin, [0.68, 0.95, 0], [0.84, 0.62, 0], 0.15, 6);
      k.stick(skin, [0.84, 0.62, 0], [0.78, 0.3, 0], 0.12, 6);
      sideEyes(k, 0.62, 1.1, 0.2);
    });
  },
  'tall-grass'(k) {
    for (let n = -3; n <= 3; n++) {
      const h = 1.7 - Math.abs(n) * 0.1;
      k.cone(n % 2 ? '#D9B04A' : '#C99A38', [n * 0.13, 0, Math.sin(n * 2.1) * 0.2], 0.07, h, { sides: 4, rot: [Math.cos(n * 1.7) * 0.15, 0, -n * 0.08] });
    }
  },
  rock: rock3d('#D9B58E', '#B8926A', '#F1DCC0'),
  'plank-bridge': bridge3d({ deck: '#C98A5A', deckShade: '#B57846', side: '#B57846', rail: '#8A6248', planks: true, hump: 0.035 }),
  hippo(k) {
    // Only the top of the head peeks out of the water, snout toward +z.
    k.dome('#9C93B8', [0, -0.1, -0.1], [0.6, 0.35, 0.75]);
    k.dome('#B2AACB', [0, -0.08, 0.45], [0.5, 0.3, 0.38]);
    for (const s of [-1, 1]) {
      k.ball('#6A6284', [s * 0.15, 0.2, 0.62], [0.06, 0.04, 0.06], { sides: 0 });
      k.ball('#FFFFFF', [s * 0.28, 0.24, -0.08], [0.13, 0.12, 0.13], { sides: 0 });
      k.ball('#3E3440', [s * 0.28, 0.27, 0.02], [0.07, 0.07, 0.05], { sides: 0 });
      k.ball('#9C93B8', [s * 0.35, 0.2, -0.6], [0.12, 0.1, 0.08], { sides: 0 });
    }
  },
};
