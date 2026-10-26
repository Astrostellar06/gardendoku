/** Canyon: layered red rock, hoodoos, natural arches, junipers, bighorn sheep and canoes. */
import { SPRING } from '../palette';
import { plankBridge, rockProp, swimOffset } from './common';
import { circle, ellipse, glow, groundShadow, line, poly, rrect } from './kit';
import { mesas, sun } from './scenery';
import type { PropDef, Theme } from './types';

const ROCK = '#D9825C';
const ROCK_DARK = '#B8673F';
const ROCK_LIGHT = '#F0A27A';

/** Horizontal strata across a rock shape already drawn as the current path. */
function strata(ctx: CanvasRenderingContext2D, top: number, bottom: number, w: number, color: string) {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = w * 0.06;
  ctx.beginPath();
  for (let y = top; y < bottom; y += w * 0.22) {
    ctx.moveTo(-w, y);
    ctx.lineTo(w, y + w * 0.04);
  }
  ctx.stroke();
  ctx.restore();
}

const hoodoo: PropDef = {
  id: 'hoodoo',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.45);
    const tall = 0.8 + v * 0.3;
    ctx.fillStyle = ROCK;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.2, r * 0.4, -r * 0.3, 0);
    ctx.quadraticCurveTo(-r * 0.12, -r * 0.4 * tall, -r * 0.22, -r * 0.7 * tall);
    ctx.lineTo(r * 0.22, -r * 0.7 * tall);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.4 * tall, r * 0.3, 0);
    ctx.quadraticCurveTo(r * 0.2, r * 0.4, r * 0.42, r * 0.95);
    ctx.closePath();
    ctx.fill();
    strata(ctx, -r * tall, r, r, 'rgba(255,220,190,0.35)');
    ellipse(ctx, r * 0.18, r * 0.3, r * 0.1, r * 0.5, 0, 'rgba(150,70,40,0.25)');
    // Cap stone.
    ellipse(ctx, 0, -r * 0.74 * tall, r * 0.36, r * 0.13, 0, '#C9B49A');
    ellipse(ctx, -r * 0.05, -r * 0.78 * tall, r * 0.22, r * 0.06, 0, '#E3D2BA');
  },
};

const arch: PropDef = {
  id: 'rock-arch',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.8);
    ctx.fillStyle = ROCK;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.4, -r * 0.4, -r * 0.6);
    ctx.quadraticCurveTo(0, -r * 0.75, r * 0.45, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.35, r * 0.85, r * 0.95);
    ctx.lineTo(r * 0.45, r * 0.95);
    ctx.quadraticCurveTo(r * 0.45, -r * 0.2, 0, -r * 0.25);
    ctx.quadraticCurveTo(-r * 0.45, -r * 0.2, -r * 0.45, r * 0.95);
    ctx.closePath();
    ctx.fill();
    strata(ctx, -r, r, r, 'rgba(255,220,190,0.3)');
    ctx.fillStyle = ROCK_LIGHT;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.48);
    ctx.quadraticCurveTo(0, -r * 0.72, r * 0.55, -r * 0.45);
    ctx.quadraticCurveTo(0, -r * 0.6, -r * 0.6, -r * 0.48);
    ctx.fill();
  },
};

const juniper: PropDef = {
  id: 'juniper',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    ctx.strokeStyle = '#8A6248';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.25, r * 0.4, r * 0.05, 0);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.1, -r * 0.5);
    ctx.moveTo(r * 0.05, 0);
    ctx.lineTo(-r * 0.4, -r * 0.3);
    ctx.stroke();
    const c = bloom > 0.5 ? '#6E9E6A' : '#8FA07A';
    const light = bloom > 0.5 ? '#88B884' : '#A6B592';
    for (const [x, y, s] of [
      [-0.45, -0.38, 0.28],
      [0.1, -0.6, 0.34],
      [0.45, -0.3, 0.25],
      [-0.1, -0.25, 0.22],
    ]) {
      circle(ctx, x * r, y * r, s * r, c);
      circle(ctx, x * r - s * r * 0.3, y * r - s * r * 0.3, s * r * 0.45, light);
    }
    if (bloom > 0.4) for (const [x, y] of [[-0.35, -0.5], [0.25, -0.7], [0.4, -0.2]]) circle(ctx, x * r, y * r, r * 0.05, '#8CA8D8');
  },
};

