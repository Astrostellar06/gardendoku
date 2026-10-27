/** Orchard and kitchen garden: apple and cherry trees, vegetable rows, scarecrows, beehives and hens. */
import { grassFrom, SPRING } from '../palette';
import { plankBridge, treeProp } from './common';
import { circle, ellipse, eyes, groundShadow, leaf, line, poly, rrect } from './kit';
import { clouds, hill, roundTree } from './scenery';
import type { PropDef, Theme } from './types';

const vegPatch: PropDef = {
  id: 'veg-patch',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 3,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(Math.floor(v * 4) * (Math.PI / 2));
    rrect(ctx, -r * 0.85, -r * 0.7, r * 1.7, r * 1.4, r * 0.15, '#B98458');
    for (let row = 0; row < 3; row++) {
      const y = -r * 0.45 + row * r * 0.45;
      line(ctx, -r * 0.7, y + r * 0.12, r * 0.7, y + r * 0.12, r * 0.05, '#A47248');
      for (let k = 0; k < 3; k++) {
        const x = -r * 0.5 + k * r * 0.5;
        if (row === 1) {
          // Cabbages.
          circle(ctx, x, y, r * 0.2, '#9FD48A');
          circle(ctx, x, y, r * 0.12, '#C4EBA8');
        } else {
          // Lettuces.
          for (let l = 0; l < 5; l++) leaf(ctx, x, y + r * 0.08, r * 0.24, r * 0.12, (l - 2) * 0.55, row ? '#6FC266' : '#86CF72');
        }
      }
    }
  },
};

const carrots: PropDef = {
  id: 'carrots',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.6, r * 0.8);
    for (const x of [-0.45, 0, 0.45]) {
      ellipse(ctx, x * r, r * 0.55, r * 0.18, r * 0.1, 0, '#A47248');
      poly(ctx, [x * r - r * 0.14, r * 0.45, x * r + r * 0.14, r * 0.45, x * r, r * 0.62], '#FF9A3D');
      for (let k = -1; k <= 1; k++) leaf(ctx, x * r, r * 0.42, r * 0.5, r * 0.1, k * 0.35, k ? '#5FB45B' : '#78C266');
    }
  },
};

const tomato: PropDef = {
  id: 'tomato-stake',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.45);
    line(ctx, 0, r * 0.92, 0, -r * 0.95, r * 0.07, '#C9A06A');
    for (let k = 0; k < 4; k++) {
      const y = r * 0.6 - k * r * 0.42;
      leaf(ctx, 0, y, r * 0.38, r * 0.14, k % 2 ? 1.0 : -1.0, '#5FB45B');
      leaf(ctx, 0, y - r * 0.1, r * 0.3, r * 0.12, k % 2 ? -0.9 : 0.9, '#78C266');
    }
    for (const [x, y, s] of [[-0.25, 0.25, 0.16], [0.28, -0.05, 0.15], [-0.22, -0.4, 0.13], [0.22, 0.5, 0.14]]) {
      circle(ctx, x * r, y * r, s * r, '#FF5A4E');
      circle(ctx, x * r - s * r * 0.3, y * r - s * r * 0.3, s * r * 0.3, 'rgba(255,255,255,0.45)');
    }
  },
};

const scarecrow: PropDef = {
  id: 'scarecrow',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  drawScale: 1.6,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.4);
    line(ctx, 0, r * 0.95, 0, -r * 0.5, r * 0.08, '#A47248');
    line(ctx, -r * 0.75, -r * 0.2, r * 0.75, -r * 0.2, r * 0.07, '#A47248');
    // Patched shirt.
    poly(ctx, [-r * 0.65, -r * 0.3, r * 0.65, -r * 0.3, r * 0.35, r * 0.4, -r * 0.35, r * 0.4], v > 0.5 ? '#E8735A' : '#6FA8DC');
    rrect(ctx, r * 0.05, -r * 0.1, r * 0.2, r * 0.2, r * 0.03, '#FFD45A');
    for (const x of [-0.7, 0.7]) for (const dx of [-0.08, 0, 0.08]) line(ctx, x * r, -r * 0.2, x * r + dx * r * 1.5, -r * 0.05, r * 0.03, '#F2CF6A');
    circle(ctx, 0, -r * 0.55, r * 0.22, '#F2D8A0');
    eyes(ctx, 0, -r * 0.57, r * 0.08, r * 0.03);
    line(ctx, -r * 0.08, -r * 0.47, r * 0.08, -r * 0.47, r * 0.025, '#8A5A3A');
    ellipse(ctx, 0, -r * 0.72, r * 0.42, r * 0.08, 0, '#C9A060');
    poly(ctx, [-r * 0.2, -r * 0.72, -r * 0.15, -r * 0.98, r * 0.15, -r * 0.98, r * 0.2, -r * 0.72], '#D9B070');
    rrect(ctx, -r * 0.2, -r * 0.8, r * 0.4, r * 0.06, r * 0.02, '#E8735A');
  },
};

