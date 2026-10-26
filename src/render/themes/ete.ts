/** Summer: sunflowers, parasols, watermelon, lemonade stands, sandcastles and pool floats. */
import { SPRING } from '../palette';
import { plankBridge, swimOffset } from './common';
import { circle, ellipse, eyes, groundShadow, leaf, line, poly, rrect, TAU } from './kit';
import { cloud, sun } from './scenery';
import type { PropDef, Theme } from './types';

const sunflowers: PropDef = {
  id: 'sunflowers',
  place: 'ground',
  size: [0.09, 0.12],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.6);
    for (const [x, h, s] of [
      [-0.4, 0.8, 0.8],
      [0.1, 1.1, 1],
      [0.5, 0.7, 0.75],
    ]) {
      const top = r * 0.9 - r * 1.5 * h;
      line(ctx, x * r, r * 0.9, x * r, top, r * 0.08, '#5FA84A');
      leaf(ctx, x * r, r * 0.3, r * 0.4, r * 0.15, 1.1, '#6FB85A');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        ellipse(ctx, x * r + Math.cos(a) * r * 0.24 * s, top + Math.sin(a) * r * 0.24 * s, r * 0.13 * s, r * 0.06 * s, a, '#FFC93A');
      }
      circle(ctx, x * r, top, r * 0.16 * s, '#8A5A3A');
      circle(ctx, x * r - r * 0.04, top - r * 0.04, r * 0.06 * s, '#A87048');
    }
  },
};

const parasol: PropDef = {
  id: 'parasol',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    const colors = v > 0.5 ? ['#FF7A8A', '#FFFFFF'] : ['#4FC3E8', '#FFFFFF'];
    ellipse(ctx, 0, r * 0.75, r * 0.85, r * 0.3, 0, 'rgba(70,45,40,0.16)');
    rrect(ctx, -r * 0.7, r * 0.55, r * 1.1, r * 0.35, r * 0.06, v > 0.5 ? '#FFD45A' : '#B9A0F2');
    rrect(ctx, -r * 0.7, r * 0.66, r * 1.1, r * 0.06, r * 0.02, 'rgba(255,255,255,0.6)');
    line(ctx, r * 0.06, r * 0.85, 0, -r * 0.9, r * 0.06, '#F2F2F2');
    // Dome canopy with a scalloped edge, cut into coloured gores.
    const edge = -r * 0.32;
    const n = 6;
    const xs = Array.from({ length: n + 1 }, (_, k) => -r * 0.9 + (k * r * 1.8) / n);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xs[0], edge);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.95, 0, -r * 0.95);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.95, xs[n], edge);
    for (let k = n; k > 0; k--) ctx.quadraticCurveTo((xs[k] + xs[k - 1]) / 2, edge + r * 0.12, xs[k - 1], edge);
    ctx.closePath();
    ctx.fillStyle = colors[1];
    ctx.fill();
    ctx.clip();
    for (let k = 0; k < n; k += 2) poly(ctx, [0, -r * 0.95, xs[k] * 1.1, edge + r * 0.2, xs[k + 1] * 1.1, edge + r * 0.2], colors[0]);
    ellipse(ctx, -r * 0.35, -r * 0.7, r * 0.3, r * 0.1, -0.3, 'rgba(255,255,255,0.3)');
    ctx.restore();
    circle(ctx, 0, -r * 0.97, r * 0.06, colors[0]);
  },
};

const watermelon: PropDef = {
  id: 'watermelon',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.82, r * 0.85);
    // Two slices standing point up, rind at the bottom.
    const slice = (x: number, rot: number) => {
      ctx.save();
      ctx.translate(x, r * 0.75);
      ctx.rotate(rot);
      const sector = (rad: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.25);
        ctx.arc(0, -r * 1.25, rad, Math.PI / 3, (Math.PI * 2) / 3);
        ctx.closePath();
        ctx.fill();
      };
      sector(r * 1.25, '#4E9E4A');
      sector(r * 1.16, '#C8EBA0');
      sector(r * 1.1, '#FF6F7F');
      for (const [sx, sy] of [[-0.12, -0.35], [0.12, -0.35], [0, -0.6], [-0.2, -0.15], [0.2, -0.15]]) ellipse(ctx, sx * r, sy * r, r * 0.035, r * 0.06, sx, '#3E3440');
      ctx.restore();
    };
    slice(-r * 0.35, -0.25 + v * 0.15);
    slice(r * 0.35, 0.2 - v * 0.15);
  },
};

