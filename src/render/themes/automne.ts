/** Autumn garden: golden grass, fallen maple leaves, acorns, pumpkins and hedgehogs. */
import { SPRING } from '../palette';
import { mushroomProp, plankBridge, rockProp } from './common';
import { circle, ellipse, groundShadow, leaf, line, mapleLeaf, TAU } from './kit';
import { clouds, hill, roundTree } from './scenery';
import type { PropDef, Theme } from './types';

const LEAVES = ['#F2804E', '#E85D4A', '#FFB347', '#F5C04A', '#D9643A'];

const fallenLeaves: PropDef = {
  id: 'fallen-leaves',
  place: 'ground',
  size: [0.08, 0.11],
  weight: 3,
  when: 'always',
  draw(ctx, { r, v }) {
    for (let k = 0; k < 4; k++) {
      const a = v * TAU + k * 1.7;
      const d = k === 0 ? 0 : r * 0.55;
      mapleLeaf(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.42 - k * 0.04), a * 1.3, LEAVES[(k + Math.floor(v * 5)) % 5]);
    }
  },
};

const acorns: PropDef = {
  id: 'acorns',
  place: 'ground',
  size: [0.05, 0.07],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    const one = (x: number, y: number, s: number, tilt: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      groundShadow(ctx, 0, r * 0.45 * s, r * 0.4 * s);
      ellipse(ctx, 0, r * 0.05 * s, r * 0.36 * s, r * 0.45 * s, 0, '#D4924F');
      ellipse(ctx, -r * 0.1 * s, -r * 0.02 * s, r * 0.1 * s, r * 0.18 * s, 0, 'rgba(255,255,255,0.3)');
      ctx.fillStyle = '#8A5A3A';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.18 * s, r * 0.42 * s, r * 0.24 * s, 0, Math.PI, TAU);
      ctx.fill();
      line(ctx, 0, -r * 0.4 * s, r * 0.06 * s, -r * 0.55 * s, r * 0.08 * s, '#6E452C');
    };
    one(-r * 0.35, r * 0.1, 1, -0.3);
    one(r * 0.4, r * 0.25, 0.85, 0.4);
  },
};

const pumpkin: PropDef = {
  id: 'pumpkin',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    const c = v > 0.3 ? '#FF9A3C' : '#FFC45A';
    const dark = v > 0.3 ? '#E8782A' : '#EAA53A';
    groundShadow(ctx, 0, r * 0.62, r * 0.85);
    ellipse(ctx, -r * 0.42, r * 0.08, r * 0.38, r * 0.5, 0, dark);
    ellipse(ctx, r * 0.42, r * 0.08, r * 0.38, r * 0.5, 0, dark);
    ellipse(ctx, 0, r * 0.08, r * 0.45, r * 0.55, 0, c);
    ellipse(ctx, -r * 0.15, -r * 0.1, r * 0.1, r * 0.25, 0, 'rgba(255,255,255,0.28)');
    line(ctx, 0, -r * 0.42, r * 0.1, -r * 0.7, r * 0.12, '#6E8A3A');
    leaf(ctx, r * 0.08, -r * 0.5, r * 0.35, r * 0.15, 1.2, '#8DB04A');
  },
};

const hedgehog: PropDef = {
  id: 'hedgehog',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    ctx.scale(dir, 1);
    groundShadow(ctx, 0, r * 0.6, r * 0.9);
    // Spiky back.
    ctx.fillStyle = '#8A6248';
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.45);
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      const rad = k % 2 ? r * 0.95 : r * 0.72;
      ctx.lineTo(Math.cos(a) * rad - r * 0.1, Math.sin(a) * rad * 0.85 + r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, -r * 0.1, r * 0.25, r * 0.7, r * 0.35, 0, '#A57A5C');
    ellipse(ctx, r * 0.55, r * 0.3, r * 0.38, r * 0.27, 0.2, '#F3DDBF');
    circle(ctx, r * 0.9, r * 0.3, r * 0.08, '#4A3A44');
    circle(ctx, r * 0.55, r * 0.2, r * 0.06, '#4A3A44');
    circle(ctx, r * 0.45, r * 0.38, r * 0.08, 'rgba(255,140,150,0.6)');
  },
};

