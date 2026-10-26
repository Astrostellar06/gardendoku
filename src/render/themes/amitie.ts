/** Friendship garden: heart topiaries, picnics, bunny pairs, heart balloons and paper boats. */
import { SPRING } from '../palette';
import { benchProp, bridgeProp, lilyPadsProp, swimOffset } from './common';
import { circle, ellipse, eyes, glow, groundShadow, heart, line, poly, rrect, TAU } from './kit';
import { clouds, hill, rainbow } from './scenery';
import type { PropDef, Theme } from './types';

const PINK = '#FF7FA8';
const LILAC = '#C4A4F8';

const heartTopiary: PropDef = {
  id: 'heart-topiary',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.45);
    rrect(ctx, -r * 0.3, r * 0.5, r * 0.6, r * 0.45, r * 0.08, v > 0.5 ? '#FFC1D6' : '#D9C6FF');
    rrect(ctx, -r * 0.36, r * 0.45, r * 0.72, r * 0.12, r * 0.05, '#FFFFFF');
    line(ctx, 0, r * 0.5, 0, -r * 0.05, r * 0.1, '#9A6A52');
    heart(ctx, 0, -r * 0.5, r * 0.55, '#5FB45B');
    heart(ctx, -r * 0.05, -r * 0.55, r * 0.42, '#78C266');
    circle(ctx, -r * 0.28, -r * 0.7, r * 0.1, 'rgba(255,255,255,0.3)');
    if (bloom > 0.4) {
      ctx.globalAlpha = Math.min(1, (bloom - 0.4) * 2);
      for (const [x, y] of [
        [-0.35, -0.6],
        [0.3, -0.7],
        [0.05, -0.3],
        [-0.1, -0.85],
        [0.35, -0.4],
      ]) {
        circle(ctx, x * r, y * r, r * 0.07, '#FF8FB6');
      }
      ctx.globalAlpha = 1;
    }
  },
};

const picnic: PropDef = {
  id: 'picnic',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate((v - 0.5) * 0.8);
    rrect(ctx, -r * 0.82, -r * 0.62, r * 1.7, r * 1.3, r * 0.08, 'rgba(120,60,80,0.15)');
    rrect(ctx, -r * 0.85, -r * 0.65, r * 1.7, r * 1.3, r * 0.08, '#FFFFFF');
    // Gingham checks.
    ctx.fillStyle = 'rgba(255,111,152,0.45)';
    for (let k = 0; k < 4; k++) {
      ctx.fillRect(-r * 0.85 + k * r * 0.45, -r * 0.65, r * 0.22, r * 1.3);
      ctx.fillRect(-r * 0.85, -r * 0.65 + k * r * 0.35, r * 1.7, r * 0.17);
    }
    // Basket and two cups.
    rrect(ctx, -r * 0.45, -r * 0.35, r * 0.6, r * 0.42, r * 0.08, '#D9A066');
    ctx.strokeStyle = '#B97F4E';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.arc(-r * 0.15, -r * 0.35, r * 0.22, Math.PI, 0);
    ctx.stroke();
    circle(ctx, r * 0.4, -r * 0.2, r * 0.13, '#FFD45A');
    circle(ctx, r * 0.45, r * 0.25, r * 0.13, '#8DC8FF');
    heart(ctx, -r * 0.2, r * 0.32, r * 0.14, '#FF5C8A');
  },
};

const balloons: PropDef = {
  id: 'heart-balloons',
  place: 'ground',
  size: [0.06, 0.08],
  weight: 2,
  when: 'bloom',
  upright: true,
  animated: true,
  draw(ctx, { r, time, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.25);
    rrect(ctx, -r * 0.08, r * 0.8, r * 0.16, r * 0.16, r * 0.04, '#9A6A52');
    const colors = [PINK, LILAC, '#FFC94D'];
    for (let k = 0; k < 2; k++) {
      const sway = Math.sin(time * 1.2 + v * 9 + k * 2) * r * 0.12;
      const x = (k ? 0.35 : -0.3) * r + sway;
      const y = -r * (k ? 0.95 : 0.75) + Math.sin(time * 1.6 + k) * r * 0.05;
      ctx.strokeStyle = 'rgba(122,99,134,0.6)';
      ctx.lineWidth = r * 0.03;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.82);
      ctx.quadraticCurveTo(x * 0.5, r * 0.1, x, y + r * 0.3);
      ctx.stroke();
      heart(ctx, x, y, r * 0.32, colors[Math.floor(v * 3 + k) % 3]);
      circle(ctx, x - r * 0.12, y - r * 0.08, r * 0.06, 'rgba(255,255,255,0.6)');
    }
  },
};

