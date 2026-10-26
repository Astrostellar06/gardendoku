/** City park: paved paths, street lamps, benches, bikes, hot-dog carts, pigeons and rowing boats. */
import { SPRING } from '../palette';
import { benchProp, bridgeProp, swimOffset, treeProp } from './common';
import { circle, ellipse, glow, groundShadow, line, poly, rrect } from './kit';
import { hill, roundTree, skyline } from './scenery';
import type { PropDef, Theme } from './types';

const IRON = '#4A4E5A';

const lamp: PropDef = {
  id: 'street-lamp',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  upright: true,
  drawScale: 1.7,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.3);
    rrect(ctx, -r * 0.16, r * 0.7, r * 0.32, r * 0.25, r * 0.06, IRON);
    line(ctx, 0, r * 0.8, 0, -r * 0.6, r * 0.09, IRON);
    glow(ctx, 0, -r * 0.75, r * 0.7, '255,225,150', bloom * 0.55);
    poly(ctx, [-r * 0.2, -r * 0.6, r * 0.2, -r * 0.6, r * 0.25, -r * 0.95, -r * 0.25, -r * 0.95], bloom > 0.5 ? '#FFE9A0' : '#E3E6EE');
    poly(ctx, [-r * 0.32, -r * 0.95, 0, -r * 1.12, r * 0.32, -r * 0.95], IRON);
    rrect(ctx, -r * 0.24, -r * 0.64, r * 0.48, r * 0.07, r * 0.03, IRON);
  },
};

const bike: PropDef = {
  id: 'bike',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const frame = v > 0.25 && v < 0.75 ? '#5EAFE0' : '#FF7A8A';
    groundShadow(ctx, 0, r * 0.88, r * 0.9);
    ctx.strokeStyle = '#3E3440';
    ctx.lineWidth = r * 0.07;
    for (const x of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.arc(x * r, r * 0.5, r * 0.36, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = frame;
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.5);
    ctx.lineTo(-r * 0.1, r * 0.5);
    ctx.lineTo(r * 0.3, -r * 0.05);
    ctx.lineTo(-r * 0.2, -r * 0.05);
    ctx.lineTo(-r * 0.5, r * 0.5);
    ctx.moveTo(-r * 0.1, r * 0.5);
    ctx.lineTo(-r * 0.25, -r * 0.2);
    ctx.moveTo(r * 0.5, r * 0.5);
    ctx.lineTo(r * 0.32, -r * 0.25);
    ctx.stroke();
    rrect(ctx, -r * 0.38, -r * 0.27, r * 0.26, r * 0.08, r * 0.04, '#3E3440');
    line(ctx, r * 0.25, -r * 0.28, r * 0.45, -r * 0.32, r * 0.06, '#3E3440');
    // Basket of flowers in front.
    rrect(ctx, r * 0.35, -r * 0.2, r * 0.3, r * 0.22, r * 0.05, '#D9A066');
    for (const [x, c] of [[0.42, '#FF8FB6'], [0.52, '#FFD45A'], [0.6, '#FFFFFF']] as const) circle(ctx, x * r, -r * 0.24, r * 0.06, c);
  },
};

const cart: PropDef = {
  id: 'hotdog-cart',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.8);
    line(ctx, 0, -r * 0.1, 0, -r * 0.75, r * 0.05, '#B8B8C0');
    ctx.fillStyle = '#FF7A6B';
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.6);
    ctx.quadraticCurveTo(0, -r * 1.1, r * 0.75, -r * 0.6);
    ctx.closePath();
    ctx.fill();
    for (const x of [-0.45, 0.05, 0.5]) poly(ctx, [x * r - r * 0.12, -r * 0.63, x * r, -r * 0.88, x * r + r * 0.12, -r * 0.63], '#FFFFFF');
    rrect(ctx, -r * 0.65, -r * 0.1, r * 1.3, r * 0.7, r * 0.1, '#E8EEF4');
    rrect(ctx, -r * 0.65, r * 0.1, r * 1.3, r * 0.14, r * 0.03, '#FFC94D');
    rrect(ctx, -r * 0.4, -r * 0.18, r * 0.5, r * 0.12, r * 0.06, '#E8A06A');
    rrect(ctx, -r * 0.35, -r * 0.2, r * 0.4, r * 0.06, r * 0.03, '#D9534F');
    circle(ctx, -r * 0.4, r * 0.7, r * 0.2, '#3E3440');
    circle(ctx, r * 0.4, r * 0.7, r * 0.2, '#3E3440');
    circle(ctx, -r * 0.4, r * 0.7, r * 0.08, '#B8B8C0');
    circle(ctx, r * 0.4, r * 0.7, r * 0.08, '#B8B8C0');
  },
};