const sagebrush: PropDef = {
  id: 'sagebrush',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.85, r * 0.7);
    for (const [x, y, s] of [
      [-0.4, 0.3, 0.35],
      [0.35, 0.35, 0.32],
      [0, 0.05, 0.42],
      [-0.15, 0.45, 0.3],
      [0.2, 0.5, 0.28],
    ]) {
      circle(ctx, x * r, y * r, s * r, '#A8B898');
      circle(ctx, x * r - s * r * 0.25, y * r - s * r * 0.3, s * r * 0.5, '#C2D0B2');
    }
    for (const [x, y] of [[-0.3, 0.05], [0.2, -0.2], [0.45, 0.2]]) circle(ctx, x * r, y * r, r * 0.06, '#FFD45A');
  },
};

const bighorn: PropDef = {
  id: 'bighorn',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const coat = '#C9A27A';
    groundShadow(ctx, 0, r * 0.92, r * 0.6);
    for (const x of [-0.42, -0.22, 0.12, 0.3]) rrect(ctx, x * r - r * 0.05, r * 0.3, r * 0.1, r * 0.62, r * 0.04, '#A8845E');
    ellipse(ctx, -r * 0.05, r * 0.2, r * 0.5, r * 0.3, 0, coat);
    ellipse(ctx, -r * 0.5, r * 0.15, r * 0.12, r * 0.14, 0, '#F2E6D4');
    rrect(ctx, r * 0.25, -r * 0.3, r * 0.2, r * 0.5, r * 0.08, coat);
    ellipse(ctx, r * 0.45, -r * 0.35, r * 0.22, r * 0.15, 0.3, coat);
    ellipse(ctx, r * 0.6, -r * 0.28, r * 0.08, r * 0.07, 0, '#F2E6D4');
    // Curled horn.
    ctx.strokeStyle = '#E8D3B0';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.4, r * 0.18, -Math.PI * 0.9, Math.PI * 0.6);
    ctx.stroke();
    circle(ctx, r * 0.47, -r * 0.42, r * 0.04, '#3E3440');
  },
};

const camp: PropDef = {
  id: 'camp',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, -r * 0.15, r * 0.9, r * 0.75);
    poly(ctx, [-r * 0.9, r * 0.9, -r * 0.25, -r * 0.4, r * 0.35, r * 0.9], '#5EAFC9');
    poly(ctx, [-r * 0.25, -r * 0.4, r * 0.35, r * 0.9, r * 0.05, r * 0.9], '#4A93AD');
    poly(ctx, [-r * 0.45, r * 0.9, -r * 0.25, r * 0.2, -r * 0.05, r * 0.9], '#2F6E86');
    line(ctx, -r * 0.25, -r * 0.4, -r * 0.25, -r * 0.55, r * 0.04, '#8A6248');
    // Campfire, lit with the water.
    for (const [x1, x2] of [[0.45, 0.85], [0.85, 0.45]]) line(ctx, x1 * r, r * 0.92, x2 * r, r * 0.75, r * 0.07, '#8A6248');
    if (bloom > 0.3) {
      glow(ctx, r * 0.65, r * 0.65, r * 0.5, '255,170,80', bloom * 0.5);
      poly(ctx, [r * 0.48, r * 0.82, r * 0.65, r * 0.35, r * 0.82, r * 0.82], '#FF9F43');
      poly(ctx, [r * 0.56, r * 0.82, r * 0.65, r * 0.55, r * 0.74, r * 0.82], '#FFD45A');
    }
  },
};

