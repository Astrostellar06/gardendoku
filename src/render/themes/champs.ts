/** Fields: hay bales, windmills, poppies, lavender rows, wheat sheaves, rabbits and a little tractor. */
import { SPRING } from '../palette';
import { lilyPadsProp, plankBridge } from './common';
import { circle, ellipse, eyes, groundShadow, leaf, line, poly, rrect, TAU } from './kit';
import { fields, sun, windmillSilhouette } from './scenery';
import type { PropDef, Theme } from './types';

const hayBale: PropDef = {
  id: 'hay-bale',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.8);
    // Round bale seen from the side, spiral on its face.
    rrect(ctx, -r * 0.7, -r * 0.15, r * 1.2, r * 1.05, r * 0.3, '#E8C060');
    for (let k = 0; k < 4; k++) line(ctx, -r * 0.6, r * 0.05 + k * r * 0.22, r * 0.3, r * 0.05 + k * r * 0.22, r * 0.025, '#D2A848');
    circle(ctx, r * 0.45, r * 0.38, r * 0.52, '#F2CF6A');
    ctx.strokeStyle = '#D2A848';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    for (let t = 0; t < 12; t += 0.25) {
      const rad = (t / 12) * r * 0.45;
      const x = r * 0.45 + Math.cos(t + v * 6) * rad;
      const y = r * 0.38 + Math.sin(t + v * 6) * rad;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },
};

const windmill: PropDef = {
  id: 'windmill',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 1,
  when: 'always',
  upright: true,
  animated: true,
  drawScale: 1.7,
  draw(ctx, { r, time, v, water }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    poly(ctx, [-r * 0.4, r * 0.95, -r * 0.22, -r * 0.4, r * 0.22, -r * 0.4, r * 0.4, r * 0.95], '#FFF4E6');
    poly(ctx, [r * 0.1, r * 0.95, r * 0.15, -r * 0.4, r * 0.22, -r * 0.4, r * 0.4, r * 0.95], '#EDE0CE');
    ctx.fillStyle = '#C95A48';
    ctx.beginPath();
    ctx.arc(0, -r * 0.4, r * 0.28, Math.PI, 0);
    ctx.fill();
    rrect(ctx, -r * 0.1, r * 0.55, r * 0.2, r * 0.4, r * 0.08, '#8A5A3A');
    rrect(ctx, -r * 0.08, r * 0.05, r * 0.16, r * 0.18, r * 0.04, '#9FD4F5');
    // Sails turn faster once the garden is watered.
    const spin = time * (water > 0 ? 1.1 : 0.4) + v * 6;
    ctx.save();
    ctx.translate(0, -r * 0.45);
    ctx.rotate(spin);
    for (let k = 0; k < 4; k++) {
      ctx.rotate(TAU / 4);
      line(ctx, 0, 0, 0, -r * 0.85, r * 0.05, '#8A5A3A');
      rrect(ctx, r * 0.03, -r * 0.85, r * 0.22, r * 0.62, r * 0.03, 'rgba(255,255,255,0.92)');
      ctx.strokeStyle = 'rgba(138,90,58,0.5)';
      ctx.lineWidth = r * 0.02;
      ctx.beginPath();
      for (let s = 1; s < 4; s++) {
        ctx.moveTo(r * 0.03, -r * 0.85 + s * r * 0.155);
        ctx.lineTo(r * 0.25, -r * 0.85 + s * r * 0.155);
      }
      ctx.stroke();
    }
    ctx.restore();
    circle(ctx, 0, -r * 0.45, r * 0.07, '#8A5A3A');
  },
};