const bunnies: PropDef = {
  id: 'bunny-pair',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.75);
    const one = (x: number, dir: number, fur: string) => {
      ellipse(ctx, x, r * 0.5, r * 0.32, r * 0.38, 0, fur);
      circle(ctx, x + dir * r * 0.05, 0, r * 0.25, fur);
      ellipse(ctx, x - r * 0.08, -r * 0.42, r * 0.07, r * 0.25, -0.15, fur);
      ellipse(ctx, x + r * 0.1, -r * 0.42, r * 0.07, r * 0.25, 0.15, fur);
      ellipse(ctx, x - r * 0.08, -r * 0.4, r * 0.03, r * 0.16, -0.15, '#FFC1D6');
      ellipse(ctx, x + r * 0.1, -r * 0.4, r * 0.03, r * 0.16, 0.15, '#FFC1D6');
      eyes(ctx, x + dir * r * 0.1, -r * 0.02, r * 0.07, r * 0.035);
      circle(ctx, x + dir * r * 0.2, r * 0.08, r * 0.05, 'rgba(255,140,170,0.6)');
      circle(ctx, x - dir * r * 0.3, r * 0.6, r * 0.1, '#FFFFFF');
    };
    one(-r * 0.32, 1, '#FFFFFF');
    one(r * 0.32, -1, v > 0.5 ? '#E9D3C2' : '#D9D2E6');
    heart(ctx, 0, -r * 0.62, r * 0.16, '#FF5C8A');
  },
};

const letter: PropDef = {
  id: 'love-letter',
  place: 'ground',
  size: [0.05, 0.06],
  weight: 1,
  when: 'always',
  draw(ctx, { r, v }) {
    ctx.rotate((v - 0.5) * 1.2);
    rrect(ctx, -r * 0.78, -r * 0.48, r * 1.6, r * 1.05, r * 0.08, 'rgba(120,60,80,0.15)');
    rrect(ctx, -r * 0.8, -r * 0.52, r * 1.6, r * 1.05, r * 0.08, '#FFF8F0');
    poly(ctx, [-r * 0.8, -r * 0.5, 0, r * 0.1, r * 0.8, -r * 0.5], '#F3E4D8');
    heart(ctx, 0, r * 0.05, r * 0.2, '#FF5C8A');
  },
};

const heartLamp: PropDef = {
  id: 'heart-lamp',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.3);
    rrect(ctx, -r * 0.2, r * 0.8, r * 0.4, r * 0.15, r * 0.05, '#9C7BB8');
    line(ctx, 0, r * 0.85, 0, -r * 0.5, r * 0.08, '#9C7BB8');
    ctx.strokeStyle = '#9C7BB8';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(r * 0.18, -r * 0.5, r * 0.18, Math.PI, 0);
    ctx.stroke();
    line(ctx, r * 0.36, -r * 0.5, r * 0.36, -r * 0.4, r * 0.04, '#9C7BB8');
    glow(ctx, r * 0.36, -r * 0.2, r * 0.6, '255,170,200', bloom * 0.6);
    heart(ctx, r * 0.36, -r * 0.22, r * 0.22, bloom > 0.5 ? '#FFB1CB' : '#F3D3E0');
  },
};

