/** Winter garden: snow-covered tiles, snowmen, lit fir trees, presents and candy canes. */
import { SPRING } from '../palette';
import { plankBridge } from './common';
import { circle, ellipse, groundShadow, leaf, line, poly, rrect, star, TAU } from './kit';
import { hill, pineSilhouette } from './scenery';
import type { PropDef, Theme } from './types';

const SNOW_SHADE = '#DDE8F5';
const LIGHTS = ['#FF6B6B', '#FFD45A', '#6EC6FF', '#9CF08A', '#FF9DE2'];

const snowman: PropDef = {
  id: 'snowman',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, v, bloom }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.6);
    circle(ctx, 0, r * 0.5, r * 0.5, SNOW_SHADE);
    circle(ctx, -r * 0.06, r * 0.45, r * 0.45, '#FFFFFF');
    circle(ctx, 0, -r * 0.25, r * 0.36, SNOW_SHADE);
    circle(ctx, -r * 0.04, -r * 0.29, r * 0.32, '#FFFFFF');
    // Scarf, carrot, coal eyes.
    const scarf = v > 0.5 ? '#FF6B6B' : '#6EA8FF';
    rrect(ctx, -r * 0.32, r * 0.0, r * 0.64, r * 0.14, r * 0.07, scarf);
    rrect(ctx, r * 0.12, r * 0.05, r * 0.14, r * 0.35, r * 0.06, scarf);
    poly(ctx, [0, -r * 0.24, r * 0.32, -r * 0.18, 0, -r * 0.14], '#FF9A3C');
    circle(ctx, -r * 0.12, -r * 0.36, r * 0.05, '#3E3440');
    circle(ctx, r * 0.08, -r * 0.36, r * 0.05, '#3E3440');
    for (const y of [0.35, 0.55]) circle(ctx, 0, r * y, r * 0.045, '#3E3440');
    line(ctx, -r * 0.42, r * 0.3, -r * 0.82, r * 0.05, r * 0.06, '#8A5A3A');
    line(ctx, r * 0.42, r * 0.3, r * 0.82, r * 0.08, r * 0.06, '#8A5A3A');
    if (v2Hat(v)) {
      rrect(ctx, -r * 0.3, -r * 0.62, r * 0.6, r * 0.08, r * 0.03, '#3E3440');
      rrect(ctx, -r * 0.2, -r * 0.92, r * 0.4, r * 0.32, r * 0.05, '#3E3440');
      if (bloom > 0.5) rrect(ctx, -r * 0.2, -r * 0.7, r * 0.4, r * 0.07, 0, '#FF6B6B');
    }
  },
};

function v2Hat(v: number): boolean {
  return Math.floor(v * 10) % 2 === 0;
}

const fir: PropDef = {
  id: 'fir',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    rrect(ctx, -r * 0.1, r * 0.6, r * 0.2, r * 0.35, r * 0.04, '#8A5A3A');
    const layers = 3;
    for (let k = 0; k < layers; k++) {
      const base = r * 0.7 - k * r * 0.45;
      const half = r * (0.68 - k * 0.15);
      poly(ctx, [-half, base, 0, base - r * 0.7, half, base], k % 2 ? '#3F8F66' : '#4E9E73');
      // Snow on the branches.
      poly(ctx, [-half * 0.55, base - r * 0.32, 0, base - r * 0.7, half * 0.55, base - r * 0.32, 0, base - r * 0.26], '#FFFFFF');
    }
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, (bloom - 0.3) * 2);
      for (let k = 0; k < 7; k++) {
        const y = r * 0.55 - (k / 7) * r * 1.2;
        const x = Math.sin(k * 2.3 + v * 6) * r * (0.45 - (k / 7) * 0.35);
        circle(ctx, x, y, r * 0.07, LIGHTS[k % LIGHTS.length]);
      }
      star(ctx, 0, -r * 0.92, r * 0.17, 5, 0.45, '#FFD45A');
      ctx.globalAlpha = 1;
    }
  },
};

const gift: PropDef = {
  id: 'gift',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v, v2 }) {
    const boxes = ['#FF7A8A', '#6EC6FF', '#9CDB7A', '#C9A0FF', '#FFC94D'];
    const box = (x: number, y: number, w: number, h: number, k: number) => {
      const c = boxes[k % boxes.length];
      const ribbon = boxes[(k + 2) % boxes.length];
      rrect(ctx, x - w / 2, y - h, w, h, r * 0.06, c);
      rrect(ctx, x - w * 0.09, y - h, w * 0.18, h, 0, ribbon);
      rrect(ctx, x - w / 2, y - h * 0.62, w, h * 0.16, 0, ribbon);
      ellipse(ctx, x - w * 0.16, y - h - r * 0.08, w * 0.16, r * 0.09, -0.5, ribbon);
      ellipse(ctx, x + w * 0.16, y - h - r * 0.08, w * 0.16, r * 0.09, 0.5, ribbon);
    };
    groundShadow(ctx, 0, r * 0.8, r * 0.85);
    const k = Math.floor(v * 5);
    box(-r * 0.25, r * 0.8, r * 0.9, r * 0.8, k);
    if (v2 > 0.4) box(r * 0.45, r * 0.8, r * 0.55, r * 0.5, k + 1);
  },
};

