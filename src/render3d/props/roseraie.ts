/** Rose garden in 3D: rose bushes and arches, bird bath, topiary, white bench, stone urn and floating petals. */
import { bridge3d, tree3d } from './common';
import type { Kit, ModelMap, Vec } from './kit';

const ROSES = ['#FF6F91', '#FF9EB5', '#E84A6F', '#FFFFFF', '#FFC2D1', '#FFB38A'];
const STONE = '#E8E0DA';

/** A rose: a little faceted ball of petals. */
function rose(k: Kit, pos: Vec, s: number, color: string) {
  k.rock(color, pos, [s, s * 0.8, s], { rot: [0.3, pos[0] * 7, 0] });
}

/** A point on the surface of a ball (centre c, radius r), in direction d. */
function onBall(c: Vec, r: number, d: Vec): Vec {
  const n = Math.hypot(...d);
  return [c[0] + (d[0] / n) * r, c[1] + (d[1] / n) * r, c[2] + (d[2] / n) * r];
}

export const roseraie: ModelMap = {
  'rose-bush'(k, { v }) {
    const balls: Array<[Vec, number]> = [
      [[-0.4, 0.45, 0.1], 0.38],
      [[0.4, 0.42, 0.15], 0.36],
      [[0, 0.75, -0.1], 0.45],
      [[-0.2, 0.35, 0.42], 0.32],
      [[0.22, 0.32, 0.45], 0.3],
    ];
    for (const [c, r] of balls) k.ball(['#4E9E5E', '#62B370'], c, [r, r, r]);
    const c = ROSES[Math.floor(v * ROSES.length)];
    k.bloom(0.4, () => {
      for (const [b, d, s] of [
        [0, [-0.3, 0.6, 0.74], 0.18],
        [2, [0.2, 0.9, 0.3], 0.2],
        [1, [0.4, 0.5, 0.75], 0.17],
        [3, [0, 0.4, 0.9], 0.15],
        [2, [-0.6, 0.5, 0.6], 0.13],
      ] as Array<[number, Vec, number]>) {
        rose(k, onBall(balls[b][0], balls[b][1] * 0.95, d), s, c);
      }
    });
  },
  'rose-arch'(k, { v }) {
    const arc = (a: number, r = 0.7): Vec => [Math.cos(a) * r, 1.15 + Math.sin(a) * r, 0];
    for (const x of [-0.7, 0.7]) k.box(['#E8DCE4', '#FFFFFF'], [x, 0, 0], [0.08, 1.17, 0.28]);
    // The arch in straight segments, each a box from one point to the next.
    for (let n = 0; n < 5; n++) {
      const [a, b] = [arc((n / 5) * Math.PI), arc(((n + 1) / 5) * Math.PI)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.04;
      k.box('#FFFFFF', a, [0.08, len, 0.28], { rot: [0, 0, Math.atan2(-(b[0] - a[0]), b[1] - a[1])] });
    }
    // Climbing foliage, then roses with the water.
    for (let n = 0; n < 4; n++) {
      const a = ((n + 0.5) / 4) * Math.PI;
      k.ball('#5FB45B', arc(a, 0.72), [0.2, 0.13, 0.2], { rot: [0, 0, a + Math.PI / 2], sides: 0 });
    }
    for (const x of [-0.72, 0.72]) k.ball('#4E9E5E', [x, 0.6, 0.05], [0.12, 0.35, 0.2], { sides: 0 });
    k.bloom(0.4, () => {
      for (let n = 0; n < 5; n++) {
        const p = arc(((n + 0.5) / 5) * Math.PI, 0.72);
        rose(k, [p[0], p[1], 0.14], 0.12, ROSES[(Math.floor(v * 6) + n) % 3]);
      }
      for (const x of [-0.74, 0.74]) rose(k, [x, 0.65, 0.2], 0.11, ROSES[Math.floor(v * 3)]);
    });
  },
  'bird-bath'(k) {
    k.cyl(STONE, [0, 0, 0], 0.4, 0.18, { sides: 8 });
    k.cyl(STONE, [0, 0.18, 0], 0.14, 0.8, { sides: 8, top: 0.8 });
    k.cyl(STONE, [0, 0.95, 0], 0.4, 0.2, { sides: 10, top: 1.85 });
    k.cyl('#D6CCC4', [0, 1.12, 0], 0.62, 0.04, { sides: 10 });
    k.bloom(0.3, () => k.cyl('#8FD8F7', [0, 1.12, 0], 0.64, 0.05, { sides: 10 }));
    // A little robin perched on the rim, once the garden is alive.
    k.bloom(0.6, () => {
      k.ball('#9A7A6A', [0.55, 1.3, 0.15], [0.2, 0.14, 0.13], { rot: [0, 0, -0.2] });
      k.ball('#FF8A5A', [0.64, 1.27, 0.17], [0.11, 0.1, 0.1], { sides: 0 });
      k.ball('#9A7A6A', [0.68, 1.44, 0.15], [0.11, 0.11, 0.11], { sides: 0 });
      k.ball('#3E3440', [0.73, 1.47, 0.24], [0.025, 0.025, 0.02], { sides: 0 });
      k.cone('#E8A06A', [0.77, 1.43, 0.15], 0.03, 0.1, { sides: 4, rot: [0, 0, -Math.PI / 2] });
    });
  },
  'rose-topiary': tree3d({ foliage: ['#4E9E5E', '#62B370'], trunk: '#7A5547', shape: 'ball', pot: '#E8D9CC' }),
  'white-bench'(k) {
    const wood = '#FFFFFF';
    const metal = '#C9BFD6';
    for (const x of [-0.75, 0.75]) {
      k.stick(metal, [x, 0, -0.22], [x, 1.05, -0.28], 0.07);
      k.stick(metal, [x, 0, 0.22], [x, 0.45, 0.2], 0.07);
      k.stick(metal, [x * 1.08, 0.65, -0.24], [x * 1.08, 0.62, 0.22], 0.05);
    }
    for (const z of [-0.1, 0.12]) k.box(wood, [0, 0.42, z], [1.9, 0.07, 0.2]);
    for (const y of [0.62, 0.85]) k.box(wood, [0, y, -0.26], [1.8, 0.14, 0.05], { rot: [-0.08, 0, 0] });
  },
  'rose-urn'(k, { v }) {
    k.box('#D9CFC6', [0, 0, 0], [0.7, 0.33, 0.7]);
    k.cyl(STONE, [0, 0.33, 0], 0.11, 0.3, { sides: 8 });
    k.cyl(STONE, [0, 0.6, 0], 0.18, 0.52, { sides: 8, top: 3 });
    k.cyl('#F4EEEA', [0, 1.1, 0], 0.6, 0.12, { sides: 10 });
    k.dome('#5FB45B', [0, 1.18, 0], [0.52, 0.22, 0.52]);
    for (const [x, y, z] of [
      [-0.4, 1.3, 0.1],
      [0.42, 1.28, 0],
      [0.05, 1.42, -0.1],
    ]) {
      k.ball('#5FB45B', [x, y, z], [0.2, 0.18, 0.2], { sides: 0 });
    }
    k.bloom(0.4, () => {
      const c = ROSES[Math.floor(v * 4)];
      for (const p of [
        [-0.3, 1.45, 0.25],
        [0.1, 1.58, 0.15],
        [0.42, 1.42, 0.2],
        [-0.58, 1.16, 0.15],
      ] as Vec[]) {
        rose(k, p, 0.13, c);
      }
    });
  },
  'white-bridge': bridge3d({ deck: '#FFF7F2', deckShade: '#E8D6CE', side: '#E2CFC6', rail: '#FFFFFF', cap: '#FF9EB5', hump: 0.06, vines: '#5FB45B' }),
  'floating-petals'(k, { v }) {
    for (let n = 0; n < 5; n++) {
      const a = v * Math.PI * 2 + n * 2.1;
      k.ball(ROSES[(n + Math.floor(v * 6)) % ROSES.length], [Math.cos(a) * 0.5, 0.02, Math.sin(a * 1.3) * 0.9], [0.18, 0.03, 0.11], {
        rot: [0, -a, 0],
        sides: 0,
      });
    }
  },
};