const pigeons: PropDef = {
  id: 'pigeons',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v, v2 }) {
    const one = (x: number, dir: number, s: number) => {
      groundShadow(ctx, x, r * 0.85, r * 0.3 * s);
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(dir * s, s);
      ellipse(ctx, 0, r * 0.45, r * 0.38, r * 0.25, -0.2, '#A9AEC4');
      ellipse(ctx, -r * 0.15, r * 0.4, r * 0.25, r * 0.15, -0.3, '#8E93AC');
      circle(ctx, r * 0.3, r * 0.15, r * 0.16, '#9DA3BB');
      ellipse(ctx, r * 0.22, r * 0.3, r * 0.1, r * 0.08, 0, '#8FC9B0');
      poly(ctx, [r * 0.44, r * 0.12, r * 0.56, r * 0.17, r * 0.44, r * 0.2], '#E8A06A');
      circle(ctx, r * 0.34, r * 0.1, r * 0.035, '#3E3440');
      line(ctx, -r * 0.02, r * 0.66, -r * 0.02, r * 0.82, r * 0.04, '#E88A8A');
      line(ctx, r * 0.1, r * 0.66, r * 0.1, r * 0.82, r * 0.04, '#E88A8A');
      ctx.restore();
    };
    one(-r * 0.35, v > 0.5 ? 1 : -1, 1);
    one(r * 0.4, v2 > 0.5 ? 1 : -1, 0.85);
  },
};

const hydrant: PropDef = {
  id: 'hydrant',
  place: 'ground',
  size: [0.05, 0.06],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    rrect(ctx, -r * 0.5, r * 0.75, r * 1.0, r * 0.2, r * 0.05, '#D94A4A');
    rrect(ctx, -r * 0.35, -r * 0.3, r * 0.7, r * 1.1, r * 0.12, '#F25C54');
    ctx.fillStyle = '#D94A4A';
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r * 0.38, Math.PI, 0);
    ctx.fill();
    circle(ctx, 0, -r * 0.7, r * 0.1, '#D94A4A');
    rrect(ctx, -r * 0.62, r * 0.05, r * 1.24, r * 0.22, r * 0.08, '#D94A4A');
    rrect(ctx, -r * 0.25, -r * 0.2, r * 0.12, r * 0.85, r * 0.06, 'rgba(255,255,255,0.3)');
  },
};

const fountain: PropDef = {
  id: 'city-fountain',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  animated: true,
  draw(ctx, { r, time, bloom }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.85);
    ellipse(ctx, 0, r * 0.6, r * 0.9, r * 0.32, 0, '#D9D2C6');
    ellipse(ctx, 0, r * 0.52, r * 0.78, r * 0.24, 0, bloom > 0.3 ? '#7FD0F2' : '#CFC8BC');
    rrect(ctx, -r * 0.9, r * 0.55, r * 1.8, r * 0.3, r * 0.1, '#D9D2C6');
    rrect(ctx, -r * 0.1, -r * 0.2, r * 0.2, r * 0.75, r * 0.05, '#E8E2D8');
    ellipse(ctx, 0, -r * 0.2, r * 0.35, r * 0.1, 0, '#E8E2D8');
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, bloom);
      for (let k = 0; k < 4; k++) {
        const t = (time * 0.8 + k / 4) % 1;
        const side = k % 2 ? 1 : -1;
        circle(ctx, side * r * (0.1 + t * 0.45), -r * 0.35 - Math.sin(t * Math.PI) * r * 0.4 + t * r * 0.7, r * 0.05, '#BDE9FF');
      }
      ellipse(ctx, 0, -r * 0.45, r * 0.06, r * 0.2, 0, '#BDE9FF');
      ctx.globalAlpha = 1;
    }
  },
};