const candyCane: PropDef = {
  id: 'candy-cane',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.3);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.95);
      ctx.lineTo(0, -r * 0.45);
      ctx.arc(-r * 0.32, -r * 0.45, r * 0.32, 0, Math.PI, true);
    };
    ctx.lineCap = 'round';
    path();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = r * 0.24;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#FF5A6A';
    ctx.setLineDash([r * 0.16, r * 0.16]);
    ctx.stroke();
    ctx.setLineDash([]);
  },
};

const holly: PropDef = {
  id: 'holly',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    leaf(ctx, 0, 0, r * 0.95, r * 0.35, -0.9, '#3F8F66');
    leaf(ctx, 0, 0, r * 0.95, r * 0.35, 0.9, '#4E9E73');
    leaf(ctx, 0, 0, r * 0.8, r * 0.3, Math.PI, '#3F8F66');
    for (const [x, y] of [
      [-0.15, -0.1],
      [0.15, -0.08],
      [0, 0.12],
    ]) {
      circle(ctx, x * r, y * r, r * 0.2, '#E8414F');
      circle(ctx, x * r - r * 0.06, y * r - r * 0.06, r * 0.06, 'rgba(255,255,255,0.6)');
    }
  },
};

const penguin: PropDef = {
  id: 'penguin',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.5);
    ellipse(ctx, 0, r * 0.15, r * 0.5, r * 0.75, 0, '#3E4658');
    ellipse(ctx, 0, r * 0.25, r * 0.34, r * 0.58, 0, '#FFFFFF');
    circle(ctx, 0, -r * 0.5, r * 0.36, '#3E4658');
    ellipse(ctx, -r * 0.12, -r * 0.48, r * 0.12, r * 0.14, 0, '#FFFFFF');
    ellipse(ctx, r * 0.12, -r * 0.48, r * 0.12, r * 0.14, 0, '#FFFFFF');
    circle(ctx, -r * 0.1, -r * 0.48, r * 0.05, '#3E3440');
    circle(ctx, r * 0.1, -r * 0.48, r * 0.05, '#3E3440');
    poly(ctx, [-r * 0.08, -r * 0.38, r * 0.08, -r * 0.38, 0, -r * 0.27], '#FF9A3C');
    ellipse(ctx, -r * 0.48, r * 0.15, r * 0.12, r * 0.38, 0.3, '#3E4658');
    ellipse(ctx, r * 0.48, r * 0.15, r * 0.12, r * 0.38, -0.3, '#3E4658');
    ellipse(ctx, -r * 0.18, r * 0.88, r * 0.16, r * 0.07, 0, '#FF9A3C');
    ellipse(ctx, r * 0.18, r * 0.88, r * 0.16, r * 0.07, 0, '#FF9A3C');
    if (v > 0.5) {
      // Little red bobble hat.
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.62, r * 0.3, r * 0.22, 0, Math.PI, TAU);
      ctx.fill();
      circle(ctx, 0, -r * 0.86, r * 0.09, '#FFFFFF');
    }
  },
};

const snowyRock: PropDef = {
  id: 'snowy-rock',
  place: 'ground',
  size: [0.06, 0.09],
  weight: 2,
  when: 'always',
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0.01, r * 0.35, r * 0.95, r * 0.45);
    ellipse(ctx, 0, 0, r * 0.95, r * 0.7, v * 0.6, '#9AA6BA');
    ellipse(ctx, -r * 0.08, -r * 0.1, r * 0.8, r * 0.55, v * 0.6, '#B7C1D2');
    ellipse(ctx, -r * 0.05, -r * 0.32, r * 0.7, r * 0.3, v * 0.6, '#FFFFFF');
  },
};

const sled: PropDef = {
  id: 'sled',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    ellipse(ctx, 0.01, 0.015, r * 0.95, r * 0.55, 0, 'rgba(60,70,110,0.15)');
    line(ctx, -r * 0.9, -r * 0.42, r * 0.75, -r * 0.42, r * 0.08, '#8A9BB8');
    line(ctx, -r * 0.9, r * 0.42, r * 0.75, r * 0.42, r * 0.08, '#8A9BB8');
    for (let k = 0; k < 4; k++) rrect(ctx, -r * 0.65 + k * r * 0.36, -r * 0.5, r * 0.26, r, r * 0.06, '#E8574F');
  },
};

const iceFloe: PropDef = {
  id: 'ice-floe',
  place: 'water',
  size: [0.05, 0.065],
  weight: 1,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    poly(ctx, [-r * 0.8, -r * 0.2, -r * 0.2, -r * 0.8, r * 0.6, -r * 0.5, r * 0.7, r * 0.3, 0, r * 0.7, -r * 0.6, r * 0.4], 'rgba(255,255,255,0.92)');
    poly(ctx, [r * 0.3, r * 0.9, r * 0.8, r * 0.75, r * 0.7, r * 1.2], 'rgba(255,255,255,0.85)');
  },
};

