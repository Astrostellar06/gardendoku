/** Jungle: lush green, monstera leaves, hibiscus, toucans, tiki idols, turtles and crocodiles. */
import { grassFrom, SPRING } from '../palette';
import { plankBridge, rockProp, swimOffset } from './common';
import { circle, ellipse, groundShadow, leaf, line, poly, rrect, TAU } from './kit';
import { jungleLeaf } from './scenery';
import type { PropDef, Theme } from './types';

const monstera: PropDef = {
  id: 'monstera',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 3,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    ellipse(ctx, 0.01, 0.015, r * 0.85, r * 0.8, 0, 'rgba(20,60,30,0.2)');
    circle(ctx, 0, 0, r * 0.85, '#2F9450');
    // Splits and holes of the leaf.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.45;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = r * 0.09;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45);
      ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      ctx.stroke();
    }
    ctx.restore();
    line(ctx, 0, r * 0.85, 0, -r * 0.6, r * 0.06, '#5DBA6A');
    for (let k = 0; k < 3; k++) {
      line(ctx, 0, r * 0.2 - k * r * 0.25, -r * 0.55, -k * r * 0.25, r * 0.035, '#5DBA6A');
      line(ctx, 0, r * 0.2 - k * r * 0.25, r * 0.55, -k * r * 0.25, r * 0.035, '#5DBA6A');
    }
  },
};

const fern: PropDef = {
  id: 'fern',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    for (let f = 0; f < 5; f++) {
      const a = (f / 5) * TAU;
      ctx.save();
      ctx.rotate(a);
      line(ctx, 0, 0, 0, -r * 0.95, r * 0.05, '#3E9A55');
      for (let k = 1; k < 6; k++) {
        const y = -k * r * 0.17;
        const len = r * (0.3 - k * 0.04);
        leaf(ctx, 0, y, len, len * 0.3, 1.2, '#4FAE62');
        leaf(ctx, 0, y, len, len * 0.3, -1.2, '#4FAE62');
      }
      ctx.restore();
    }
  },
};

const hibiscus: PropDef = {
  id: 'hibiscus',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    const c = ['#FF5E7E', '#FF9F43', '#FF7AC6', '#FFD45A'][Math.floor(v * 4)];
    ctx.rotate(v * TAU);
    leaf(ctx, 0, 0, r * 1.0, r * 0.35, 2.4, '#3E9A55');
    leaf(ctx, 0, 0, r * 0.9, r * 0.3, -2.2, '#2F9450');
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ellipse(ctx, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.42, r * 0.34, a, c);
    }
    circle(ctx, 0, 0, r * 0.2, 'rgba(160,30,60,0.5)');
    line(ctx, 0, 0, r * 0.45, -r * 0.35, r * 0.06, '#FFE07A');
    circle(ctx, r * 0.47, -r * 0.37, r * 0.08, '#FFC83A');
  },
};

const bamboo: PropDef = {
  id: 'bamboo',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.6);
    for (const [x, h] of [
      [-r * 0.35, 1],
      [0, 1.15],
      [r * 0.35, 0.9],
    ] as const) {
      const top = r * 0.95 - r * 1.75 * h;
      line(ctx, x, r * 0.95, x, top, r * 0.16, '#9CCB5A');
      for (let y = r * 0.6; y > top + r * 0.1; y -= r * 0.45) line(ctx, x - r * 0.08, y, x + r * 0.08, y, r * 0.05, '#6E9A3A');
      leaf(ctx, x, top + r * 0.2, r * 0.5, r * 0.1, x > 0 ? 1.1 : -1.1, '#5DB05A');
    }
  },
};