const lemonade: PropDef = {
  id: 'lemonade-stand',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.8);
    for (const x of [-0.65, 0.55]) rrect(ctx, x * r, -r * 0.75, r * 0.1, r * 1.65, r * 0.03, '#D9A066');
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? '#FFFFFF' : '#FFD045';
      ctx.fillRect(-r * 0.75 + k * r * 0.3, -r * 0.85, r * 0.3, r * 0.25);
    }
    rrect(ctx, -r * 0.7, r * 0.05, r * 1.4, r * 0.85, r * 0.06, '#FFE9A0');
    rrect(ctx, -r * 0.7, r * 0.05, r * 1.4, r * 0.14, r * 0.04, '#E8C068');
    // Pitcher and a lemon.
    rrect(ctx, -r * 0.35, -r * 0.32, r * 0.3, r * 0.38, r * 0.08, 'rgba(255,255,255,0.85)');
    rrect(ctx, -r * 0.32, -r * 0.15, r * 0.24, r * 0.18, r * 0.06, '#FFE066');
    ellipse(ctx, r * 0.25, -r * 0.05, r * 0.16, r * 0.11, 0, '#FFD045');
    circle(ctx, 0, r * 0.5, r * 0.12, '#FFD045');
    circle(ctx, 0, r * 0.5, r * 0.07, '#FFF2A8');
  },
};

const deckchair: PropDef = {
  id: 'deckchair',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    const stripe = v > 0.5 ? '#4FC3E8' : '#FF8FB6';
    const wood = '#C98A5A';
    groundShadow(ctx, 0, r * 0.9, r * 0.8);
    // Seen from the front: reclined back, then the seat, in a wooden frame.
    line(ctx, -r * 0.5, -r * 0.75, -r * 0.62, r * 0.9, r * 0.08, wood);
    line(ctx, r * 0.5, -r * 0.75, r * 0.62, r * 0.9, r * 0.08, wood);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.7);
    ctx.lineTo(r * 0.45, -r * 0.7);
    ctx.lineTo(r * 0.55, r * 0.2);
    ctx.lineTo(r * 0.6, r * 0.45);
    ctx.lineTo(-r * 0.6, r * 0.45);
    ctx.lineTo(-r * 0.55, r * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = stripe;
    for (let k = 0; k < 4; k++) ctx.fillRect(-r * 0.6 + k * r * 0.34, -r, r * 0.17, r * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(-r, r * 0.2, r * 2, r * 0.3);
    ctx.restore();
    line(ctx, -r * 0.62, r * 0.25, r * 0.62, r * 0.25, r * 0.06, '#B57846');
    line(ctx, -r * 0.5, -r * 0.74, r * 0.5, -r * 0.74, r * 0.06, wood);
  },
};

const sandcastle: PropDef = {
  id: 'sandcastle',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.92, r * 0.8);
    const sand = '#F2CF8E';
    const shade = '#DDB474';
    rrect(ctx, -r * 0.7, r * 0.2, r * 1.4, r * 0.72, r * 0.05, sand);
    for (const x of [-0.7, 0.35]) {
      rrect(ctx, x * r, -r * 0.3, r * 0.35, r * 1.2, r * 0.04, sand);
      for (let k = 0; k < 3; k++) rrect(ctx, x * r + k * r * 0.13, -r * 0.4, r * 0.09, r * 0.12, r * 0.02, sand);
    }
    rrect(ctx, -r * 0.2, -r * 0.05, r * 0.4, r * 0.97, r * 0.04, shade);
    ctx.fillStyle = '#C99A5A';
    ctx.beginPath();
    ctx.arc(0, r * 0.92, r * 0.15, Math.PI, 0);
    ctx.fill();
    line(ctx, -r * 0.55, -r * 0.4, -r * 0.55, -r * 0.85, r * 0.04, '#8A6248');
    poly(ctx, [-r * 0.55, -r * 0.85, -r * 0.25, -r * 0.75, -r * 0.55, -r * 0.65], v > 0.5 ? '#FF7A8A' : '#4FC3E8');
    for (let k = 0; k < 3; k++) circle(ctx, -r * 0.5 + k * r * 0.5, r * 0.55, r * 0.04, '#FFFFFF');
  },
};

const swimRing: PropDef = {
  id: 'swim-ring',
  place: 'water',
  size: [0.05, 0.06],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y } = swimOffset(time * 0.6, v, 0.05);
    ctx.translate(0, y);
    ctx.rotate(time * 0.3 + v * 6);
    circle(ctx, 0.004, 0.006, r * 0.95, 'rgba(30,70,90,0.18)');
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = k % 2 ? '#FFFFFF' : v > 0.5 ? '#FF7A8A' : '#FFC93A';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, (k / 8) * TAU, ((k + 1) / 8) * TAU);
      ctx.arc(0, 0, r * 0.4, ((k + 1) / 8) * TAU, (k / 8) * TAU, true);
      ctx.closePath();
      ctx.fill();
    }
    ellipse(ctx, -r * 0.35, -r * 0.45, r * 0.18, r * 0.08, -0.6, 'rgba(255,255,255,0.6)');
  },
};

