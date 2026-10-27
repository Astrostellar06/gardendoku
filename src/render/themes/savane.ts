/** Savanna: cracked ochre earth, golden grass, acacias, baobabs, giraffes and meerkats. */
import { SPRING } from '../palette';
import { plankBridge, rockProp } from './common';
import { circle, ellipse, groundShadow, line, poly, rrect } from './kit';
import { acaciaSilhouette, sun } from './scenery';
import type { PropDef, Theme } from './types';

const acacia: PropDef = {
  id: 'acacia',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    ctx.strokeStyle = '#8A6248';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.lineTo(0, r * 0.1);
    ctx.lineTo(-r * 0.4, -r * 0.3);
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(r * 0.45, -r * 0.35);
    ctx.stroke();
    const leaf = bloom > 0.5 ? '#7FA846' : '#A3A35A';
    const light = bloom > 0.5 ? '#9CC25A' : '#BDB86E';
    ellipse(ctx, 0, -r * 0.5, r * 0.98, r * 0.26, 0, leaf);
    ellipse(ctx, -r * 0.45, -r * 0.42, r * 0.45, r * 0.18, 0, leaf);
    ellipse(ctx, r * 0.5, -r * 0.44, r * 0.45, r * 0.18, 0, leaf);
    ellipse(ctx, -r * 0.1, -r * 0.6, r * 0.6, r * 0.12, 0, light);
  },
};

const baobab: PropDef = {
  id: 'baobab',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    ctx.fillStyle = '#B98A6A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.5, 0, -r * 0.18, -r * 0.45);
    ctx.lineTo(r * 0.18, -r * 0.45);
    ctx.quadraticCurveTo(r * 0.5, 0, r * 0.4, r * 0.95);
    ctx.closePath();
    ctx.fill();
    rrect(ctx, -r * 0.3, -r * 0.1, r * 0.12, r * 0.9, r * 0.06, 'rgba(255,255,255,0.18)');
    ctx.strokeStyle = '#A67A5A';
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, y] of [
      [-0.5, -0.75],
      [-0.15, -0.85],
      [0.2, -0.82],
      [0.5, -0.7],
    ]) {
      ctx.moveTo(0, -r * 0.42);
      ctx.lineTo(x * r, y * r);
    }
    ctx.stroke();
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, bloom);
      for (const [x, y] of [
        [-0.5, -0.78],
        [-0.15, -0.9],
        [0.2, -0.86],
        [0.5, -0.74],
      ]) {
        circle(ctx, x * r, y * r, r * 0.16, '#86A84A');
      }
      ctx.globalAlpha = 1;
    }
  },
};

const termiteMound: PropDef = {
  id: 'termite-mound',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.6);
    ctx.fillStyle = '#C98A58';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 0.92);
    ctx.quadraticCurveTo(-r * 0.45, -r * 0.2, -r * 0.12, -r * 0.92);
    ctx.quadraticCurveTo(0, -r * 1.0, r * 0.12, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.6, r * 0.92);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, r * 0.32, r * 0.2, r * 0.22, r * 0.4, 0.2, '#B87A4A');
    ellipse(ctx, -r * 0.2, -r * 0.2, r * 0.07, r * 0.25, 0.1, 'rgba(255,255,255,0.2)');
  },
};

const giraffe: PropDef = {
  id: 'giraffe',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    ctx.scale(dir, 1);
    const coat = '#FFC75A';
    const spot = '#D98A3A';
    groundShadow(ctx, -r * 0.1, r * 0.95, r * 0.5);
    for (const x of [-r * 0.4, -r * 0.2, r * 0.05, r * 0.22]) rrect(ctx, x - r * 0.05, r * 0.3, r * 0.1, r * 0.65, r * 0.04, coat);
    ellipse(ctx, -r * 0.1, r * 0.25, r * 0.42, r * 0.24, 0, coat);
    // Neck and head.
    ctx.strokeStyle = coat;
    ctx.lineWidth = r * 0.17;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.18, r * 0.15);
    ctx.lineTo(r * 0.38, -r * 0.6);
    ctx.stroke();
    ellipse(ctx, r * 0.5, -r * 0.7, r * 0.22, r * 0.13, 0.4, coat);
    line(ctx, r * 0.35, -r * 0.78, r * 0.32, -r * 0.95, r * 0.05, '#B8763A');
    line(ctx, r * 0.45, -r * 0.8, r * 0.46, -r * 0.97, r * 0.05, '#B8763A');
    circle(ctx, r * 0.47, -r * 0.74, r * 0.04, '#3E3440');
    for (const [x, y, s] of [
      [-0.3, 0.2, 0.09],
      [0.0, 0.18, 0.08],
      [-0.15, 0.32, 0.06],
      [0.26, -0.2, 0.06],
      [0.32, -0.45, 0.05],
    ]) {
      circle(ctx, x * r, y * r, s * r, spot);
    }
    line(ctx, -r * 0.5, r * 0.2, -r * 0.62, r * 0.45, r * 0.04, spot);
  },
};

