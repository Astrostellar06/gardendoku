/** Wild marsh: reeds and cattails, wildflowers, mossy logs, frogs, ducks and dragonflies. */
import { grassFrom, SPRING } from '../palette';
import { mushroomProp, rockProp, snailProp, steppingStonesBridge, swimOffset } from './common';
import { circle, ellipse, groundShadow, leaf, line, TAU } from './kit';
import { clouds, hill, reeds } from './scenery';
import type { PropDef, Theme } from './types';

const cattails: PropDef = {
  id: 'cattails',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.6);
    for (let k = -2; k <= 2; k++) {
      const x = k * r * 0.2;
      const h = r * (1.7 - Math.abs(k) * 0.2 - ((k + 3 + Math.floor(v * 5)) % 3) * 0.12);
      ctx.strokeStyle = k % 2 ? '#6FAE5A' : '#5E9E4E';
      ctx.lineWidth = r * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, r * 0.95);
      ctx.quadraticCurveTo(x + k * r * 0.05, 0, x + k * r * 0.1, r * 0.95 - h);
      ctx.stroke();
      if (Math.abs(k) !== 1) {
        ellipse(ctx, x + k * r * 0.09, r * 0.95 - h + r * 0.28, r * 0.09, r * 0.22, 0, '#8A5A3A');
      }
    }
    leaf(ctx, -r * 0.1, r * 0.95, r * 1.2, r * 0.1, -0.35, '#7FBF6A');
    leaf(ctx, r * 0.1, r * 0.95, r * 1.0, r * 0.1, 0.45, '#7FBF6A');
  },
};

const wildflowers: PropDef = {
  id: 'wildflowers',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const colors = ['#FFFFFF', '#FFE14D', '#C9A8F5', '#FF9EBB', '#9ED0FF'];
    groundShadow(ctx, 0, r * 0.92, r * 0.6);
    for (let k = 0; k < 5; k++) {
      const x = (k - 2) * r * 0.22;
      const top = -r * (0.4 + ((k * 7 + Math.floor(v * 9)) % 4) * 0.15);
      line(ctx, x * 0.6, r * 0.92, x, top, r * 0.05, '#6FAE5A');
      const c = colors[(k + Math.floor(v * 5)) % 5];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU;
        circle(ctx, x + Math.cos(a) * r * 0.1, top + Math.sin(a) * r * 0.1, r * 0.08, c);
      }
      circle(ctx, x, top, r * 0.06, '#FFC83A');
    }
  },
};

const log: PropDef = {
  id: 'log',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 2,
  when: 'always',
  draw(ctx, { r, v, bloom }) {
    ctx.rotate(v * TAU);
    ellipse(ctx, 0.01, 0.02, r * 0.95, r * 0.42, 0, 'rgba(60,40,30,0.18)');
    ctx.fillStyle = '#9A6A48';
    ctx.fillRect(-r * 0.8, -r * 0.3, r * 1.6, r * 0.6);
    ellipse(ctx, -r * 0.8, 0, r * 0.14, r * 0.3, 0, '#9A6A48');
    ellipse(ctx, r * 0.8, 0, r * 0.16, r * 0.3, 0, '#E2B98A');
    ellipse(ctx, r * 0.8, 0, r * 0.08, r * 0.16, 0, '#C9986A');
    line(ctx, -r * 0.6, -r * 0.1, r * 0.4, -r * 0.12, r * 0.04, '#7E5238');
    line(ctx, -r * 0.4, r * 0.12, r * 0.55, r * 0.1, r * 0.04, '#7E5238');
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, bloom);
      ellipse(ctx, -r * 0.2, -r * 0.22, r * 0.35, r * 0.1, 0, '#7FBF6A');
      circle(ctx, r * 0.25, -r * 0.3, r * 0.1, '#FF8A7A');
      ctx.globalAlpha = 1;
    }
  },
};

const frogPad: PropDef = {
  id: 'frog-pad',
  place: 'water',
  size: [0.06, 0.07],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    ctx.fillStyle = '#7FC676';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.95, 0.4, TAU - 0.1);
    ctx.closePath();
    ctx.fill();
    // Frog seen from above.
    ellipse(ctx, -r * 0.35, r * 0.3, r * 0.22, r * 0.12, -0.8, '#5FB45B');
    ellipse(ctx, r * 0.35, r * 0.3, r * 0.22, r * 0.12, 0.8, '#5FB45B');
    ellipse(ctx, 0, 0, r * 0.38, r * 0.45, 0, '#6FC266');
    circle(ctx, -r * 0.18, -r * 0.35, r * 0.13, '#6FC266');
    circle(ctx, r * 0.18, -r * 0.35, r * 0.13, '#6FC266');
    circle(ctx, -r * 0.18, -r * 0.37, r * 0.06, '#3E3440');
    circle(ctx, r * 0.18, -r * 0.37, r * 0.06, '#3E3440');
    circle(ctx, -r * 0.1, r * 0.05, r * 0.06, 'rgba(255,255,255,0.4)');
  },
};