const canoe: PropDef = {
  id: 'canoe',
  place: 'water',
  size: [0.05, 0.06],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y } = swimOffset(time * 0.5, v, 0.06);
    ctx.translate(0, y);
    ellipse(ctx, 0.004, 0.006, r * 0.48, r * 1.15, 0, 'rgba(30,70,90,0.2)');
    ellipse(ctx, 0, 0, r * 0.45, r * 1.15, 0, v > 0.5 ? '#E8553F' : '#F2B33D');
    ellipse(ctx, 0, 0, r * 0.3, r * 0.95, 0, '#8A5A3A');
    for (const yy of [-0.4, 0.4]) rrect(ctx, -r * 0.3, yy * r - r * 0.05, r * 0.6, r * 0.1, r * 0.03, '#C98A5A');
    line(ctx, -r * 0.6, -r * 0.1, r * 0.6, r * 0.15, r * 0.07, '#C98A5A');
    ellipse(ctx, r * 0.62, r * 0.16, r * 0.1, r * 0.2, 0.2, '#C98A5A');
  },
};

export const canyon: Theme = {
  id: 'canyon',
  name: 'Canyon',
  blurb: 'Roche rouge, arches et mouflons',
  palette: {
    ...SPRING,
    bgTop: '#FFC4A0',
    bgMid: '#FFE4CC',
    bgBottom: '#F4B38A',
    bokeh: ['255,170,120', '255,210,160', '240,140,100', '255,230,190'],
    bedShadow: 'rgba(200, 110, 70, 0.3)',
    tileShadow: 'rgba(150, 80, 50, 0.4)',
    soil: '#EBA37C',
    soilLight: '#F5BC96',
    soilDark: '#DC8C64',
    soilSide: '#CB7650',
    soilSideDark: '#B76441',
    pebble: '#FBE0CC',
    pebbleShade: '#C98262',
    grass: '#BBCB8C',
    grassLight: '#D0DDA5',
    grassDark: '#A2B676',
    grassDeep: '#7F9A5A',
    grassSide: '#95AA6C',
    grassSideDark: '#83985E',
    rim: '#FFF0E2',
    rimShade: '#C98664',
    groove: '#DA946C',
    grooveDeep: '#C47C56',
    water: '#4CCFD6',
    waterDeep: '#25AFC2',
    petals: ['#FF7A59', '#FFC94D', '#E85C9C', '#FFFFFF', '#FF9F43'],
    centers: ['#FFE07A', '#8A5A3A'],
    lotus: ['#FFE066', '#FFFFFF', '#FF9FB8'],
    lily: '#9CBF72',
    lilyDark: '#7FA35A',
  },
  ambient: 'sand',
  ambientColors: ['#FFD2A8', '#FFE6C8', '#F7B98A'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.35,
  props: [
    hoodoo,
    arch,
    juniper,
    sagebrush,
    bighorn,
    camp,
    rockProp(ROCK, ROCK_DARK, ROCK_LIGHT),
    plankBridge('#B8875A', '#A67648', '#7A5A3E'),
    canoe,
  ],
  dryGround(ctx, g) {
    // Layered sandstone.
    ctx.strokeStyle = 'rgba(190, 100, 60, 0.3)';
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const y = (g.rnd[k] - 0.5) * 0.8;
      ctx.moveTo(-0.4, y);
      ctx.quadraticCurveTo(0, y + (g.rnd[k + 3] - 0.5) * 0.1, 0.4, y + 0.02);
    }
    ctx.stroke();
  },
  scenery(ctx, w, h) {
    sun(ctx, w * 0.22, h * 0.13, Math.min(w, h) * 0.06, 'rgba(255, 230, 170, ALPHA)');
    mesas(ctx, w, h, ['#EFA884', '#E38E68', '#D27652'], 'rgba(255, 225, 195, 0.28)');
  },
};