const meerkat: PropDef = {
  id: 'meerkat',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v2 }) {
    const two = v2 > 0.5;
    const one = (x: number, s: number) => {
      groundShadow(ctx, x, r * 0.92, r * 0.3 * s);
      ellipse(ctx, x, r * 0.35, r * 0.25 * s, r * 0.58 * s, 0, '#D9B07A');
      ellipse(ctx, x, r * 0.42, r * 0.14 * s, r * 0.38 * s, 0, '#F1D7A8');
      circle(ctx, x, -r * 0.35 * s, r * 0.2 * s, '#D9B07A');
      ellipse(ctx, x - r * 0.08 * s, -r * 0.37 * s, r * 0.06 * s, r * 0.05 * s, 0, '#5A4048');
      ellipse(ctx, x + r * 0.08 * s, -r * 0.37 * s, r * 0.06 * s, r * 0.05 * s, 0, '#5A4048');
      circle(ctx, x, -r * 0.27 * s, r * 0.04 * s, '#3E3440');
      line(ctx, x - r * 0.18 * s, r * 0.1, x - r * 0.08 * s, r * 0.25, r * 0.07 * s, '#C79A66');
      line(ctx, x + r * 0.18 * s, r * 0.1, x + r * 0.08 * s, r * 0.25, r * 0.07 * s, '#C79A66');
    };
    one(two ? -r * 0.35 : 0, 1);
    if (two) one(r * 0.4, 0.85);
  },
};

const elephant: PropDef = {
  id: 'elephant',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    ctx.scale(dir, 1);
    const skin = '#B5B3C8';
    groundShadow(ctx, 0, r * 0.88, r * 0.75);
    for (const x of [-r * 0.5, -r * 0.2, r * 0.15]) rrect(ctx, x - r * 0.1, r * 0.3, r * 0.22, r * 0.55, r * 0.08, skin);
    ellipse(ctx, -r * 0.15, r * 0.15, r * 0.58, r * 0.4, 0, skin);
    circle(ctx, r * 0.42, -r * 0.1, r * 0.33, skin);
    ellipse(ctx, r * 0.22, -r * 0.08, r * 0.22, r * 0.3, 0.2, '#C9C7DA');
    ctx.strokeStyle = skin;
    ctx.lineWidth = r * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.68, -r * 0.02);
    ctx.quadraticCurveTo(r * 0.85, r * 0.35, r * 0.7, r * 0.5);
    ctx.stroke();
    circle(ctx, r * 0.5, -r * 0.18, r * 0.05, '#3E3440');
    circle(ctx, r * 0.55, -r * 0.02, r * 0.06, 'rgba(255,150,170,0.55)');
  },
};

const tallGrass: PropDef = {
  id: 'tall-grass',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.6);
    for (let k = -3; k <= 3; k++) {
      const x = k * r * 0.13;
      ctx.strokeStyle = k % 2 ? '#D9B04A' : '#C99A38';
      ctx.lineWidth = r * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, r * 0.9);
      ctx.quadraticCurveTo(x + k * r * 0.05, 0, x + k * r * 0.15, -r * (0.8 - Math.abs(k) * 0.08));
      ctx.stroke();
    }
  },
};