const wheelbarrow: PropDef = {
  id: 'wheelbarrow',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, v, bloom }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    groundShadow(ctx, 0, r * 0.88, r * 0.85);
    line(ctx, -r * 0.2, r * 0.3, -r * 0.85, -r * 0.05, r * 0.07, '#8A6248');
    line(ctx, -r * 0.35, r * 0.4, -r * 0.4, r * 0.85, r * 0.06, '#8A6248');
    if (bloom > 0.3) {
      // Pumpkins and apples piled in.
      circle(ctx, r * 0.05, -r * 0.05, r * 0.25, '#FF9F43');
      circle(ctx, r * 0.38, -r * 0.02, r * 0.2, '#FFB35A');
      circle(ctx, r * 0.2, -r * 0.25, r * 0.12, '#FF5C5C');
      line(ctx, r * 0.05, -r * 0.3, r * 0.08, -r * 0.38, r * 0.05, '#6E8E3E');
    }
    poly(ctx, [-r * 0.3, -r * 0.05, r * 0.75, -r * 0.05, r * 0.5, r * 0.45, -r * 0.15, r * 0.45], '#6FA8A0');
    poly(ctx, [-r * 0.3, -r * 0.05, r * 0.75, -r * 0.05, r * 0.7, r * 0.05, -r * 0.25, r * 0.05], '#86BDB4');
    circle(ctx, r * 0.45, r * 0.65, r * 0.24, '#3E3440');
    circle(ctx, r * 0.45, r * 0.65, r * 0.1, '#B8B8C0');
  },
};

const beehive: PropDef = {
  id: 'beehive',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    rrect(ctx, -r * 0.55, r * 0.75, r * 1.1, r * 0.2, r * 0.04, '#A47248');
    // Straw skep in stacked rings.
    for (let k = 0; k < 5; k++) {
      const w = r * (0.55 - k * 0.08);
      rrect(ctx, -w, r * 0.55 - k * r * 0.25, w * 2, r * 0.28, r * 0.12, k % 2 ? '#F2C55C' : '#E8B44A');
    }
    circle(ctx, 0, -r * 0.55, r * 0.15, '#F2C55C');
    ellipse(ctx, 0, r * 0.62, r * 0.14, r * 0.1, 0, '#6E4E3E');
    if (bloom > 0.5) {
      for (const [x, y] of [[0.55, -0.4], [-0.6, -0.2]]) {
        ellipse(ctx, x * r, y * r, r * 0.1, r * 0.07, 0, '#FFD045');
        line(ctx, x * r - r * 0.02, y * r - r * 0.06, x * r - r * 0.02, y * r + r * 0.06, r * 0.035, '#4A3A44');
        ellipse(ctx, x * r, y * r - r * 0.1, r * 0.06, r * 0.05, 0, 'rgba(255,255,255,0.85)');
      }
    }
  },
};

const hen: PropDef = {
  id: 'hen',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const feather = v > 0.3 && v < 0.7 ? '#FFFFFF' : '#C9885A';
    groundShadow(ctx, 0, r * 0.9, r * 0.6);
    line(ctx, -r * 0.1, r * 0.55, -r * 0.12, r * 0.88, r * 0.05, '#FF9F43');
    line(ctx, r * 0.12, r * 0.55, r * 0.14, r * 0.88, r * 0.05, '#FF9F43');
    ellipse(ctx, 0, r * 0.25, r * 0.55, r * 0.4, 0, feather);
    poly(ctx, [-r * 0.45, r * 0.1, -r * 0.8, -r * 0.35, -r * 0.6, r * 0.25], feather);
    ellipse(ctx, -r * 0.05, r * 0.25, r * 0.3, r * 0.18, -0.2, 'rgba(0,0,0,0.08)');
    circle(ctx, r * 0.42, -r * 0.2, r * 0.24, feather);
    circle(ctx, r * 0.38, -r * 0.45, r * 0.08, '#FF5A4E');
    circle(ctx, r * 0.48, -r * 0.43, r * 0.07, '#FF5A4E');
    poly(ctx, [r * 0.62, -r * 0.24, r * 0.78, -r * 0.18, r * 0.62, -r * 0.12], '#FFC93A');
    ellipse(ctx, r * 0.58, -r * 0.05, r * 0.05, r * 0.08, 0, '#FF5A4E');
    circle(ctx, r * 0.48, -r * 0.24, r * 0.04, '#3E3440');
  },
};