const paperBoat: PropDef = {
  id: 'paper-boat',
  place: 'water',
  size: [0.05, 0.06],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y } = swimOffset(time * 0.6, v, 0.06);
    ctx.translate(0, y);
    ctx.rotate(Math.sin(time * 1.5 + v * 7) * 0.15);
    ellipse(ctx, 0, 0, r * 0.6, r * 0.9, 0, 'rgba(40,80,120,0.15)');
    poly(ctx, [-r * 0.45, -r * 0.8, r * 0.45, -r * 0.8, r * 0.3, r * 0.8, -r * 0.3, r * 0.8], v > 0.5 ? '#FFFFFF' : '#FFE3EC');
    poly(ctx, [-r * 0.45, -r * 0.8, 0, 0, -r * 0.3, r * 0.8], 'rgba(200,180,200,0.35)');
    poly(ctx, [0, -r * 0.5, r * 0.3, 0, 0, r * 0.5, -r * 0.3, 0], '#F3E4F0');
    heart(ctx, 0, 0, r * 0.12, '#FF7FA8');
  },
};

export const amitie: Theme = {
  id: 'amitie',
  name: "Jardin de l'amitié",
  blurb: 'Pique-niques, lapins câlins et ballons en cœur',
  palette: {
    ...SPRING,
    bgTop: '#FFCFE6',
    bgMid: '#FFF0F6',
    bgBottom: '#E2D8FF',
    bokeh: ['255,150,190', '255,200,220', '200,170,250', '255,220,150'],
    bedShadow: 'rgba(220, 110, 170, 0.3)',
    tileShadow: 'rgba(180, 90, 140, 0.4)',
    soil: '#FAD6C8',
    soilLight: '#FFE6DC',
    soilDark: '#EFBFAD',
    soilSide: '#E8AA96',
    soilSideDark: '#DA9682',
    pebble: '#FFF4F6',
    pebbleShade: '#E3B0A6',
    grass: '#A8E3B0',
    grassLight: '#C8F0CC',
    grassDark: '#8CD498',
    grassDeep: '#62BC7A',
    grassSide: '#7CC78C',
    grassSideDark: '#68B47A',
    rim: '#FFF8FA',
    rimShade: '#E0A8A0',
    groove: '#ECB4A4',
    grooveDeep: '#DE9A8A',
    water: '#86D2FF',
    waterDeep: '#5CB6F2',
    petals: ['#FF7FA8', '#FFB1CB', '#FFFFFF', '#C4A4F8', '#FF5C8A', '#FFD45A'],
    centers: ['#FFE07A', '#FFFFFF', '#FF8DAF'],
    lotus: ['#FF97BE', '#FFBCD3', '#FFFFFF', '#D2B5FF'],
  },
  ambient: 'hearts',
  ambientColors: ['#FF9EC0', '#FFC2D8', '#FFFFFF', '#E3CCFF'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    heartTopiary,
    picnic,
    benchProp('friend-bench', '#FFB1CB', '#9C7BB8'),
    balloons,
    bunnies,
    letter,
    heartLamp,
    bridgeProp('friend-bridge', { deck: '#FFE6EE', deckShade: '#F2BACD', side: '#F28BAA', rail: '#FFFFFF', cap: '#FF7FA8', hump: 0.07 }),
    paperBoat,
    lilyPadsProp('#FF8FB6'),
  ],
  smallFlower(ctx, r, color, center) {
    // Heart-shaped blossoms.
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate((k / 4) * TAU);
      heart(ctx, 0, -r * 0.45, r * 0.32, color);
      ctx.restore();
    }
    circle(ctx, 0, 0, r * 0.22, center);
  },
  scenery(ctx, w, h) {
    rainbow(ctx, w * 0.5, h * 0.92, Math.min(w, h) * 0.55, 0.28);
    clouds(ctx, w, h);
    // Two heart balloons drifting away.
    for (const [x, y, s, c] of [[0.86, 0.2, 9, '#FF9EC0'], [0.92, 0.25, 7, '#D9C2FF']] as const) {
      line(ctx, w * x, h * y + s * 0.8, w * x - 4, h * y + s * 3.5, 1, 'rgba(122,99,134,0.4)');
      heart(ctx, w * x, h * y, s, c);
    }
    hill(ctx, w, h, h * 0.9, 16, 'rgba(236, 200, 255, 0.85)', 0.4);
    hill(ctx, w, h, h * 0.95, 12, 'rgba(255, 190, 215, 0.9)', 2.2);
  },
};