export const hiver: Theme = {
  id: 'hiver',
  name: 'Hiver',
  blurb: 'Neige, bonshommes de neige et cadeaux',
  palette: {
    ...SPRING,
    bgTop: '#D8E8FA',
    bgMid: '#F1F6FF',
    bgBottom: '#DCE9F7',
    bokeh: ['190,215,255', '255,255,255', '210,200,255', '200,235,255'],
    bed: 'rgba(255, 255, 255, 0.55)',
    bedShadow: 'rgba(110, 140, 200, 0.3)',
    tileShadow: 'rgba(80, 100, 150, 0.35)',
    soil: '#CFD8E8',
    soilLight: '#E2E8F3',
    soilDark: '#BEC9DC',
    soilSide: '#A7B4CB',
    soilSideDark: '#95A3BD',
    pebble: '#F5F7FC',
    pebbleShade: '#AEB9CE',
    grass: '#FFFFFF',
    grassLight: '#FFFFFF',
    grassDark: '#EAF2FB',
    grassDeep: '#5E9E80',
    grassSide: '#C4D6EE',
    grassSideDark: '#AEC4E3',
    rim: '#FFFFFF',
    rimShade: '#A2B1CB',
    groove: '#B5C3DA',
    grooveDeep: '#9FB0CC',
    water: '#7CD6F2',
    waterDeep: '#42B3DF',
    petals: ['#FFFFFF', '#E8414F', '#F5F9FF', '#D9473F', '#BFE6FF'],
    centers: ['#FFE07A', '#FFFFFF'],
    lotus: ['#FFFFFF', '#E3F4FF', '#D5E8FF'],
    lily: '#7FB89A',
    lilyDark: '#5E9E80',
  },
  ambient: 'snow',
  ambientColors: ['#FFFFFF', '#F2F7FF', '#E6F0FF'],
  creature: 'none',
  propChance: 0.8,
  extraChance: 0.4,
  props: [snowman, fir, gift, candyCane, holly, penguin, snowyRock, sled, plankBridge('#C98A5A', '#B57846', '#8A5A3A', 1, { snow: true }), iceFloe],
  dryGround(ctx, g) {
    // Frozen ground: a few pale cracks.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      let x = (g.rnd[k] - 0.5) * 0.7;
      let y = (g.rnd[k + 3] - 0.5) * 0.7;
      ctx.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        x += Math.cos(k * 2 + s) * 0.07;
        y += Math.sin(k * 3 + s * 2) * 0.07;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  },
  bloomGround(ctx, g) {
    // Fresh snow: soft blue shadows and glints.
    for (let k = 0; k < 4; k++) {
      ellipse(ctx, (g.rnd[k] - 0.5) * 0.7, (g.rnd[(k + 2) % 6] - 0.5) * 0.7, 0.12, 0.05, 0, 'rgba(180,205,240,0.35)');
    }
    for (let k = 0; k < 5; k++) {
      star(ctx, (g.rnd[k % 6] - 0.5) * 0.8, (g.rnd[(k + 1) % 6] - 0.5) * 0.8, 0.018, 4, 0.35, '#BFE0FF');
    }
  },
  smallFlower(ctx, r, color) {
    if (color === '#E8414F' || color === '#D9473F') {
      // Winter berries.
      leaf(ctx, 0, 0, r * 0.9, r * 0.3, -0.8, '#4E9E73');
      leaf(ctx, 0, 0, r * 0.9, r * 0.3, 0.8, '#3F8F66');
      circle(ctx, -r * 0.2, 0, r * 0.28, color);
      circle(ctx, r * 0.22, r * 0.05, r * 0.25, color);
      circle(ctx, 0, -r * 0.25, r * 0.24, color);
      return;
    }
    // Snowdrop.
    for (let k = 0; k < 3; k++) ellipse(ctx, Math.cos((k / 3) * TAU) * r * 0.4, Math.sin((k / 3) * TAU) * r * 0.4, r * 0.4, r * 0.25, (k / 3) * TAU, color);
    circle(ctx, 0, 0, r * 0.2, '#BDE5A8');
  },
  tuft(ctx, s) {
    // Tiny evergreen sprig.
    ctx.strokeStyle = '#4E9E73';
    ctx.lineWidth = 0.014;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.lineTo(0, -s * 0.5);
    for (let k = 0; k < 3; k++) {
      const y = s * 0.2 - k * s * 0.25;
      ctx.moveTo(0, y);
      ctx.lineTo(-s * 0.3, y - s * 0.15);
      ctx.moveTo(0, y);
      ctx.lineTo(s * 0.3, y - s * 0.15);
    }
    ctx.stroke();
  },
  scenery(ctx, w, h) {
    hill(ctx, w, h, h * 0.88, 18, 'rgba(235, 243, 255, 0.95)', 0.6);
    for (let k = 0; k < 7; k++) {
      pineSilhouette(ctx, w * (0.05 + k * 0.15), h * (0.885 + Math.sin(k * 2.3) * 0.01), 0.7 + (k % 3) * 0.2, '#A9C1DC', '#FFFFFF');
    }
    hill(ctx, w, h, h * 0.94, 12, '#FFFFFF', 2.4);
  },
};