const toucan: PropDef = {
  id: 'toucan',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const dir = v > 0.5 ? 1 : -1;
    ctx.scale(dir, 1);
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    // Perch.
    line(ctx, -r * 0.6, r * 0.62, r * 0.6, r * 0.62, r * 0.1, '#8A5A3A');
    ellipse(ctx, -r * 0.05, r * 0.15, r * 0.32, r * 0.5, 0.15, '#3E3A48');
    poly(ctx, [-r * 0.2, r * 0.5, -r * 0.45, r * 0.95, -r * 0.05, r * 0.6], '#3E3A48');
    ellipse(ctx, r * 0.08, -r * 0.05, r * 0.2, r * 0.26, 0, '#FFF3C2');
    circle(ctx, r * 0.05, -r * 0.38, r * 0.25, '#3E3A48');
    // Big colourful beak.
    ctx.fillStyle = '#FF9F43';
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.55, r * 0.95, -r * 0.3);
    ctx.quadraticCurveTo(r * 0.6, -r * 0.25, r * 0.2, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, r * 0.85, -r * 0.33, r * 0.1, r * 0.06, 0, '#E8574F');
    line(ctx, r * 0.25, -r * 0.4, r * 0.75, -r * 0.42, r * 0.025, '#FFD45A');
    circle(ctx, r * 0.1, -r * 0.42, r * 0.09, '#9CE0FF');
    circle(ctx, r * 0.11, -r * 0.42, r * 0.045, '#3E3440');
  },
};

const tiki: PropDef = {
  id: 'tiki',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    const stone = '#B8A890';
    const dark = '#8E806A';
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    rrect(ctx, -r * 0.42, -r * 0.85, r * 0.84, r * 1.8, r * 0.25, stone);
    rrect(ctx, -r * 0.3, -r * 0.55, r * 0.24, r * 0.2, r * 0.08, dark);
    rrect(ctx, r * 0.06, -r * 0.55, r * 0.24, r * 0.2, r * 0.08, dark);
    rrect(ctx, -r * 0.08, -r * 0.35, r * 0.16, r * 0.35, r * 0.06, dark);
    rrect(ctx, -r * 0.28, r * 0.12, r * 0.56, r * 0.18, r * 0.08, dark);
    for (const x of [-0.18, -0.06, 0.06, 0.18]) rrect(ctx, x * r - r * 0.04, r * 0.12, r * 0.08, r * 0.09, 0, '#F4EEE2');
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, bloom);
      ellipse(ctx, -r * 0.2, -r * 0.8, r * 0.3, r * 0.12, 0.3, '#5DBA6A');
      ellipse(ctx, r * 0.3, r * 0.75, r * 0.25, r * 0.1, -0.2, '#5DBA6A');
      ctx.globalAlpha = 1;
    }
  },
};

const banana: PropDef = {
  id: 'banana-plant',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    rrect(ctx, -r * 0.1, -r * 0.1, r * 0.2, r * 1.05, r * 0.08, '#8BBF5A');
    for (const [a, c] of [
      [-1.1, '#4FAE62'],
      [-0.4, '#5DBA6A'],
      [0.4, '#4FAE62'],
      [1.1, '#5DBA6A'],
    ] as const) {
      leaf(ctx, 0, -r * 0.1, r * 0.95, r * 0.28, a, c);
    }
    for (let k = 0; k < 4; k++) ellipse(ctx, r * 0.18 + k * r * 0.03, r * 0.05 + k * r * 0.1, r * 0.16, r * 0.06, 0.5, '#FFD45A');
  },
};

const dartFrog: PropDef = {
  id: 'dart-frog',
  place: 'ground',
  size: [0.045, 0.055],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    const c = v > 0.5 ? '#3FA9F5' : '#FF5E5E';
    ctx.rotate(v * TAU);
    for (const [x, y, a] of [
      [-0.55, -0.4, -0.6],
      [0.55, -0.4, 0.6],
      [-0.6, 0.45, -2.4],
      [0.6, 0.45, 2.4],
    ]) {
      ellipse(ctx, x * r, y * r, r * 0.25, r * 0.12, a, c);
    }
    ellipse(ctx, 0, 0, r * 0.5, r * 0.65, 0, c);
    circle(ctx, -r * 0.2, -r * 0.1, r * 0.12, '#3E3440');
    circle(ctx, r * 0.18, r * 0.2, r * 0.1, '#3E3440');
    circle(ctx, -r * 0.25, -r * 0.55, r * 0.14, '#3E3440');
    circle(ctx, r * 0.25, -r * 0.55, r * 0.14, '#3E3440');
  },
};