const rubberDuck: PropDef = {
  id: 'rubber-duck',
  place: 'water',
  size: [0.045, 0.055],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time, v);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    ctx.rotate(Math.sin(time * 2.5 + v * 9) * 0.12);
    ellipse(ctx, 0, 0, r * 0.7, r * 0.9, 0, '#FFD233');
    circle(ctx, 0, r * 0.65, r * 0.48, '#FFE04D');
    ellipse(ctx, 0, r * 1.1, r * 0.25, r * 0.14, 0, '#FF8A3A');
    eyes(ctx, 0, r * 0.75, r * 0.22, r * 0.08);
    ellipse(ctx, -r * 0.3, -r * 0.1, r * 0.2, r * 0.35, 0.3, '#FFC21A');
  },
};

export const ete: Theme = {
  id: 'ete',
  name: 'Été',
  blurb: 'Tournesols, parasols et canards en plastique',
  palette: {
    ...SPRING,
    bgTop: '#FFE6A0',
    bgMid: '#FFF7DE',
    bgBottom: '#B8ECF0',
    bokeh: ['255,210,90', '255,240,160', '120,210,240', '255,170,150'],
    bedShadow: 'rgba(210, 150, 80, 0.3)',
    tileShadow: 'rgba(160, 110, 60, 0.4)',
    soil: '#F7DCA8',
    soilLight: '#FFEAC4',
    soilDark: '#EDCA8C',
    soilSide: '#E3B878',
    soilSideDark: '#D4A664',
    pebble: '#FFF8EA',
    pebbleShade: '#DDB47C',
    grass: '#A8DE78',
    grassLight: '#C4EC98',
    grassDark: '#8ECF62',
    grassDeep: '#68B44E',
    grassSide: '#80C25C',
    grassSideDark: '#70B050',
    rim: '#FFFBF0',
    rimShade: '#DDAE74',
    groove: '#E6BC80',
    grooveDeep: '#D6A66A',
    water: '#4ED2F2',
    waterDeep: '#1FB6E2',
    petals: ['#FFC93A', '#FF7A8A', '#FFFFFF', '#FF9F43', '#4FC3E8', '#FFE066'],
    centers: ['#8A5A3A', '#FFC83A', '#FFFFFF'],
    lotus: ['#FFE066', '#FFFFFF', '#FF9FB8'],
  },
  ambient: 'pollen',
  ambientColors: ['#FFF3B0', '#FFFFFF', '#FFE07A'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.35,
  props: [sunflowers, parasol, watermelon, lemonade, deckchair, sandcastle, plankBridge('#F0C890', '#DDB078', '#C99A60'), swimRing, rubberDuck],
  scenery(ctx, w, h) {
    sun(ctx, w * 0.8, h * 0.12, Math.min(w, h) * 0.08, 'rgba(255, 220, 110, ALPHA)');
    cloud(ctx, w * 0.1, h * 0.08, 0.6);
    // Seagulls.
    ctx.strokeStyle = 'rgba(122, 99, 134, 0.45)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, y, s] of [[0.3, 0.2, 1], [0.38, 0.17, 0.7], [0.62, 0.25, 0.8]]) {
      ctx.moveTo(w * x - 8 * s, h * y);
      ctx.quadraticCurveTo(w * x - 4 * s, h * y - 5 * s, w * x, h * y);
      ctx.quadraticCurveTo(w * x + 4 * s, h * y - 5 * s, w * x + 8 * s, h * y);
    }
    ctx.stroke();
    // Sea on the horizon, a sailing boat, then the beach.
    const sea = ctx.createLinearGradient(0, h * 0.86, 0, h * 0.95);
    sea.addColorStop(0, 'rgba(140, 220, 245, 0.95)');
    sea.addColorStop(1, 'rgba(70, 190, 230, 0.95)');
    ctx.fillStyle = sea;
    ctx.fillRect(0, h * 0.86, w, h * 0.09);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let x = 10; x < w; x += 46) ctx.fillRect(x, h * 0.88 + Math.sin(x) * 4, 18, 2);
    const bx = w * 0.3;
    const by = h * 0.875;
    poly(ctx, [bx - 16, by, bx + 16, by, bx + 11, by + 6, bx - 11, by + 6], '#FF7A8A');
    poly(ctx, [bx - 1, by - 2, bx - 1, by - 30, bx - 16, by - 2], '#FFFFFF');
    poly(ctx, [bx + 2, by - 2, bx + 2, by - 24, bx + 13, by - 2], '#FFF2C2');
    ctx.fillStyle = 'rgba(250, 222, 170, 0.95)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, h * 0.93 + Math.sin(x / 70) * 5);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // Palm tree leaning over the beach.
    const px = w * 0.88;
    const py = h * 0.95;
    ctx.strokeStyle = '#C9965E';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px - 4, py - 40, px - 16, py - 70);
    ctx.stroke();
    for (const a of [-2.6, -2.0, -1.2, -0.5, 0.3]) leaf(ctx, px - 16, py - 70, 38, 9, a + Math.PI / 2, '#5FB45B');
    circle(ctx, px - 14, py - 66, 4, '#8A5A3A');
    circle(ctx, px - 20, py - 65, 4, '#8A5A3A');
  },
};
