/** Mountain pasture: firs, chalets, marmots, ibexes, cows with bells, cairns and edelweiss. */
import { SPRING } from '../palette';
import { pineProp, plankBridge, rockProp } from './common';
import { circle, ellipse, eyes, groundShadow, line, poly, rrect, star, TAU } from './kit';
import { hill, mountain, pineSilhouette } from './scenery';
import type { PropDef, Theme } from './types';

const chalet: PropDef = {
  id: 'chalet',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.85);
    rrect(ctx, -r * 0.7, r * 0.45, r * 1.4, r * 0.5, r * 0.04, '#D9D2C8');
    rrect(ctx, -r * 0.65, -r * 0.3, r * 1.3, r * 0.8, r * 0.04, '#C98A5A');
    for (let k = 0; k < 4; k++) line(ctx, -r * 0.65, -r * 0.2 + k * r * 0.2, r * 0.65, -r * 0.2 + k * r * 0.2, r * 0.03, '#B07444');
    poly(ctx, [-r * 0.95, -r * 0.2, 0, -r * 0.85, r * 0.95, -r * 0.2], '#8A5A3A');
    poly(ctx, [-r * 0.85, -r * 0.25, 0, -r * 0.82, r * 0.85, -r * 0.25, r * 0.7, -r * 0.25, 0, -r * 0.7, -r * 0.7, -r * 0.25], '#FFFFFF');
    // Balcony with flower boxes.
    rrect(ctx, -r * 0.7, r * 0.1, r * 1.4, r * 0.1, r * 0.02, '#8A5A3A');
    for (let k = 0; k < 7; k++) line(ctx, -r * 0.6 + k * r * 0.2, r * 0.2, -r * 0.6 + k * r * 0.2, r * 0.38, r * 0.04, '#8A5A3A');
    rrect(ctx, -r * 0.6, r * 0.02, r * 0.4, r * 0.1, r * 0.03, '#A86A3E');
    rrect(ctx, r * 0.2, r * 0.02, r * 0.4, r * 0.1, r * 0.03, '#A86A3E');
    if (bloom > 0.3) for (let k = 0; k < 6; k++) circle(ctx, -r * 0.55 + k * r * 0.08 + (k > 2 ? r * 0.56 : 0), 0, r * 0.05, k % 2 ? '#FF5A6E' : '#FF8FB6');
    rrect(ctx, -r * 0.35, -r * 0.25, r * 0.22, r * 0.2, r * 0.02, bloom > 0.5 ? '#FFE9A0' : '#CFE6F2');
    rrect(ctx, r * 0.13, -r * 0.25, r * 0.22, r * 0.2, r * 0.02, bloom > 0.5 ? '#FFE9A0' : '#CFE6F2');
    rrect(ctx, -r * 0.15, r * 0.55, r * 0.3, r * 0.4, r * 0.04, '#8A5A3A');
  },
};

const marmot: PropDef = {
  id: 'marmot',
  place: 'ground',
  size: [0.05, 0.07],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    const fur = '#B98A5E';
    groundShadow(ctx, 0, r * 0.92, r * 0.45);
    ellipse(ctx, 0, r * 0.95, r * 0.5, r * 0.15, 0, '#8A7A6A');
    ellipse(ctx, 0, r * 0.4, r * 0.38, r * 0.55, 0, fur);
    ellipse(ctx, 0, r * 0.48, r * 0.22, r * 0.38, 0, '#E3C8A0');
    circle(ctx, 0, -r * 0.3, r * 0.28, fur);
    circle(ctx, -r * 0.2, -r * 0.5, r * 0.08, fur);
    circle(ctx, r * 0.2, -r * 0.5, r * 0.08, fur);
    ellipse(ctx, 0, -r * 0.18, r * 0.15, r * 0.1, 0, '#E3C8A0');
    eyes(ctx, 0, -r * 0.33, r * 0.12, r * 0.04);
    circle(ctx, 0, -r * 0.22, r * 0.04, '#3E3440');
    rrect(ctx, -r * 0.05, -r * 0.14, r * 0.1, r * 0.07, r * 0.02, '#FFFFFF');
    line(ctx, -r * 0.25, r * 0.1, -r * 0.1, r * 0.2, r * 0.08, '#A67A50');
    line(ctx, r * 0.25, r * 0.1, r * 0.1, r * 0.2, r * 0.08, '#A67A50');
  },
};

