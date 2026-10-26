/** French formal garden: clipped cones, orange trees in boxes, statues, box parterres, fountains and swans. */
import { SPRING } from '../palette';
import { bridgeProp, swimOffset, treeProp } from './common';
import { circle, ellipse, groundShadow, line, rrect, TAU } from './kit';
import { hill, palace } from './scenery';
import type { PropDef, Theme } from './types';

const MARBLE = '#F4F0EA';
const MARBLE_SHADE = '#D9D2C8';

const statue: PropDef = {
  id: 'statue',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.45);
    rrect(ctx, -r * 0.35, r * 0.4, r * 0.7, r * 0.55, r * 0.04, MARBLE_SHADE);
    rrect(ctx, -r * 0.42, r * 0.35, r * 0.84, r * 0.12, r * 0.03, MARBLE);
    rrect(ctx, -r * 0.42, r * 0.85, r * 0.84, r * 0.1, r * 0.03, MARBLE);
    ctx.save();
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    // Draped figure holding up an arm.
    ctx.fillStyle = MARBLE;
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.35);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.1, -r * 0.12, -r * 0.4);
    ctx.lineTo(r * 0.14, -r * 0.4);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.1, r * 0.25, r * 0.35);
    ctx.closePath();
    ctx.fill();
    circle(ctx, 0, -r * 0.55, r * 0.15, MARBLE);
    line(ctx, r * 0.12, -r * 0.35, r * 0.35, -r * 0.75, r * 0.08, MARBLE);
    line(ctx, -r * 0.12, -r * 0.3, -r * 0.2, 0, r * 0.08, MARBLE);
    ctx.strokeStyle = MARBLE_SHADE;
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    for (const x of [-0.1, 0.05]) {
      ctx.moveTo(x * r, -r * 0.3);
      ctx.quadraticCurveTo(x * r + r * 0.05, 0, x * r, r * 0.32);
    }
    ctx.stroke();
    ctx.restore();
  },
};

const vase: PropDef = {
  id: 'stone-vase',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.45);
    rrect(ctx, -r * 0.3, r * 0.45, r * 0.6, r * 0.5, r * 0.04, MARBLE_SHADE);
    rrect(ctx, -r * 0.1, r * 0.2, r * 0.2, r * 0.28, r * 0.04, MARBLE);
    ctx.fillStyle = MARBLE;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.35);
    ctx.quadraticCurveTo(-r * 0.45, r * 0.22, 0, r * 0.22);
    ctx.quadraticCurveTo(r * 0.45, r * 0.22, r * 0.5, -r * 0.35);
    ctx.closePath();
    ctx.fill();
    rrect(ctx, -r * 0.55, -r * 0.42, r * 1.1, r * 0.1, r * 0.04, '#FFFFFF');
    for (const s of [-1, 1]) {
      ctx.strokeStyle = MARBLE;
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      ctx.arc(s * r * 0.5, -r * 0.15, r * 0.12, -Math.PI / 2, Math.PI / 2, s < 0);
      ctx.stroke();
    }
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, (bloom - 0.3) * 2);
      for (const [x, y, c] of [[-0.3, -0.5, '#FF8FB6'], [0, -0.62, '#FFFFFF'], [0.3, -0.5, '#C4A4F8'], [-0.12, -0.48, '#5FB45B'], [0.15, -0.5, '#5FB45B']] as const) {
        circle(ctx, x * r, y * r, r * 0.15, c);
      }
      ctx.globalAlpha = 1;
    }
  },
};