const autumnTree: PropDef = {
  id: 'autumn-tree',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const c = v > 0.5 ? ['#FF9A3C', '#F2804E', '#FFC45A'] : ['#E85D4A', '#F28C5A', '#FFB347'];
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    line(ctx, 0, r * 0.95, 0, 0, r * 0.16, '#8A5A3A');
    line(ctx, 0, r * 0.2, r * 0.3, -r * 0.1, r * 0.08, '#8A5A3A');
    circle(ctx, 0, -r * 0.42, r * 0.5, c[0]);
    circle(ctx, -r * 0.38, -r * 0.18, r * 0.32, c[1]);
    circle(ctx, r * 0.4, -r * 0.2, r * 0.33, c[2]);
    circle(ctx, -r * 0.18, -r * 0.6, r * 0.12, 'rgba(255,255,255,0.25)');
    mapleLeaf(ctx, r * 0.55, r * 0.75, r * 0.16, 0.8, c[1]);
  },
};

const leafPile: PropDef = {
  id: 'leaf-pile',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  draw(ctx, { r, v }) {
    ellipse(ctx, 0.01, r * 0.15, r * 0.95, r * 0.6, 0, 'rgba(120,60,20,0.15)');
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4 + v * 5;
      const d = r * 0.5 * Math.sqrt(k / 9);
      mapleLeaf(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.7, r * 0.33, a, LEAVES[k % 5]);
    }
  },
};

const apples: PropDef = {
  id: 'apples',
  place: 'ground',
  size: [0.05, 0.06],
  weight: 1,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    for (const [x, y, c] of [
      [-r * 0.35, r * 0.15, '#E9564A'],
      [r * 0.38, r * 0.25, '#F27C4E'],
      [0, -r * 0.15, '#D9443E'],
    ] as const) {
      groundShadow(ctx, x, y + r * 0.35, r * 0.32);
      circle(ctx, x, y, r * 0.38, c);
      circle(ctx, x - r * 0.12, y - r * 0.12, r * 0.1, 'rgba(255,255,255,0.4)');
      line(ctx, x, y - r * 0.32, x + r * 0.05, y - r * 0.5, r * 0.07, '#6E452C');
    }
  },
};

const floatingLeaf: PropDef = {
  id: 'floating-leaf',
  place: 'water',
  size: [0.05, 0.065],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    mapleLeaf(ctx, 0, 0, r * 0.75, v * TAU, LEAVES[Math.floor(v * 5)]);
    mapleLeaf(ctx, r * 0.4, r * 0.9, r * 0.45, v * 9, LEAVES[(Math.floor(v * 5) + 2) % 5]);
  },
};

const squirrelTail: PropDef = {
  id: 'squirrel',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    ctx.scale(dir, 1);
    groundShadow(ctx, 0, r * 0.85, r * 0.6);
    // Big curled tail behind.
    ellipse(ctx, -r * 0.4, -r * 0.1, r * 0.38, r * 0.7, -0.3, '#C96A3A');
    ellipse(ctx, -r * 0.35, -r * 0.55, r * 0.3, r * 0.25, 0.4, '#D9804A');
    ellipse(ctx, r * 0.1, r * 0.35, r * 0.35, r * 0.45, 0, '#D9804A');
    ellipse(ctx, r * 0.15, r * 0.45, r * 0.2, r * 0.28, 0, '#F6D2A8');
    circle(ctx, r * 0.25, -r * 0.15, r * 0.3, '#D9804A');
    ellipse(ctx, r * 0.18, -r * 0.45, r * 0.08, r * 0.14, 0, '#C96A3A');
    circle(ctx, r * 0.36, -r * 0.2, r * 0.06, '#4A3A44');
    // Holding an acorn.
    circle(ctx, r * 0.45, r * 0.18, r * 0.13, '#D4924F');
  },
};