const ibex: PropDef = {
  id: 'ibex',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const coat = '#B8A288';
    // Standing proudly on a rock.
    ellipse(ctx, 0, r * 0.78, r * 0.65, r * 0.25, 0, '#C9C3BE');
    ellipse(ctx, -r * 0.1, r * 0.7, r * 0.4, r * 0.1, 0, '#E3DFDA');
    for (const x of [-0.35, -0.18, 0.12, 0.28]) rrect(ctx, x * r - r * 0.04, r * 0.2, r * 0.08, r * 0.5, r * 0.03, '#8E7A64');
    ellipse(ctx, -r * 0.05, r * 0.15, r * 0.42, r * 0.22, 0, coat);
    rrect(ctx, r * 0.2, -r * 0.3, r * 0.16, r * 0.45, r * 0.06, coat);
    ellipse(ctx, r * 0.38, -r * 0.33, r * 0.18, r * 0.11, 0.4, coat);
    poly(ctx, [r * 0.42, -r * 0.25, r * 0.48, -r * 0.08, r * 0.36, -r * 0.2], '#8E7A64');
    circle(ctx, r * 0.36, -r * 0.37, r * 0.03, '#2E2428');
    // Long ridged horns sweeping back.
    ctx.strokeStyle = '#7A6A58';
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.15, -r * 1.0, -r * 0.25, -r * 0.85);
    ctx.stroke();
    ctx.strokeStyle = '#9A8A76';
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    for (const t of [0.3, 0.5, 0.7]) {
      const x = r * (0.3 - t * 0.5);
      const y = -r * (0.42 + Math.sin(t * Math.PI) * 0.45);
      ctx.moveTo(x - r * 0.04, y);
      ctx.lineTo(x + r * 0.04, y);
    }
    ctx.stroke();
  },
};

const cow: PropDef = {
  id: 'cow',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const coat = v > 0.25 && v < 0.75 ? '#C98A5A' : '#FFFFFF';
    groundShadow(ctx, 0, r * 0.9, r * 0.75);
    for (const x of [-0.45, -0.25, 0.15, 0.32]) rrect(ctx, x * r - r * 0.06, r * 0.3, r * 0.12, r * 0.6, r * 0.04, '#E8DCD0');
    ellipse(ctx, -r * 0.05, r * 0.2, r * 0.55, r * 0.32, 0, coat);
    circle(ctx, -r * 0.25, r * 0.1, r * 0.15, '#8A5A3A');
    circle(ctx, r * 0.1, r * 0.3, r * 0.1, '#8A5A3A');
    ellipse(ctx, r * 0.55, -r * 0.05, r * 0.2, r * 0.24, 0, coat);
    ellipse(ctx, r * 0.62, r * 0.12, r * 0.14, r * 0.1, 0, '#FFC1C9');
    circle(ctx, r * 0.58, -r * 0.1, r * 0.035, '#3E3440');
    line(ctx, r * 0.45, -r * 0.25, r * 0.4, -r * 0.4, r * 0.05, '#E8DCC8');
    line(ctx, r * 0.65, -r * 0.25, r * 0.72, -r * 0.4, r * 0.05, '#E8DCC8');
    line(ctx, -r * 0.6, r * 0.12, -r * 0.7, r * 0.45, r * 0.04, coat);
    // Bell on a red strap.
    line(ctx, r * 0.4, r * 0.1, r * 0.55, r * 0.2, r * 0.06, '#E8414F');
    poly(ctx, [r * 0.42, r * 0.2, r * 0.52, r * 0.2, r * 0.56, r * 0.38, r * 0.38, r * 0.38], '#FFC93A');
  },
};

const cairn: PropDef = {
  id: 'cairn',
  place: 'ground',
  size: [0.05, 0.07],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.6);
    for (const [y, rx, ry, c] of [
      [0.7, 0.6, 0.25, '#B8B2AC'],
      [0.32, 0.48, 0.2, '#CFC9C3'],
      [-0.02, 0.36, 0.17, '#BCB6B0'],
      [-0.3, 0.26, 0.14, '#D9D4CE'],
      [-0.52, 0.16, 0.1, '#C4BEB8'],
    ] as const) {
      ellipse(ctx, 0, y * r, rx * r, ry * r, 0, c);
      ellipse(ctx, -rx * r * 0.3, y * r - ry * r * 0.4, rx * r * 0.4, ry * r * 0.3, 0, 'rgba(255,255,255,0.3)');
    }
  },
};

