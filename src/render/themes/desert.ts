/** Desert & oasis: rippled sand, cacti, palm trees, clay jars and camels. */
import { SPRING } from '../palette';
import { bridgeProp, lilyPadsProp, rockProp } from './common';
import { circle, ellipse, groundShadow, leaf, line, rrect, TAU } from './kit';
import { dunes, sun } from './scenery';
import type { PropDef, Theme } from './types';

const CACTUS = '#6DBF7A';
const CACTUS_DARK = '#4FA663';

const saguaro: PropDef = {
  id: 'saguaro',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, v, bloom }) {
    const dir = v > 0.5 ? 1 : -1;
    groundShadow(ctx, 0, r * 0.95, r * 0.45);
    const arm = (x: number, y: number, up: number, side: number) => {
      ctx.strokeStyle = CACTUS;
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - up);
      ctx.stroke();
      line(ctx, x - side * r * 0.03, y - r * 0.05, x - side * r * 0.03, y - up, r * 0.04, CACTUS_DARK);
    };
    arm(dir * r * 0.42, r * 0.1, r * 0.45, dir);
    arm(-dir * r * 0.38, -r * 0.15, r * 0.35, -dir);
    rrect(ctx, -r * 0.17, -r * 0.85, r * 0.34, r * 1.8, r * 0.17, CACTUS);
    line(ctx, 0, -r * 0.7, 0, r * 0.9, r * 0.04, CACTUS_DARK);
    line(ctx, -r * 0.08, -r * 0.6, -r * 0.08, r * 0.9, r * 0.025, 'rgba(255,255,255,0.35)');
    if (bloom > 0.4) {
      ctx.globalAlpha = Math.min(1, (bloom - 0.4) * 2);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        ellipse(ctx, Math.cos(a) * r * 0.1, -r * 0.88 + Math.sin(a) * r * 0.1, r * 0.1, r * 0.07, a, '#FF8FB6');
      }
      circle(ctx, 0, -r * 0.88, r * 0.06, '#FFD45A');
      ctx.globalAlpha = 1;
    }
  },
};

const barrelCactus: PropDef = {
  id: 'barrel-cactus',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom, v }) {
    groundShadow(ctx, 0, r * 0.75, r * 0.75);
    ellipse(ctx, 0, r * 0.15, r * 0.7, r * 0.62, 0, CACTUS);
    for (const x of [-0.35, 0, 0.35]) {
      ctx.strokeStyle = CACTUS_DARK;
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, Math.abs(x) * r * 1.6 + 0.001, r * 0.6, 0, -Math.PI / 2, Math.PI / 2, x < 0);
      ctx.stroke();
    }
    if (bloom > 0.4) {
      const c = v > 0.5 ? '#FFD45A' : '#FF7A59';
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        ellipse(ctx, Math.cos(a) * r * 0.16, -r * 0.42 + Math.sin(a) * r * 0.1, r * 0.14, r * 0.08, a, c);
      }
      circle(ctx, 0, -r * 0.42, r * 0.07, '#FFF2B0');
    }
  },
};

const palm: PropDef = {
  id: 'palm',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    // Segmented curved trunk.
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      const x = dir * Math.sin(t * 1.6) * r * 0.25;
      const y = r * 0.9 - t * r * 1.35;
      ellipse(ctx, x, y, r * 0.12, r * 0.13, 0, k % 2 ? '#C99A66' : '#B8875A');
    }
    const top: [number, number] = [dir * r * 0.24, -r * 0.5];
    const fronds = [-2.4, -1.5, -0.6, 0.6, 1.5, 2.4];
    fronds.forEach((a, k) => leaf(ctx, top[0], top[1], r * 0.62, r * 0.17, a, k % 2 ? '#5DB86A' : '#4CA85E'));
    circle(ctx, top[0] - r * 0.08, top[1] + r * 0.06, r * 0.08, '#8A5A3A');
    circle(ctx, top[0] + r * 0.08, top[1] + r * 0.08, r * 0.08, '#9A6A48');
  },
};

const jar: PropDef = {
  id: 'clay-jar',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    const clay = v > 0.5 ? '#E58A5A' : '#D9774A';
    groundShadow(ctx, 0, r * 0.9, r * 0.5);
    ellipse(ctx, 0, r * 0.3, r * 0.55, r * 0.6, 0, clay);
    rrect(ctx, -r * 0.22, -r * 0.55, r * 0.44, r * 0.4, r * 0.08, clay);
    rrect(ctx, -r * 0.32, -r * 0.65, r * 0.64, r * 0.14, r * 0.07, '#C96A3E');
    rrect(ctx, -r * 0.55, r * 0.15, r * 1.1, r * 0.1, 0, '#F2C28A');
    ellipse(ctx, -r * 0.22, r * 0.25, r * 0.1, r * 0.3, 0, 'rgba(255,255,255,0.22)');
  },
};