const poppies: PropDef = {
  id: 'poppies',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.6);
    for (const [x, h] of [[-0.45, 0.75], [-0.1, 1.0], [0.25, 0.85], [0.5, 0.6]]) {
      const top = r * 0.9 - r * 1.45 * h;
      ctx.strokeStyle = '#6FA84A';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath();
      ctx.moveTo(x * r, r * 0.9);
      ctx.quadraticCurveTo(x * r + r * 0.1, (r * 0.9 + top) / 2, x * r, top);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + x;
        circle(ctx, x * r + Math.cos(a) * r * 0.1, top + Math.sin(a) * r * 0.08, r * 0.14, k % 2 ? '#FF4A4A' : '#FF6A5A');
      }
      circle(ctx, x * r, top, r * 0.06, '#3E3440');
    }
  },
};

const lavender: PropDef = {
  id: 'lavender',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    for (const [x, s] of [[-0.45, 0.8], [0.05, 1], [0.5, 0.85]]) {
      groundShadow(ctx, x * r, r * 0.85, r * 0.35 * s);
      ellipse(ctx, x * r, r * 0.5, r * 0.32 * s, r * 0.35 * s, 0, '#8FB89A');
      for (let k = -3; k <= 3; k++) {
        const tx = x * r + k * r * 0.07 * s;
        const ty = r * 0.5 - r * (0.55 - Math.abs(k) * 0.05) * s;
        line(ctx, x * r, r * 0.6, tx, ty + r * 0.15, r * 0.025, '#7FA88A');
        ellipse(ctx, tx, ty, r * 0.05 * s, r * 0.13 * s, k * 0.08, k % 2 ? '#A98AE8' : '#9673DC');
      }
    }
  },
};

const sheaf: PropDef = {
  id: 'wheat-sheaf',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.5);
    const stalk = bloom > 0.5 ? '#E8B84A' : '#D9B070';
    for (let k = -4; k <= 4; k++) {
      line(ctx, k * r * 0.08, r * 0.92, k * r * 0.12, -r * 0.4, r * 0.05, stalk);
      for (let g = 0; g < 4; g++) {
        const y = -r * 0.45 - g * r * 0.12;
        leaf(ctx, k * r * 0.12, y + r * 0.08, r * 0.14, r * 0.05, -0.4, '#F2CF6A');
        leaf(ctx, k * r * 0.12, y + r * 0.08, r * 0.14, r * 0.05, 0.4, '#F2CF6A');
      }
    }
    rrect(ctx, -r * 0.4, r * 0.2, r * 0.8, r * 0.14, r * 0.05, '#C95A48');
  },
};

const rabbit: PropDef = {
  id: 'rabbit',
  place: 'ground',
  size: [0.05, 0.07],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const fur = '#C9A48A';
    groundShadow(ctx, 0, r * 0.9, r * 0.55);
    ellipse(ctx, -r * 0.1, r * 0.45, r * 0.45, r * 0.38, 0, fur);
    circle(ctx, -r * 0.55, r * 0.45, r * 0.14, '#FFFFFF');
    circle(ctx, r * 0.3, 0, r * 0.26, fur);
    ellipse(ctx, r * 0.18, -r * 0.45, r * 0.08, r * 0.3, -0.2, fur);
    ellipse(ctx, r * 0.36, -r * 0.48, r * 0.08, r * 0.3, 0.15, fur);
    ellipse(ctx, r * 0.36, -r * 0.46, r * 0.035, r * 0.2, 0.15, '#FFC1D6');
    eyes(ctx, r * 0.38, -r * 0.03, r * 0.06, r * 0.035);
    circle(ctx, r * 0.54, r * 0.05, r * 0.04, '#FF8FA8');
    ellipse(ctx, r * 0.15, r * 0.78, r * 0.14, r * 0.07, 0, '#B8907A');
  },
};