export const verger: Theme = {
  id: 'verger',
  name: 'Verger',
  blurb: 'Pommiers, potager et poules',
  palette: {
    ...SPRING,
    bgTop: '#FFE2B6',
    bgMid: '#FFF6E6',
    bgBottom: '#D4ECB6',
    bokeh: ['255,200,140', '255,230,170', '190,225,150', '255,170,160'],
    bedShadow: 'rgba(190, 130, 80, 0.3)',
    tileShadow: 'rgba(140, 90, 55, 0.4)',
    soil: '#DDAD7E',
    soilLight: '#EAC396',
    soilDark: '#CB986C',
    soilSide: '#BA865A',
    soilSideDark: '#A6744A',
    pebble: '#F7E6D0',
    pebbleShade: '#BB8C64',
    ...grassFrom(88, 0.58, 0.6),
    rim: '#FFF6EA',
    rimShade: '#BE906A',
    groove: '#D2A276',
    grooveDeep: '#BE8C62',
    water: '#68CAF0',
    waterDeep: '#3EACE2',
    petals: ['#FFFFFF', '#FFC2D6', '#FFD45A', '#FF8F6B', '#C4A4F8'],
    centers: ['#FFC83A', '#FFE07A'],
  },
  ambient: 'petals',
  ambientColors: ['#FFFFFF', '#FFE4EC', '#FFD0DE'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    treeProp('apple-tree', { foliage: ['#6FC266', '#86CF72', '#5FB45B'], trunk: '#8A6248', fruit: '#FF5C5C' }, 3),
    treeProp('cherry-tree', { foliage: ['#5FB45B', '#78C266', '#6FC266'], trunk: '#7A5547', fruit: '#D9304F' }, 1),
    vegPatch,
    carrots,
    tomato,
    scarecrow,
    wheelbarrow,
    beehive,
    hen,
    plankBridge('#D2A06A', '#BE8C58', '#9A6A42'),
  ],
  dryGround(ctx, g) {
    // Furrows.
    ctx.strokeStyle = 'rgba(150, 95, 55, 0.3)';
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const y = -0.33 + k * 0.22 + (g.rnd[k] - 0.5) * 0.04;
      ctx.moveTo(-0.38, y);
      ctx.lineTo(0.38, y);
    }
    ctx.stroke();
  },
  scenery(ctx, w, h) {
    clouds(ctx, w, h);
    // Rows of fruit trees behind the meadow.
    for (let k = 0; k < 7; k++) {
      const x = w * (0.05 + k * 0.095);
      const y = h * (0.912 + Math.sin(k * 2) * 0.006);
      roundTree(ctx, x, y, 0.75, '#86C672', '#8A6A55');
      circle(ctx, x - 5, y - 24, 2.5, '#FF6F6F');
      circle(ctx, x + 6, y - 19, 2.5, '#FF6F6F');
      circle(ctx, x - 1, y - 32, 2.5, '#FF6F6F');
    }
    hill(ctx, w, h, h * 0.905, 8, '#C4E39C', 0.6);
    // Red barn and its silo.
    const bx = w * 0.8;
    const by = h * 0.9;
    rrect(ctx, bx + 26, by - 52, 16, 54, 7, '#D9DCE4');
    ctx.fillStyle = '#B8BCC8';
    ctx.beginPath();
    ctx.arc(bx + 34, by - 46, 8, Math.PI, 0);
    ctx.fill();
    poly(ctx, [bx - 30, by + 2, bx - 30, by - 28, bx, by - 48, bx + 30, by - 28, bx + 30, by + 2], '#E8735A');
    poly(ctx, [bx - 34, by - 26, bx, by - 52, bx + 34, by - 26, bx + 30, by - 24, bx, by - 46, bx - 30, by - 24], '#FFF2E0');
    rrect(ctx, bx - 11, by - 22, 22, 24, 2, '#FFF2E0');
    rrect(ctx, bx - 9, by - 20, 18, 22, 1, '#C95A48');
    ctx.strokeStyle = '#FFF2E0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by - 20);
    ctx.lineTo(bx + 9, by + 2);
    ctx.moveTo(bx + 9, by - 20);
    ctx.lineTo(bx - 9, by + 2);
    ctx.stroke();
    rrect(ctx, bx - 5, by - 38, 10, 9, 1, '#FFF2E0');
    hill(ctx, w, h, h * 0.95, 10, 'rgba(160, 210, 120, 0.95)', 2.4);
  },
};