const camel: PropDef = {
  id: 'camel',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    ctx.scale(dir, 1);
    const fur = '#E2B57A';
    groundShadow(ctx, 0, r * 0.95, r * 0.7);
    for (const x of [-r * 0.45, -r * 0.25, r * 0.15, r * 0.32]) rrect(ctx, x - r * 0.05, r * 0.2, r * 0.1, r * 0.75, r * 0.05, fur);
    ellipse(ctx, -r * 0.1, r * 0.15, r * 0.55, r * 0.25, 0, fur);
    circle(ctx, -r * 0.15, -r * 0.08, r * 0.24, fur);
    ctx.strokeStyle = fur;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.35, r * 0.1);
    ctx.quadraticCurveTo(r * 0.55, -r * 0.05, r * 0.52, -r * 0.4);
    ctx.stroke();
    ellipse(ctx, r * 0.62, -r * 0.45, r * 0.2, r * 0.12, 0.2, fur);
    circle(ctx, r * 0.62, -r * 0.5, r * 0.04, '#3E3440');
    // Colourful saddle blanket.
    rrect(ctx, -r * 0.35, -r * 0.05, r * 0.42, r * 0.22, r * 0.05, '#FF7A8A');
    rrect(ctx, -r * 0.35, r * 0.1, r * 0.42, r * 0.05, 0, '#FFD45A');
  },
};

const lizard: PropDef = {
  id: 'lizard',
  place: 'ground',
  size: [0.06, 0.07],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    const skin = '#7FCB8A';
    ctx.strokeStyle = skin;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.quadraticCurveTo(r * 0.1, r * 0.8, r * 0.5, r * 0.75);
    ctx.stroke();
    for (const [x, y, a] of [
      [-0.25, -0.15, -0.9],
      [0.25, -0.15, 0.9],
      [-0.22, 0.2, -2.2],
      [0.22, 0.2, 2.2],
    ]) {
      line(ctx, 0, y * r, x * r, y * r - Math.cos(a) * r * 0.15, r * 0.08, skin);
    }
    ellipse(ctx, 0, 0, r * 0.16, r * 0.38, 0, skin);
    ellipse(ctx, 0, -r * 0.48, r * 0.14, r * 0.17, 0, skin);
    circle(ctx, -r * 0.07, -r * 0.52, r * 0.035, '#3E3440');
    circle(ctx, r * 0.07, -r * 0.52, r * 0.035, '#3E3440');
    circle(ctx, 0, -r * 0.05, r * 0.05, '#FFD45A');
  },
};

const succulent: PropDef = {
  id: 'succulent',
  place: 'ground',
  size: [0.05, 0.07],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    for (let k = 0; k < 8; k++) leaf(ctx, 0, 0, r * 0.95, r * 0.28, (k / 8) * TAU, k % 2 ? '#8CC9B0' : '#79B8A0');
    for (let k = 0; k < 5; k++) leaf(ctx, 0, 0, r * 0.55, r * 0.2, (k / 5) * TAU + 0.3, '#A7DCC6');
    circle(ctx, 0, 0, r * 0.12, '#F2A8C4');
  },
};

const stoneSlab = bridgeProp('stone-slab', { deck: '#EFD3A0', deckShade: '#D4AE76', side: '#D9B27A', hump: 0.03 });

export const desert: Theme = {
  id: 'desert',
  name: 'Désert',
  blurb: 'Oasis, cactus, palmiers et chameaux',
  palette: {
    ...SPRING,
    bgTop: '#FFDDB3',
    bgMid: '#FFF1DC',
    bgBottom: '#FFDFB0',
    bokeh: ['255,200,130', '255,230,170', '255,170,120', '255,245,200'],
    bedShadow: 'rgba(210, 150, 80, 0.3)',
    tileShadow: 'rgba(170, 110, 50, 0.38)',
    soil: '#F6D59A',
    soilLight: '#FCE4B5',
    soilDark: '#EBC27E',
    soilSide: '#E0AE68',
    soilSideDark: '#CF9C56',
    pebble: '#FFF2D8',
    pebbleShade: '#D9AE6E',
    grass: '#9FD98A',
    grassLight: '#C1EAA5',
    grassDark: '#82C86F',
    grassDeep: '#4FA65A',
    grassSide: '#6FB862',
    grassSideDark: '#5CA552',
    rim: '#FFF8EA',
    rimShade: '#D4A46A',
    groove: '#E2B475',
    grooveDeep: '#CF9C5C',
    water: '#4FD3E0',
    waterDeep: '#22B3C8',
    petals: ['#FF8FB6', '#FFD45A', '#FF7A59', '#FFFFFF', '#C4A4F8'],
    lotus: ['#7FD3FF', '#FFFFFF', '#FF97BE'],
    lily: '#79C779',
    lilyDark: '#5CAE5E',
  },
  ambient: 'sand',
  ambientColors: ['#F2C98A', '#FFE2B0', '#E8B878'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.35,
  props: [
    saguaro,
    barrelCactus,
    palm,
    jar,
    camel,
    lizard,
    succulent,
    rockProp('#E9C8A0', '#C9A274', '#FBE7CC'),
    stoneSlab,
    lilyPadsProp('#7FD3FF'),
  ],
  dryGround(ctx, g) {
    // Wind ripples in the sand.
    ctx.save();
    ctx.rotate(g.rnd[0] * Math.PI);
    ctx.strokeStyle = 'rgba(210, 160, 90, 0.4)';
    ctx.lineWidth = 0.012;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      for (let x = -0.5; x <= 0.5; x += 0.05) {
        const y = k * 0.13 + Math.sin(x * 7 + k + g.rnd[1] * 5) * 0.03;
        if (x === -0.5) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  scenery(ctx, w, h) {
    sun(ctx, w * 0.2, h * 0.13, Math.min(w, h) * 0.07, 'rgba(255, 240, 190, ALPHA)');
    dunes(ctx, w, h, ['rgba(250, 210, 150, 0.85)', 'rgba(244, 196, 128, 0.9)', 'rgba(236, 182, 112, 0.95)']);
  },
};