const duck: PropDef = {
  id: 'duck',
  place: 'water',
  size: [0.06, 0.07],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time, v, 0.07);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    ellipse(ctx, 0, -r * 0.1, r * 0.5, r * 0.8, 0, '#C9A27A');
    ellipse(ctx, 0, -r * 0.15, r * 0.36, r * 0.55, 0, '#A9825C');
    ellipse(ctx, 0, -r * 0.62, r * 0.2, r * 0.22, 0, '#3E3440');
    circle(ctx, 0, r * 0.62, r * 0.32, '#3F9A6A');
    ellipse(ctx, 0, r * 0.95, r * 0.14, r * 0.12, 0, '#FFC23A');
    line(ctx, -r * 0.3, r * 0.35, r * 0.3, r * 0.35, r * 0.07, '#FFFFFF');
  },
};

const dragonfly: PropDef = {
  id: 'dragonfly',
  place: 'ground',
  size: [0.06, 0.07],
  weight: 1,
  when: 'bloom',
  upright: true,
  animated: true,
  draw(ctx, { r, time, v, bloom }) {
    if (bloom < 0.8) return;
    const hover = Math.sin(time * 2 + v * 8);
    ctx.translate(Math.sin(time * 0.7 + v * 5) * r * 0.5, -r * 0.6 + hover * r * 0.25);
    const flick = 0.6 + 0.4 * Math.abs(Math.sin(time * 25));
    const wing = 'rgba(210,235,255,0.75)';
    ellipse(ctx, -r * 0.42, -r * 0.18, r * 0.42, r * 0.12 * flick, -0.25, wing);
    ellipse(ctx, r * 0.42, -r * 0.18, r * 0.42, r * 0.12 * flick, 0.25, wing);
    ellipse(ctx, -r * 0.38, r * 0.05, r * 0.36, r * 0.1 * flick, 0.2, wing);
    ellipse(ctx, r * 0.38, r * 0.05, r * 0.36, r * 0.1 * flick, -0.2, wing);
    line(ctx, 0, -r * 0.3, 0, r * 0.8, r * 0.09, v > 0.5 ? '#3FA9F5' : '#8C6BE0');
    circle(ctx, 0, -r * 0.35, r * 0.13, v > 0.5 ? '#2E8FD8' : '#7353C8');
  },
};

export const sauvage: Theme = {
  id: 'sauvage',
  name: 'Sauvage',
  blurb: 'Roseaux, fleurs des champs et grenouilles',
  palette: {
    ...SPRING,
    bgTop: '#D9F0E4',
    bgMid: '#F2F7E8',
    bgBottom: '#CCE6CF',
    bokeh: ['170,225,190', '255,235,150', '190,210,250', '220,240,200'],
    bedShadow: 'rgba(90, 140, 100, 0.3)',
    tileShadow: 'rgba(70, 100, 70, 0.38)',
    soil: '#D2B58D',
    soilLight: '#E0C8A3',
    soilDark: '#C0A078',
    soilSide: '#B1916A',
    soilSideDark: '#9E805C',
    pebble: '#F0E6D4',
    pebbleShade: '#AF9472',
    ...grassFrom(82, 0.35, 0.6),
    rim: '#F6F2E6',
    rimShade: '#AC9674',
    groove: '#BEA07A',
    grooveDeep: '#A88B67',
    water: '#6DC8E0',
    waterDeep: '#3FA8C8',
    petals: ['#FFFFFF', '#FFE14D', '#C9A8F5', '#FF9EBB', '#9ED0FF'],
    lotus: ['#FFFFFF', '#FFF3B0', '#FFD1E0'],
    lily: '#7FC676',
    lilyDark: '#5FAE5A',
  },
  ambient: 'seeds',
  ambientColors: ['#FFFFFF'],
  creature: 'butterfly',
  propChance: 0.85,
  extraChance: 0.45,
  props: [
    cattails,
    wildflowers,
    log,
    frogPad,
    duck,
    dragonfly,
    mushroomProp(['#C96A3A', '#E9564A', '#F2A65A']),
    snailProp('#E2C08A', '#B88A4E'),
    rockProp('#C9C3B0', '#A49D88', '#E8E3D6', '#7FBF6A'),
    steppingStonesBridge('#D8D2C2', '#AFA894'),
  ],
  tuft(ctx, s) {
    // Tall wild grass blades.
    ctx.strokeStyle = '#4E9A52';
    ctx.lineWidth = 0.014;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(k * s * 0.1, s * 0.4);
      ctx.quadraticCurveTo(k * s * 0.2, -s * 0.2, k * s * 0.35, -s * (0.95 - Math.abs(k) * 0.15));
    }
    ctx.stroke();
  },
  scenery(ctx, w, h) {
    clouds(ctx, w, h);
    hill(ctx, w, h, h * 0.9, 16, 'rgba(160, 215, 160, 0.85)', 0.9);
    reeds(ctx, w, h, '#8CBD8C', '#A98466');
  },
};