const parterre: PropDef = {
  id: 'parterre',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 3,
  when: 'always',
  draw(ctx, { r, v, bloom }) {
    ctx.rotate(Math.floor(v * 4) * (Math.PI / 2));
    // Clipped box hedge embroidery around a flower bed.
    ctx.strokeStyle = 'rgba(40, 80, 40, 0.18)';
    ctx.lineWidth = r * 0.2;
    ctx.lineCap = 'round';
    const scroll = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.55);
      ctx.lineTo(-r * 0.8, -r * 0.55);
      ctx.lineTo(r * 0.8, -r * 0.55);
      ctx.lineTo(r * 0.8, r * 0.55);
      ctx.closePath();
      ctx.moveTo(-r * 0.35, 0);
      ctx.arc(-r * 0.2, 0, r * 0.15, Math.PI, Math.PI * 2.6);
      ctx.moveTo(r * 0.35, 0);
      ctx.arc(r * 0.2, 0, r * 0.15, 0, -Math.PI * 1.6, true);
      ctx.stroke();
    };
    ctx.save();
    ctx.translate(r * 0.03, r * 0.05);
    scroll();
    ctx.restore();
    ctx.strokeStyle = '#4E9E5E';
    ctx.lineWidth = r * 0.16;
    scroll();
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, (bloom - 0.3) * 2);
      for (const [x, y] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3], [0, -0.3], [0, 0.3]]) circle(ctx, x * r, y * r, r * 0.09, '#FF8FB6');
      ctx.globalAlpha = 1;
    }
  },
};

const fountain: PropDef = {
  id: 'tiered-fountain',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  animated: true,
  drawScale: 1.6,
  draw(ctx, { r, time, bloom }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.9);
    rrect(ctx, -r * 0.9, r * 0.5, r * 1.8, r * 0.38, r * 0.12, MARBLE_SHADE);
    ellipse(ctx, 0, r * 0.5, r * 0.9, r * 0.25, 0, MARBLE);
    ellipse(ctx, 0, r * 0.5, r * 0.78, r * 0.18, 0, bloom > 0.3 ? '#7FD0F2' : '#D9D2C8');
    rrect(ctx, -r * 0.1, -r * 0.3, r * 0.2, r * 0.8, r * 0.05, MARBLE);
    ellipse(ctx, 0, -r * 0.25, r * 0.45, r * 0.12, 0, MARBLE);
    ellipse(ctx, 0, -r * 0.27, r * 0.36, r * 0.07, 0, bloom > 0.3 ? '#9CDCF5' : '#D9D2C8');
    rrect(ctx, -r * 0.05, -r * 0.6, r * 0.1, r * 0.35, r * 0.04, MARBLE);
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, bloom) * 0.9;
      ellipse(ctx, 0, -r * 0.75, r * 0.05, r * 0.18, 0, '#BDE9FF');
      for (let k = 0; k < 6; k++) {
        const t = (time * 0.9 + k / 6) % 1;
        const side = k % 2 ? 1 : -1;
        circle(ctx, side * r * (0.05 + t * 0.35), -r * 0.85 + t * t * r * 0.6, r * 0.04, '#BDE9FF');
        circle(ctx, side * r * (0.4 + t * 0.3), -r * 0.25 + t * t * r * 0.75, r * 0.04, '#BDE9FF');
      }
      ctx.globalAlpha = 1;
    }
  },
};

const swan: PropDef = {
  id: 'swan',
  place: 'water',
  size: [0.055, 0.065],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time * 0.7, v, 0.07);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    ellipse(ctx, 0.004, 0.006, r * 0.62, r * 0.95, 0, 'rgba(30,70,90,0.15)');
    ellipse(ctx, 0, -r * 0.1, r * 0.6, r * 0.9, 0, '#FFFFFF');
    ellipse(ctx, -r * 0.25, -r * 0.2, r * 0.25, r * 0.55, 0.15, '#EEF2F6');
    ellipse(ctx, r * 0.25, -r * 0.2, r * 0.25, r * 0.55, -0.15, '#EEF2F6');
    // Neck curving forward, seen from above.
    line(ctx, 0, r * 0.4, 0, r * 0.85, r * 0.2, '#FFFFFF');
    circle(ctx, 0, r * 0.9, r * 0.17, '#FFFFFF');
    ellipse(ctx, 0, r * 1.1, r * 0.08, r * 0.12, 0, '#FF9F43');
    circle(ctx, -r * 0.09, r * 0.92, r * 0.04, '#3E3440');
    circle(ctx, r * 0.09, r * 0.92, r * 0.04, '#3E3440');
  },
};