const tractor: PropDef = {
  id: 'tractor',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const body = v > 0.3 && v < 0.7 ? '#5FB45B' : '#E8554F';
    groundShadow(ctx, 0, r * 0.9, r * 0.85);
    rrect(ctx, -r * 0.1, -r * 0.05, r * 0.75, r * 0.45, r * 0.08, body);
    rrect(ctx, -r * 0.55, -r * 0.6, r * 0.5, r * 1.0, r * 0.06, body);
    rrect(ctx, -r * 0.48, -r * 0.52, r * 0.36, r * 0.35, r * 0.04, '#CFEAF7');
    rrect(ctx, -r * 0.62, -r * 0.68, r * 0.64, r * 0.1, r * 0.04, '#FFFFFF');
    line(ctx, r * 0.45, -r * 0.05, r * 0.45, -r * 0.35, r * 0.07, '#5A5A64');
    circle(ctx, -r * 0.35, r * 0.55, r * 0.38, '#3E3440');
    circle(ctx, -r * 0.35, r * 0.55, r * 0.16, '#FFC93A');
    circle(ctx, r * 0.45, r * 0.68, r * 0.24, '#3E3440');
    circle(ctx, r * 0.45, r * 0.68, r * 0.1, '#FFC93A');
    circle(ctx, r * 0.68, r * 0.1, r * 0.06, '#FFF2A8');
  },
};

export const champs: Theme = {
  id: 'champs',
  name: 'Champs',
  blurb: 'Blé, coquelicots, lavande et moulins',
  palette: {
    ...SPRING,
    bgTop: '#FFE4A8',
    bgMid: '#FFF6DE',
    bgBottom: '#F0DE9E',
    bokeh: ['255,210,110', '255,235,170', '200,180,250', '255,150,140'],
    bedShadow: 'rgba(200, 150, 70, 0.3)',
    tileShadow: 'rgba(150, 110, 50, 0.4)',
    soil: '#E9C78E',
    soilLight: '#F4D9A8',
    soilDark: '#DBB47A',
    soilSide: '#CDA068',
    soilSideDark: '#BA8C56',
    pebble: '#FBEFD8',
    pebbleShade: '#C9A06C',
    grass: '#B8D978',
    grassLight: '#D0E698',
    grassDark: '#9DCB62',
    grassDeep: '#78B04C',
    grassSide: '#90BE5A',
    grassSideDark: '#80AC4E',
    rim: '#FFF8EA',
    rimShade: '#C9A06C',
    groove: '#DDB27A',
    grooveDeep: '#CB9E66',
    water: '#66CAF0',
    waterDeep: '#3AACE2',
    petals: ['#FF4A4A', '#FFFFFF', '#A98AE8', '#FFD45A', '#8DC8FF'],
    centers: ['#3E3440', '#FFE07A', '#FFC83A'],
  },
  ambient: 'seeds',
  ambientColors: ['#FFFFFF'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [hayBale, windmill, poppies, lavender, sheaf, rabbit, tractor, plankBridge('#D2A06A', '#BE8C58', '#9A6A42'), lilyPadsProp('#FFFFFF')],
  tuft(ctx, s) {
    // Ears of wheat.
    ctx.strokeStyle = '#D9B04A';
    ctx.lineWidth = 0.012;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(k * s * 0.15, s * 0.4);
      ctx.lineTo(k * s * 0.25, -s * 0.5);
    }
    ctx.stroke();
    for (let k = -1; k <= 1; k++) ellipse(ctx, k * s * 0.27, -s * 0.62, s * 0.07, s * 0.2, k * 0.2, '#E8C060');
  },
  scenery(ctx, w, h) {
    sun(ctx, w * 0.2, h * 0.12, Math.min(w, h) * 0.06, 'rgba(255, 230, 150, ALPHA)');
    // The windmills stand on the far hill, whose crest hides their foot.
    windmillSilhouette(ctx, w * 0.78, h * 0.88, 1, '#D9BE8C');
    windmillSilhouette(ctx, w * 0.14, h * 0.885, 0.7, '#E0C89C');
    fields(ctx, w, h, h * 0.875, ['#F2D47A', '#C4DC86', '#C4AEEA', '#EDC46A', '#D8E59A']);
  },
};