const turtle: PropDef = {
  id: 'turtle',
  place: 'water',
  size: [0.055, 0.065],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time * 0.6, v, 0.06);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    const paddle = Math.sin(time * 4 + v * 10) * 0.4;
    for (const [x, yy, a] of [
      [-0.6, 0.35, -0.6 + paddle],
      [0.6, 0.35, 0.6 - paddle],
      [-0.5, -0.45, -2.4 - paddle],
      [0.5, -0.45, 2.4 + paddle],
    ]) {
      ellipse(ctx, x * r, yy * r, r * 0.28, r * 0.13, a, '#8CCB7A');
    }
    circle(ctx, 0, r * 0.82, r * 0.22, '#8CCB7A');
    ellipse(ctx, 0, 0, r * 0.62, r * 0.72, 0, '#4E9E73');
    for (const [x, yy] of [
      [0, 0],
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
      [0.3, 0.3],
    ]) {
      circle(ctx, x * r, yy * r, r * 0.17, '#6FBF7A');
    }
  },
};

const CROC = '#5FA85A';
const CROC_LIGHT = '#86C474';
const CROC_DARK = '#468A45';

/** Crocodile gliding along the canal, seen from above (snout toward +y). */
const crocSwim: PropDef = {
  id: 'croc-swim',
  place: 'water',
  size: [0.065, 0.075],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time * 0.45, v, 0.07);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    const swish = Math.sin(time * 3 + v * 10) * 0.35;
    ellipse(ctx, 0.004, 0.008, r * 0.5, r * 1.2, 0, 'rgba(20, 80, 70, 0.18)');
    // Tail sways from the hips.
    ctx.save();
    ctx.translate(0, -r * 0.55);
    ctx.rotate(swish);
    poly(ctx, [-r * 0.26, 0, r * 0.26, 0, 0, -r * 0.85], CROC);
    for (let k = 0; k < 3; k++) poly(ctx, [-r * 0.05, -r * (0.15 + k * 0.22), r * 0.05, -r * (0.15 + k * 0.22), 0, -r * (0.27 + k * 0.22)], CROC_DARK);
    ctx.restore();
    // Little legs paddling.
    const paddle = Math.sin(time * 5 + v * 7) * 0.4;
    for (const [x, yy, a] of [
      [-0.46, 0.3, -0.8 + paddle],
      [0.46, 0.3, 0.8 - paddle],
      [-0.44, -0.35, -2.3 - paddle],
      [0.44, -0.35, 2.3 + paddle],
    ]) {
      ellipse(ctx, x * r, yy * r, r * 0.22, r * 0.09, a, CROC);
    }
    ellipse(ctx, 0, 0, r * 0.42, r * 0.75, 0, CROC);
    // Long snout, eyes and nostrils poking out of the water.
    rrect(ctx, -r * 0.24, r * 0.45, r * 0.48, r * 0.72, r * 0.2, CROC);
    for (let k = 0; k < 4; k++) {
      circle(ctx, -r * 0.1, -r * 0.4 + k * r * 0.25, r * 0.06, CROC_DARK);
      circle(ctx, r * 0.1, -r * 0.4 + k * r * 0.25, r * 0.06, CROC_DARK);
    }
    ellipse(ctx, 0, -r * 0.05, r * 0.12, r * 0.45, 0, CROC_LIGHT);
    circle(ctx, -r * 0.16, r * 0.55, r * 0.11, CROC_LIGHT);
    circle(ctx, r * 0.16, r * 0.55, r * 0.11, CROC_LIGHT);
    circle(ctx, -r * 0.16, r * 0.58, r * 0.055, '#3E3440');
    circle(ctx, r * 0.16, r * 0.58, r * 0.055, '#3E3440');
    circle(ctx, -r * 0.07, r * 1.08, r * 0.035, CROC_DARK);
    circle(ctx, r * 0.07, r * 1.08, r * 0.035, CROC_DARK);
  },
};