const edelweiss: PropDef = {
  id: 'edelweiss',
  place: 'ground',
  size: [0.05, 0.07],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    for (const [x, y, s] of [[-0.4, -0.2, 0.5], [0.35, 0.1, 0.45], [-0.05, 0.4, 0.4]]) {
      ctx.save();
      ctx.translate(x * r, y * r);
      ctx.rotate(v * TAU + x);
      star(ctx, 0, 0, s * r, 6, 0.4, '#FFFFFF');
      star(ctx, 0, 0, s * r * 0.75, 6, 0.4, '#F2F4E8', 0.5);
      circle(ctx, 0, 0, s * r * 0.25, '#E8E070');
      ctx.restore();
    }
  },
};

export const montagne: Theme = {
  id: 'montagne',
  name: 'Montagne',
  blurb: 'Chalets, marmottes et bouquetins',
  palette: {
    ...SPRING,
    bgTop: '#C4E2FF',
    bgMid: '#F0F7FF',
    bgBottom: '#C8EAC8',
    bokeh: ['160,205,255', '210,235,255', '180,230,180', '255,240,200'],
    bedShadow: 'rgba(100, 140, 170, 0.3)',
    tileShadow: 'rgba(80, 100, 120, 0.4)',
    soil: '#DCCDB8',
    soilLight: '#E9DECE',
    soilDark: '#CBB9A0',
    soilSide: '#B9A68C',
    soilSideDark: '#A6927A',
    pebble: '#F6F2EE',
    pebbleShade: '#B5A690',
    grass: '#9AD88A',
    grassLight: '#B8E6A8',
    grassDark: '#7EC870',
    grassDeep: '#5CAE58',
    grassSide: '#72BC66',
    grassSideDark: '#62AA5A',
    rim: '#FFFFFF',
    rimShade: '#B8A890',
    groove: '#CFC0A8',
    grooveDeep: '#BDAC92',
    water: '#7AD6F2',
    waterDeep: '#48BEE8',
    petals: ['#FFFFFF', '#5C8DE8', '#FF8FB6', '#FFD45A', '#B9A0F2'],
    centers: ['#FFE07A', '#FFFFFF'],
    lotus: ['#FFFFFF', '#E3F0FF', '#FFE4F0'],
  },
  ambient: 'pollen',
  ambientColors: ['#FFFFFF', '#E6F3FF', '#FFF8DC'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    pineProp('fir', '#3F8F6A', '#55A67D', 4),
    chalet,
    marmot,
    ibex,
    cow,
    cairn,
    edelweiss,
    rockProp('#CFCBC6', '#AEA8A2', '#EFEDEA', '#9AD88A'),
    plankBridge('#C98A5A', '#B57846', '#8A5A3A'),
  ],
  smallFlower(ctx, r, color, center) {
    if (color === '#5C8DE8') {
      // Gentian bell.
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        ctx.lineTo(Math.cos(a + 0.63) * r * 0.5, Math.sin(a + 0.63) * r * 0.5);
      }
      ctx.closePath();
      ctx.fill();
      circle(ctx, 0, 0, r * 0.25, '#FFFFFF');
      return;
    }
    star(ctx, 0, 0, r, 6, 0.45, color);
    circle(ctx, 0, 0, r * 0.3, center);
  },
  scenery(ctx, w, h) {
    mountain(ctx, w * 0.2, h * 0.93, w * 0.7, h * 0.29, '#AFC6E6', '#FFFFFF');
    mountain(ctx, w * 0.62, h * 0.93, w * 0.8, h * 0.35, '#9FB9DE', '#FFFFFF');
    mountain(ctx, w * 0.95, h * 0.93, w * 0.5, h * 0.21, '#B8CDE8', '#FFFFFF');
    for (let k = 0; k < 6; k++) {
      pineSilhouette(ctx, w * (0.08 + k * 0.17), h * (0.905 + Math.sin(k * 2.7) * 0.01), 0.6 + (k % 2) * 0.25, '#5E9E7A');
    }
    hill(ctx, w, h, h * 0.9, 10, '#A6D99A', 0.9);
    hill(ctx, w, h, h * 0.95, 10, 'rgba(130, 200, 120, 0.95)', 2.8);
  },
};