const rowboat: PropDef = {
  id: 'rowboat',
  place: 'water',
  size: [0.05, 0.06],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y } = swimOffset(time * 0.5, v, 0.06);
    ctx.translate(0, y);
    ellipse(ctx, 0.004, 0.006, r * 0.6, r * 1.0, 0, 'rgba(30,70,90,0.2)');
    ellipse(ctx, 0, 0, r * 0.58, r * 1.0, 0, '#FFFFFF');
    ellipse(ctx, 0, 0, r * 0.45, r * 0.85, 0, v > 0.5 ? '#5EAFE0' : '#5FB45B');
    rrect(ctx, -r * 0.45, -r * 0.08, r * 0.9, r * 0.16, r * 0.04, '#D9A066');
    const oar = Math.sin(time * 2 + v * 5) * 0.4;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * oar);
      line(ctx, side * r * 0.3, 0, side * r * 0.95, r * 0.1, r * 0.06, '#C98A5A');
      ellipse(ctx, side * r * 1.0, r * 0.12, r * 0.08, r * 0.16, 0, '#C98A5A');
      ctx.restore();
    }
  },
};

export const urbain: Theme = {
  id: 'urbain',
  name: 'Parc urbain',
  blurb: 'Lampadaires, pigeons et barques au pied des tours',
  palette: {
    ...SPRING,
    bgTop: '#C9DDF5',
    bgMid: '#F3F1EC',
    bgBottom: '#CDE6C6',
    bokeh: ['160,190,230', '255,230,170', '200,220,200', '230,200,240'],
    bedShadow: 'rgba(110, 120, 150, 0.3)',
    tileShadow: 'rgba(80, 90, 110, 0.4)',
    soil: '#DDD5C8',
    soilLight: '#EAE4DA',
    soilDark: '#CBC1B2',
    soilSide: '#B9AE9E',
    soilSideDark: '#A79B8B',
    pebble: '#F6F2EC',
    pebbleShade: '#B5AA9A',
    grass: '#92D27E',
    grassLight: '#B0E09A',
    grassDark: '#78C266',
    grassDeep: '#5AA852',
    grassSide: '#6CB65E',
    grassSideDark: '#5CA252',
    rim: '#FAF8F4',
    rimShade: '#B8AC9C',
    groove: '#CFC4B4',
    grooveDeep: '#BDB0A0',
    water: '#6CC6F0',
    waterDeep: '#40A8E2',
    petals: ['#FF8FB6', '#FFD45A', '#FFFFFF', '#FF7A6B', '#B9A0F2', '#8DC8FF'],
    centers: ['#FFC83A', '#FFFFFF'],
  },
  ambient: 'leaves',
  ambientColors: ['#9CD47A', '#FFC94D', '#B5DC8A'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    lamp,
    benchProp('park-bench', '#C98A5A', IRON, 2),
    bike,
    cart,
    pigeons,
    hydrant,
    treeProp('planter-tree', { foliage: ['#6FC266', '#5FB45B', '#86CF72'], trunk: '#7A5547', pot: '#B8AC9C' }, 2),
    fountain,
    bridgeProp('stone-bridge', { deck: '#EDE6DA', deckShade: '#CFC5B5', side: '#BFB4A2', rail: '#F7F2EA', cap: '#D9CFBF', hump: 0.07 }),
    rowboat,
  ],
  dryGround(ctx, g) {
    // Paving stones.
    for (let k = 0; k < 5; k++) {
      const x = (g.rnd[k] - 0.5) * 0.75;
      const y = (g.rnd[(k + 2) % 6] - 0.5) * 0.75;
      rrect(ctx, x - 0.05, y - 0.035, 0.1, 0.07, 0.02, k % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(150,140,125,0.22)');
    }
  },
  scenery(ctx, w, h) {
    skyline(ctx, w, h * 0.875, '#D2DBEA', undefined, 5);
    skyline(ctx, w, h * 0.9, '#B7C5DA', 'rgba(255, 243, 196, 0.85)');
    hill(ctx, w, h, h * 0.9, 8, 'rgba(150, 205, 140, 0.95)', 0.8);
    for (let k = 0; k < 8; k++) {
      roundTree(ctx, w * (0.04 + k * 0.135), h * (0.92 + Math.sin(k * 1.7) * 0.01), 0.8 + (k % 3) * 0.15, '#7CC06C', '#8A6A55');
    }
    hill(ctx, w, h, h * 0.95, 8, 'rgba(126, 190, 116, 0.95)', 2.4);
  },
};