/** Crocodile basking on the bank, side view, with a big friendly smile. */
const crocBank: PropDef = {
  id: 'croc-bank',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 2,
  when: 'bloom',
  upright: true,
  drawScale: 1.5,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    groundShadow(ctx, 0, r * 0.8, r * 0.8);
    // Tail, body, short legs.
    poly(ctx, [-r * 0.35, r * 0.25, -r * 0.35, r * 0.72, -r * 1.0, r * 0.7], CROC);
    for (const x of [-0.25, 0.3]) rrect(ctx, x * r - r * 0.08, r * 0.45, r * 0.16, r * 0.32, r * 0.06, CROC_DARK);
    ellipse(ctx, 0, r * 0.45, r * 0.55, r * 0.28, 0, CROC);
    ellipse(ctx, 0, r * 0.58, r * 0.45, r * 0.12, 0, '#C9E3A0');
    for (let k = 0; k < 5; k++) circle(ctx, -r * 0.4 + k * r * 0.18, r * 0.2, r * 0.07, CROC_DARK);
    // Head with a long snout and a smile full of tiny teeth.
    rrect(ctx, r * 0.35, r * 0.18, r * 0.65, r * 0.3, r * 0.12, CROC);
    ellipse(ctx, r * 0.45, r * 0.25, r * 0.22, r * 0.2, 0, CROC);
    ctx.strokeStyle = '#3E5A3E';
    ctx.lineWidth = r * 0.04;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.4, r * 0.36);
    ctx.quadraticCurveTo(r * 0.7, r * 0.44, r * 0.95, r * 0.32);
    ctx.stroke();
    for (let k = 0; k < 4; k++) poly(ctx, [r * (0.5 + k * 0.11), r * 0.385, r * (0.55 + k * 0.11), r * 0.385, r * (0.525 + k * 0.11), r * 0.45], '#FFFFFF');
    circle(ctx, r * 0.45, r * 0.06, r * 0.12, CROC);
    circle(ctx, r * 0.47, r * 0.05, r * 0.08, '#FFFFFF');
    circle(ctx, r * 0.49, r * 0.06, r * 0.045, '#3E3440');
    circle(ctx, r * 0.92, r * 0.2, r * 0.03, CROC_DARK);
    circle(ctx, r * 0.58, r * 0.3, r * 0.05, 'rgba(255,140,170,0.5)');
  },
};

export const jungle: Theme = {
  id: 'jungle',
  name: 'Jungle',
  blurb: 'Monsteras, toucans et crocodiles',
  palette: {
    ...SPRING,
    bgTop: '#C9F0DA',
    bgMid: '#E8F8EC',
    bgBottom: '#B9E6CB',
    bokeh: ['150,230,180', '255,220,140', '120,210,190', '255,170,200'],
    bedShadow: 'rgba(60, 140, 90, 0.3)',
    tileShadow: 'rgba(40, 100, 60, 0.38)',
    soil: '#CDA27A',
    soilLight: '#DDB690',
    soilDark: '#BC8F66',
    soilSide: '#AE8058',
    soilSideDark: '#9A6F49',
    pebble: '#EADBC6',
    pebbleShade: '#A98462',
    ...grassFrom(132, 0.48, 0.53),
    rim: '#F7F3E8',
    rimShade: '#A68E70',
    groove: '#B8926E',
    grooveDeep: '#A2805C',
    water: '#4FD0C6',
    waterDeep: '#25AFA6',
    petals: ['#FF5E7E', '#FF9F43', '#FFD45A', '#FF7AC6', '#FFFFFF', '#B57EDC'],
    lotus: ['#FF6F91', '#FF9AB8', '#FFD45A'],
    lily: '#5CBF6B',
    lilyDark: '#3E9A55',
  },
  ambient: 'fireflies',
  ambientColors: ['#E8FF8A', '#FFF59A', '#C9FF9A'],
  creature: 'butterfly',
  propChance: 0.85,
  extraChance: 0.45,
  props: [
    monstera,
    fern,
    hibiscus,
    bamboo,
    toucan,
    tiki,
    banana,
    dartFrog,
    rockProp('#B8B09A', '#948A74', '#DCD6C6', '#5DBA6A'),
    plankBridge('#B8875A', '#A67648', '#8A6A48', 1, { vines: '#5DB05A' }),
    turtle,
    crocSwim,
    crocBank,
  ],
  tuft(ctx, s) {
    for (const a of [-0.7, 0, 0.7]) leaf(ctx, 0, s * 0.4, s * 1.1, s * 0.22, a, '#2F9450');
  },
  scenery(ctx, w, h) {
    jungleLeaf(ctx, -10, h * 0.25, h * 0.22, 1.2, '#8FCFA3', '#B4E2C2');
    jungleLeaf(ctx, w + 10, h * 0.18, h * 0.2, -1.3, '#86C99B', '#B4E2C2');
    for (let k = 0; k < 7; k++) {
      jungleLeaf(ctx, w * (k / 6), h + 10, h * (0.16 + (k % 3) * 0.03), (k - 3) * 0.3, k % 2 ? '#5DB37C' : '#4CA46D', '#8ED3A6');
    }
  },
};
