/** Summer in 3D: sunflowers, parasols, surfboards, lemonade stand, deckchair, sandcastle and pool floats. */
import { bridge3d } from './common';
import { eyes, type Kit, type ModelMap, type Paint, type Vec } from './kit';

const SAND = '#F2CF8E';

/** Flat strip from a to b (in the y-z plane), `w` wide across x: deckchair fabric. */
function slab(k: Kit, paint: Paint, x: number, a: [number, number], b: [number, number], w: number, thick = 0.04) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  k.box(paint, [x, a[0], a[1]], [w, len, thick], { rot: [Math.atan2(b[1] - a[1], b[0] - a[0]), 0, 0] });
}

export const ete: ModelMap = {
  sunflowers(k) {
    for (const [x, z, h, s] of [
      [-0.4, -0.1, 0.8, 0.8],
      [0.1, -0.25, 1.1, 1],
      [0.5, 0.15, 0.7, 0.75],
    ]) {
      const top = 1.5 * h;
      k.stick('#5FA84A', [x, 0, z], [x, top, z], 0.08);
      k.ball('#6FB85A', [x + 0.18, 0.45, z], [0.24, 0.05, 0.1], { rot: [0, 0, 0.6], sides: 0 });
      // Head facing the camera, tipped slightly up.
      k.cyl('#FFC93A', [x, top, z], 0.38 * s, 0.05, { sides: 10, rot: [Math.PI / 2 - 0.35, 0, 0] });
      k.ball('#8A5A3A', [x, top + 0.02, z + 0.05], [0.17 * s, 0.17 * s, 0.07], { rot: [-0.35, 0, 0], sides: 0 });
    }
  },
  parasol(k, { v }) {
    const [a, b] = v > 0.5 ? ['#FF7A8A', '#FFFFFF'] : ['#4FC3E8', '#FFFFFF'];
    // Towel spread in the shade.
    k.box(v > 0.5 ? '#FFD45A' : '#B9A0F2', [-0.15, 0, 0.3], [1.1, 0.03, 0.6]);
    k.box('#FFFFFF', [-0.15, 0.005, 0.15], [1.1, 0.03, 0.08]);
    k.stick('#F2F2F2', [0.05, 0, 0.05], [0, 1.75, 0], 0.06);
    // Two eight-sided cones turned by half a side: their faces alternate like gores.
    k.cone(a, [0, 1.2, 0], 0.92, 0.55, { sides: 8 });
    k.cone(b, [0, 1.2, 0], 0.92, 0.55, { sides: 8, rot: [0, Math.PI / 8, 0] });
    k.ball(a, [0, 1.76, 0], [0.06, 0.06, 0.06], { sides: 0 });
  },
  surfboards(k, { v }) {
    const palettes = [
      ['#FF8FB6', '#FFFFFF'],
      ['#4FC3E8', '#FFE066'],
      ['#FFC94D', '#FF7A6B'],
      ['#9BE3C4', '#FFFFFF'],
    ];
    // Boards stuck nose up in a little heap of sand.
    const board = (x: number, z: number, tilt: number, len: number, n: number) => {
      const [body, stripe] = palettes[(Math.floor(v * 4) + n) % palettes.length];
      const along = (t: number): Vec => [x + Math.sin(tilt) * t, Math.cos(tilt) * t, z];
      k.ball(body, along(len * 0.5), [0.18, len * 0.55, 0.05], { rot: [0, 0, -tilt] });
      k.box(stripe, along(len * 0.62), [0.34, 0.09, 0.11], { rot: [0, 0, -tilt] });
    };
    board(-0.32, -0.15, -0.14, 1.35, 0);
    board(0.34, -0.05, 0.18, 1.15, 1);
    board(0.02, 0.12, 0.02, 1.05, 2);
    k.dome(SAND, [0, 0, 0.05], [0.75, 0.32, 0.5]);
  },
  watermelon(k, { v }) {
    // Two slices standing point up, rind at the bottom: a triangular prism on a rind.
    const slice = (x: number, turn: number) =>
      k.at([x, 0, 0.1], turn, 1, () => {
        k.box('#4E9E4A', [0, 0, -0.11], [0.9, 0.08, 0.22]);
        k.box('#C8EBA0', [0, 0.08, -0.11], [0.88, 0.07, 0.21]);
        k.cyl('#FF6F7F', [0, 0.15 + 0.36, 0], 0.5, 0.2, { sides: 3, rz: 0.72, rot: [-Math.PI / 2, 0, 0] });
        for (const [sx, sy] of [
          [-0.12, 0.45],
          [0.12, 0.45],
          [0, 0.75],
        ]) {
          k.ball('#3E3440', [sx, sy, 0.01], [0.03, 0.06, 0.02], { sides: 0 });
        }
      });
    slice(-0.38, 0.3 + v * 0.2);
    slice(0.38, -0.3 - v * 0.2);
  },
  'lemonade-stand'(k) {
    for (const x of [-0.6, 0.6]) k.cyl('#D9A066', [x, 0, -0.2], 0.05, 1.7, { sides: 4 });
    // Striped awning, tipped toward the camera.
    for (let n = 0; n < 5; n++) {
      k.box(n % 2 ? '#FFFFFF' : '#FFD045', [-0.6 + n * 0.3, 1.5, -0.05], [0.3, 0.06, 0.6], { rot: [0.3, 0, 0] });
    }
    k.box('#FFE9A0', [0, 0, 0], [1.4, 0.8, 0.6]);
    k.box('#E8C068', [0, 0.8, 0], [1.5, 0.08, 0.7]);
    // Pitcher of lemonade and a lemon on the counter, a lemon painted on the front.
    k.cyl('#FFFFFF', [-0.2, 0.88, 0], 0.14, 0.36, { sides: 8 });
    k.cyl('#FFE066', [-0.2, 0.9, 0], 0.15, 0.2, { sides: 8 });
    k.ball('#FFD045', [0.25, 0.98, 0.05], [0.16, 0.11, 0.11], { sides: 0 });
    k.cyl('#FFD045', [0, 0.4, 0.3], 0.13, 0.03, { sides: 8, rot: [Math.PI / 2, 0, 0] });
    k.cyl('#FFF2A8', [0, 0.4, 0.31], 0.08, 0.03, { sides: 8, rot: [Math.PI / 2, 0, 0] });
  },
  deckchair(k, { v }) {
    const stripe = v > 0.5 ? '#4FC3E8' : '#FF8FB6';
    const wood = '#C98A5A';
    k.at([0, 0, 0], (v - 0.5) * 0.6, 1, () => {
      for (const x of [-0.55, 0.55]) {
        k.stick(wood, [x * 0.92, 1.25, -0.55], [x, 0, 0.05], 0.07);
        k.stick(wood, [x, 0.55, 0.5], [x, 0, 0.5], 0.07);
        k.stick(wood, [x, 0.55, 0.5], [x * 0.96, 0.75, -0.31], 0.07);
      }
      k.stick(wood, [-0.52, 1.22, -0.52], [0.52, 1.22, -0.52], 0.06);
      k.stick('#B57846', [-0.58, 0.55, 0.5], [0.58, 0.55, 0.5], 0.06);
      // Sagging striped canvas, back then seat.
      for (let n = 0; n < 5; n++) {
        const x = -0.4 + n * 0.2;
        const c = n % 2 ? '#FFFFFF' : stripe;
        slab(k, c, x, [1.2, -0.5], [0.35, 0.08], 0.2);
        slab(k, c, x, [0.35, 0.08], [0.52, 0.48], 0.2);
      }
    });
  },
  sandcastle(k, { v }) {
    const shade = '#DDB474';
    k.box(SAND, [0, 0, 0.05], [1.4, 0.7, 0.9]);
    k.box(shade, [0, 0, 0.35], [0.4, 0.95, 0.4]);
    for (const x of [-0.52, 0.52]) {
      k.cyl(SAND, [x, 0, -0.05], 0.2, 1.2, { sides: 6 });
      for (let n = 0; n < 3; n++) {
        const a = (n / 3) * Math.PI * 2;
        k.box(SAND, [x + Math.sin(a) * 0.13, 1.2, -0.05 + Math.cos(a) * 0.13], [0.1, 0.12, 0.1], { rot: [0, a, 0] });
      }
    }
    k.cyl('#C99A5A', [0, 0, 0.55], 0.15, 0.02, { sides: 8, rot: [Math.PI / 2, 0, 0] });
    k.stick('#8A6248', [-0.52, 1.2, -0.05], [-0.52, 1.65, -0.05], 0.04);
    k.box(v > 0.5 ? '#FF7A8A' : '#4FC3E8', [-0.37, 1.45, -0.05], [0.28, 0.18, 0.02]);
    for (const x of [-0.45, 0.45]) k.ball('#FFFFFF', [x, 0.32, 0.5], [0.05, 0.05, 0.03], { sides: 0 });
  },
  'plank-bridge': bridge3d({ deck: '#F0C890', deckShade: '#DDB078', side: '#DDB078', rail: '#C99A60', planks: true, hump: 0.035 }),
  'swim-ring'(k, { v }) {
    const c = v > 0.5 ? '#FF7A8A' : '#FFC93A';
    k.ring(c, [0, 0.05, 0], 0.65, 0.24);
    // White bands bulging over the ring.
    for (let n = 0; n < 4; n++) {
      const a = (n / 4) * Math.PI * 2 + v * 3;
      k.ball('#FFFFFF', [Math.cos(a) * 0.65, 0.05, Math.sin(a) * 0.65], [0.23, 0.27, 0.2], { rot: [0, -a, 0], sides: 0 });
    }
  },
  'rubber-duck'(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      k.ball(['#FFC21A', '#FFD233'], [0, 0.1, -0.05], [0.6, 0.38, 0.8]);
      k.ball('#FFC21A', [-0.5, 0.25, -0.1], [0.12, 0.18, 0.32], { sides: 0 });
      k.ball('#FFC21A', [0.5, 0.25, -0.1], [0.12, 0.18, 0.32], { sides: 0 });
      k.ball('#FFE04D', [0, 0.65, 0.45], [0.4, 0.38, 0.38]);
      k.ball('#FF8A3A', [0, 0.58, 0.88], [0.2, 0.08, 0.16], { sides: 0 });
      eyes(k, 0, 0.78, 0.8, 0.16, 0.06);
      k.ball('#FFD233', [0, 0.38, -0.82], [0.16, 0.12, 0.2], { rot: [0.6, 0, 0], sides: 0 });
    });
  },
};