export const automne: Theme = {
  id: 'automne',
  name: 'Automne',
  blurb: 'Feuilles mortes, noisettes et hérissons',
  palette: {
    ...SPRING,
    bgTop: '#FFD9B8',
    bgMid: '#FFEFD9',
    bgBottom: '#F2D7A8',
    bokeh: ['255,170,110', '255,210,120', '240,140,90', '255,230,170'],
    bedShadow: 'rgba(200, 120, 70, 0.3)',
    tileShadow: 'rgba(150, 90, 50, 0.4)',
    soil: '#DDB08A',
    soilLight: '#EAC6A2',
    soilDark: '#CC9A72',
    soilSide: '#BF8A60',
    soilSideDark: '#AC784F',
    pebble: '#F4E5D2',
    pebbleShade: '#B98A62',
    grass: '#EBC566',
    grassLight: '#F6DA8E',
    grassDark: '#DDB04E',
    grassDeep: '#B58A34',
    grassSide: '#CFA043',
    grassSideDark: '#B98B35',
    rim: '#FFF6EA',
    rimShade: '#C28A5C',
    groove: '#C99266',
    grooveDeep: '#B57C52',
    water: '#62C6DB',
    waterDeep: '#36A5C0',
    petals: ['#F2804E', '#E85D4A', '#FFB347', '#B57EDC', '#FFD45A', '#FFFFFF'],
    centers: ['#FFC83A', '#8A5A3A'],
    lotus: ['#FF9F5A', '#FFC857', '#FF7F6E', '#FFE3B0'],
    lily: '#9CBF5B',
    lilyDark: '#7DA046',
  },
  ambient: 'leaves',
  ambientColors: LEAVES,
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    fallenLeaves,
    acorns,
    pumpkin,
    hedgehog,
    autumnTree,
    leafPile,
    apples,
    squirrelTail,
    mushroomProp(['#E9564A', '#C96A3A', '#F2A65A']),
    rockProp('#D9C3AE', '#B49A82', '#F3E6D8', '#C9A64A'),
    plankBridge('#C98A5A', '#B57846', '#8A5A3A'),
    floatingLeaf,
  ],
  bloomGround(ctx, g) {
    // A few leaves resting in the golden grass.
    for (let k = 0; k < 3; k++) {
      const a = g.rnd[k] * TAU;
      mapleLeaf(ctx, Math.cos(a) * 0.32, Math.sin(a * 1.7) * 0.32, 0.035, a, LEAVES[k + 1]);
    }
  },
  tuft(ctx, s) {
    ctx.strokeStyle = '#C09038';
    ctx.lineWidth = 0.016;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, s * 0.4);
    ctx.quadraticCurveTo(-s * 0.4, 0, -s * 0.65, -s * 0.4);
    ctx.moveTo(0, s * 0.4);
    ctx.lineTo(s * 0.05, -s * 0.7);
    ctx.moveTo(s * 0.15, s * 0.4);
    ctx.quadraticCurveTo(s * 0.4, 0, s * 0.6, -s * 0.35);
    ctx.stroke();
    circle(ctx, s * 0.05, -s * 0.72, s * 0.12, '#E9A24A');
  },
  scenery(ctx, w, h) {
    clouds(ctx, w, h, 'rgba(255,250,240,0.75)');
    hill(ctx, w, h, h * 0.9, 16, 'rgba(240, 196, 120, 0.85)', 0.4);
    for (let k = 0; k < 6; k++) {
      roundTree(ctx, w * (0.08 + k * 0.17), h * (0.9 + Math.sin(k * 1.9) * 0.012), 0.8 + (k % 3) * 0.15, LEAVES[k % 5], '#9A6A48');
    }
    hill(ctx, w, h, h * 0.95, 12, 'rgba(226, 170, 96, 0.9)', 2.2);
  },
};