const hippo: PropDef = {
  id: 'hippo',
  place: 'water',
  size: [0.055, 0.065],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r }) {
    // Only the top of the head peeks out of the water.
    ellipse(ctx, 0, 0, r * 0.6, r * 0.85, 0, '#9C93B8');
    ellipse(ctx, 0, r * 0.45, r * 0.5, r * 0.35, 0, '#B2AACB');
    circle(ctx, -r * 0.15, r * 0.6, r * 0.07, '#6A6284');
    circle(ctx, r * 0.15, r * 0.6, r * 0.07, '#6A6284');
    circle(ctx, -r * 0.28, -r * 0.1, r * 0.13, '#FFFFFF');
    circle(ctx, r * 0.28, -r * 0.1, r * 0.13, '#FFFFFF');
    circle(ctx, -r * 0.28, -r * 0.08, r * 0.07, '#3E3440');
    circle(ctx, r * 0.28, -r * 0.08, r * 0.07, '#3E3440');
    circle(ctx, -r * 0.35, -r * 0.62, r * 0.12, '#9C93B8');
    circle(ctx, r * 0.35, -r * 0.62, r * 0.12, '#9C93B8');
  },
};

export const savane: Theme = {
  id: 'savane',
  palette: {
    ...SPRING,
    bgTop: '#FFE0A3',
    bgMid: '#FFF2D3',
    bgBottom: '#F1D9A2',
    bokeh: ['255,200,110', '255,225,150', '250,170,100', '255,240,190'],
    bedShadow: 'rgba(200, 140, 70, 0.3)',
    tileShadow: 'rgba(150, 100, 50, 0.4)',
    soil: '#E9B47E',
    soilLight: '#F3CA98',
    soilDark: '#D99E68',
    soilSide: '#CB8955',
    soilSideDark: '#B87843',
    pebble: '#FAE3C2',
    pebbleShade: '#C99464',
    grass: '#CDD66C',
    grassLight: '#DFE58C',
    grassDark: '#B7C259',
    grassDeep: '#8E9C3B',
    grassSide: '#A9B34D',
    grassSideDark: '#949E40',
    rim: '#FFF5E2',
    rimShade: '#C69766',
    groove: '#D6A36E',
    grooveDeep: '#C28C57',
    water: '#5EC6E8',
    waterDeep: '#33A6D4',
    petals: ['#FFD045', '#FF9F43', '#FFFFFF', '#F7B2D0', '#FFE38A'],
    centers: ['#FFB13A', '#8A5A3A'],
    lotus: ['#FFE066', '#FFFFFF', '#FFC0D9'],
    lily: '#9CC266',
    lilyDark: '#7FA64F',
  },
  ambient: 'pollen',
  ambientColors: ['#FFE38A', '#FFF2C2', '#FFD45A'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.35,
  props: [
    acacia,
    baobab,
    termiteMound,
    giraffe,
    meerkat,
    elephant,
    tallGrass,
    rockProp('#D9B58E', '#B8926A', '#F1DCC0'),
    plankBridge('#C98A5A', '#B57846', '#8A6248'),
    hippo,
  ],
  dryGround(ctx, g) {
    // Sun-cracked earth.
    ctx.strokeStyle = 'rgba(160, 100, 60, 0.35)';
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      let x = (g.rnd[k] - 0.5) * 0.8;
      let y = (g.rnd[(k + 1) % 6] - 0.5) * 0.8;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += Math.cos(k * 1.7 + s * 1.3) * 0.06;
        y += Math.sin(k * 2.3 + s * 0.9) * 0.06;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  },
  tuft(ctx, s) {
    ctx.strokeStyle = '#B9963A';
    ctx.lineWidth = 0.014;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(k * s * 0.08, s * 0.4);
      ctx.quadraticCurveTo(k * s * 0.15, -s * 0.1, k * s * 0.3, -s * 0.75);
    }
    ctx.stroke();
  },
  scenery(ctx, w, h) {
    sun(ctx, w * 0.78, h * 0.14, Math.min(w, h) * 0.07, 'rgba(255, 236, 170, ALPHA)');
    ctx.fillStyle = 'rgba(232, 196, 120, 0.8)';
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    poly(ctx, [0, h * 0.9, w, h * 0.88, w, h, 0, h], 'rgba(226, 186, 108, 0.85)');
    acaciaSilhouette(ctx, w * 0.15, h * 0.9, 1, '#CDAA7A');
    acaciaSilhouette(ctx, w * 0.62, h * 0.89, 0.7, '#D8BA8C');
    acaciaSilhouette(ctx, w * 0.9, h * 0.9, 0.85, '#D2B283');
  },
};