export const francais: Theme = {
  id: 'francais',
  name: 'Jardin à la française',
  blurb: 'Topiaires, statues et bassins de château',
  palette: {
    ...SPRING,
    bgTop: '#D4E4FF',
    bgMid: '#F7F4EC',
    bgBottom: '#D0E6C6',
    bokeh: ['170,200,250', '255,235,190', '200,225,190', '230,215,250'],
    bedShadow: 'rgba(120, 130, 150, 0.3)',
    tileShadow: 'rgba(100, 100, 110, 0.4)',
    soil: '#EEE4D2',
    soilLight: '#F8F1E4',
    soilDark: '#DED1BA',
    soilSide: '#CFC0A6',
    soilSideDark: '#BEAE94',
    pebble: '#FFFFFF',
    pebbleShade: '#C9BBA2',
    grass: '#8ECC7C',
    grassLight: '#AADB96',
    grassDark: '#76BC68',
    grassDeep: '#58A052',
    grassSide: '#6AB05E',
    grassSideDark: '#5A9E52',
    rim: '#FFFFFF',
    rimShade: '#C6B9A2',
    groove: '#D6C8B0',
    grooveDeep: '#C4B49A',
    water: '#74C8F2',
    waterDeep: '#48AAE4',
    petals: ['#FF8FB6', '#FFFFFF', '#C4A4F8', '#FFD45A', '#8DC8FF'],
    centers: ['#FFE07A', '#FFFFFF'],
    lotus: ['#FFFFFF', '#FFE4F0', '#E8E0FF'],
  },
  ambient: 'pollen',
  ambientColors: ['#FFFFFF', '#F3EEDD', '#FFF4C8'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.35,
  props: [
    treeProp('cone-topiary', { foliage: ['#4E9E5E', '#62B370'], trunk: '#7A5547', shape: 'cone' }, 4),
    treeProp('orange-tree', { foliage: ['#5FB45B', '#78C266'], trunk: '#7A5547', shape: 'ball', pot: '#4F8A72', fruit: '#FFA23A' }, 2),
    statue,
    vase,
    parterre,
    fountain,
    bridgeProp('balustrade-bridge', { deck: '#F4EEE2', deckShade: '#D8CDB8', side: '#CFC2AA', rail: '#FFFFFF', cap: '#E8DFCC', hump: 0.05 }),
    swan,
  ],
  dryGround(ctx, g) {
    // Raked gravel.
    for (let k = 0; k < 10; k++) {
      circle(ctx, (g.rnd[k % 6] - 0.5) * 0.8 + Math.sin(k * 2.7) * 0.1, (g.rnd[(k + 3) % 6] - 0.5) * 0.8 + Math.cos(k * 1.9) * 0.1, 0.008, k % 2 ? 'rgba(255,255,255,0.8)' : 'rgba(160,145,120,0.35)');
    }
  },
  bloomGround(ctx) {
    // Mown stripes.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let k = -2; k <= 2; k += 2) ctx.fillRect(k * 0.1 - 0.05, -0.5, 0.1, 1);
  },
  smallFlower(ctx, r, color, center) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      ellipse(ctx, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.35, r * 0.22, a, color);
    }
    circle(ctx, 0, 0, r * 0.25, center);
  },
  scenery(ctx, w, h) {
    hill(ctx, w, h, h * 0.9, 4, 'rgba(170, 214, 160, 0.95)', 0.5);
    palace(ctx, w * 0.5, h * 0.905, Math.min(1.3, w / 300), '#EEDFC6', '#7F8DAA');
    for (let k = 0; k < 10; k++) {
      const x = w * (0.04 + k * 0.103);
      if (Math.abs(x - w * 0.5) < w * 0.12) continue;
      ctx.fillStyle = '#6FAE6A';
      ctx.beginPath();
      ctx.moveTo(x - 8, h * 0.93);
      ctx.lineTo(x, h * 0.93 - 30);
      ctx.lineTo(x + 8, h * 0.93);
      ctx.closePath();
      ctx.fill();
    }
    hill(ctx, w, h, h * 0.95, 4, 'rgba(136, 196, 126, 0.95)', 2.2);
  },
};
