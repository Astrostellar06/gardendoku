/** Rose garden: rose bushes, rose arches, bird baths, white benches, stone urns and floating petals. */
import { grassFrom, SPRING } from '../palette';
import { benchProp, bridgeProp, treeProp } from './common';
import { circle, ellipse, groundShadow, leaf, line, rrect, TAU } from './kit';
import { clouds, hill } from './scenery';
import type { PropDef, Theme } from './types';

const ROSES = ['#FF6F91', '#FF9EB5', '#E84A6F', '#FFFFFF', '#FFC2D1', '#FFB38A'];

/** A little rose: spiral of petals seen from above. */
function rose(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  circle(ctx, x, y, s, color);
  ctx.strokeStyle = 'rgba(120, 30, 60, 0.28)';
  ctx.lineWidth = s * 0.18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.62, 0.3, 4.2);
  ctx.moveTo(x + s * 0.3, y);
  ctx.arc(x, y, s * 0.3, 0, 4.7);
  ctx.stroke();
  circle(ctx, x - s * 0.35, y - s * 0.35, s * 0.2, 'rgba(255,255,255,0.35)');
}

const roseBush: PropDef = {
  id: 'rose-bush',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 4,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom, v }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.7);
    for (const [x, y, s] of [
      [-0.4, 0.35, 0.38],
      [0.4, 0.38, 0.36],
      [0, 0.0, 0.45],
      [-0.2, 0.5, 0.32],
      [0.22, 0.55, 0.3],
    ]) {
      circle(ctx, x * r, y * r, s * r, '#4E9E5E');
      circle(ctx, x * r - s * r * 0.25, y * r - s * r * 0.3, s * r * 0.55, '#62B370');
    }
    if (bloom < 0.3) return;
    ctx.globalAlpha = Math.min(1, (bloom - 0.3) * 2);
    const c = ROSES[Math.floor(v * ROSES.length)];
    for (const [x, y, s] of [
      [-0.35, 0.2, 0.18],
      [0.1, -0.2, 0.2],
      [0.4, 0.3, 0.17],
      [-0.05, 0.45, 0.15],
      [-0.3, -0.1, 0.13],
    ]) {
      rose(ctx, x * r, y * r, s * r, c);
    }
    ctx.globalAlpha = 1;
  },
};

const roseArch: PropDef = {
  id: 'rose-arch',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.85);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.95);
    ctx.lineTo(-r * 0.7, -r * 0.2);
    ctx.arc(0, -r * 0.2, r * 0.7, Math.PI, 0);
    ctx.lineTo(r * 0.7, r * 0.95);
    ctx.stroke();
    ctx.strokeStyle = '#E8DCE4';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const y = r * 0.8 - k * r * 0.25;
      ctx.moveTo(-r * 0.78, y);
      ctx.lineTo(-r * 0.62, y);
      ctx.moveTo(r * 0.62, y);
      ctx.lineTo(r * 0.78, y);
    }
    ctx.stroke();
    // Climbing foliage, then roses with the water.
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI + (k / 10) * Math.PI;
      const x = Math.cos(a) * r * 0.7;
      const y = -r * 0.2 + Math.sin(a) * r * 0.7;
      leaf(ctx, x, y, r * 0.22, r * 0.1, a + Math.PI / 2 + (k % 2 ? 0.6 : -0.6), '#5FB45B');
    }
    for (const side of [-1, 1]) for (let k = 0; k < 4; k++) leaf(ctx, side * r * 0.7, r * 0.7 - k * r * 0.25, r * 0.2, r * 0.09, side * (k % 2 ? 0.9 : 2.2), '#4E9E5E');
    if (bloom < 0.3) return;
    ctx.globalAlpha = Math.min(1, (bloom - 0.3) * 2);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + ((k + 0.5) / 7) * Math.PI;
      rose(ctx, Math.cos(a) * r * 0.7, -r * 0.2 + Math.sin(a) * r * 0.7, r * 0.13, ROSES[(Math.floor(v * 6) + k) % 3]);
    }
    for (const side of [-1, 1]) rose(ctx, side * r * 0.7, r * 0.3, r * 0.12, ROSES[Math.floor(v * 3)]);
    ctx.globalAlpha = 1;
  },
};

const birdBath: PropDef = {
  id: 'bird-bath',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    const stone = '#E8E0DA';
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    rrect(ctx, -r * 0.4, r * 0.75, r * 0.8, r * 0.2, r * 0.06, stone);
    rrect(ctx, -r * 0.14, -r * 0.1, r * 0.28, r * 0.9, r * 0.08, stone);
    ellipse(ctx, 0, -r * 0.15, r * 0.75, r * 0.22, 0, stone);
    ellipse(ctx, 0, -r * 0.2, r * 0.6, r * 0.14, 0, bloom > 0.3 ? '#8FD8F7' : '#D6CCC4');
    ellipse(ctx, -r * 0.2, -r * 0.22, r * 0.2, r * 0.04, 0, 'rgba(255,255,255,0.55)');
    if (bloom > 0.6) {
      // A little robin perched on the rim.
      ellipse(ctx, r * 0.5, -r * 0.42, r * 0.2, r * 0.15, -0.2, '#9A7A6A');
      ellipse(ctx, r * 0.55, -r * 0.38, r * 0.12, r * 0.1, 0, '#FF8A5A');
      circle(ctx, r * 0.66, -r * 0.55, r * 0.11, '#9A7A6A');
      circle(ctx, r * 0.7, -r * 0.57, r * 0.025, '#3E3440');
      line(ctx, r * 0.76, -r * 0.55, r * 0.84, -r * 0.53, r * 0.03, '#E8A06A');
    }
  },
};

const urn: PropDef = {
  id: 'rose-urn',
  place: 'ground',
  size: [0.07, 0.09],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    rrect(ctx, -r * 0.35, r * 0.6, r * 0.7, r * 0.35, r * 0.05, '#D9CFC6');
    rrect(ctx, -r * 0.1, r * 0.3, r * 0.2, r * 0.32, r * 0.04, '#E8E0DA');
    ctx.fillStyle = '#E8E0DA';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.35, 0, r * 0.35);
    ctx.quadraticCurveTo(r * 0.5, r * 0.35, r * 0.55, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    rrect(ctx, -r * 0.6, -r * 0.28, r * 1.2, r * 0.12, r * 0.05, '#F4EEEA');
    for (const [x, y] of [[-0.35, -0.38], [0.05, -0.5], [0.4, -0.36], [-0.55, -0.1], [0.58, -0.05]]) circle(ctx, x * r, y * r, r * 0.18, '#5FB45B');
    if (bloom > 0.3) {
      ctx.globalAlpha = Math.min(1, (bloom - 0.3) * 2);
      for (const [x, y] of [[-0.3, -0.42], [0.1, -0.55], [0.42, -0.38], [-0.58, -0.05]]) rose(ctx, x * r, y * r, r * 0.13, ROSES[Math.floor(v * 4)]);
      ctx.globalAlpha = 1;
    }
  },
};

const floatingPetals: PropDef = {
  id: 'floating-petals',
  place: 'water',
  size: [0.05, 0.06],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v, water }) {
    if (water < 1) return;
    for (let k = 0; k < 5; k++) {
      const a = v * TAU + k * 2.1;
      const x = Math.cos(a) * r * 0.5;
      const y = Math.sin(a * 1.3) * r * 0.9;
      ellipse(ctx, x, y, r * 0.18, r * 0.11, a, ROSES[(k + Math.floor(v * 6)) % ROSES.length]);
    }
  },
};

export const roseraie: Theme = {
  id: 'roseraie',
  name: 'Roseraie',
  blurb: 'Rosiers, arches fleuries et bains d’oiseaux',
  palette: {
    ...SPRING,
    bgTop: '#FFD6E0',
    bgMid: '#FFF3F2',
    bgBottom: '#D6EDD0',
    bokeh: ['255,140,170', '255,190,205', '255,220,200', '190,230,180'],
    bedShadow: 'rgba(210, 110, 140, 0.3)',
    tileShadow: 'rgba(170, 80, 110, 0.4)',
    soil: '#F2D4C0',
    soilLight: '#FAE4D6',
    soilDark: '#E6BFA8',
    soilSide: '#DCA990',
    soilSideDark: '#CC967C',
    pebble: '#FFF6F2',
    pebbleShade: '#D9AE98',
    ...grassFrom(120, 0.46, 0.66),
    rim: '#FFF9F6',
    rimShade: '#D6A894',
    groove: '#E6B6A0',
    grooveDeep: '#D69E88',
    water: '#7CCEF5',
    waterDeep: '#4FB2EA',
    petals: ['#FF6F91', '#FF9EB5', '#FFC2D1', '#FFFFFF', '#E84A6F', '#FFB38A'],
    centers: ['#FFE07A', '#FFFFFF'],
    lotus: ['#FF97BE', '#FFBCD3', '#FFFFFF'],
  },
  ambient: 'petals',
  ambientColors: ['#FF9EB5', '#FFC2D1', '#FFFFFF', '#FF6F91'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    roseBush,
    roseArch,
    birdBath,
    treeProp('rose-topiary', { foliage: ['#4E9E5E', '#62B370'], trunk: '#7A5547', shape: 'ball', pot: '#E8D9CC' }, 2),
    benchProp('white-bench', '#FFFFFF', '#C9BFD6'),
    urn,
    bridgeProp('white-bridge', { deck: '#FFF7F2', deckShade: '#E8D6CE', side: '#E2CFC6', rail: '#FFFFFF', cap: '#FF9EB5', hump: 0.06, vines: '#5FB45B' }),
    floatingPetals,
  ],
  smallFlower(ctx, r, color) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      circle(ctx, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.42, color);
    }
    rose(ctx, 0, 0, r * 0.45, color);
  },
  scenery(ctx, w, h) {
    clouds(ctx, w, h);
    hill(ctx, w, h, h * 0.9, 14, 'rgba(160, 214, 150, 0.9)', 0.7);
    // White gazebo on the lawn.
    const gx = w * 0.74;
    const gy = h * 0.915;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(gx - 30, gy - 6, 60, 6);
    for (const dx of [-24, -8, 8, 24]) ctx.fillRect(gx + dx - 2, gy - 40, 4, 34);
    ctx.fillStyle = '#F7B8C8';
    ctx.beginPath();
    ctx.moveTo(gx - 34, gy - 40);
    ctx.quadraticCurveTo(gx - 10, gy - 48, gx, gy - 66);
    ctx.quadraticCurveTo(gx + 10, gy - 48, gx + 34, gy - 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(gx - 34, gy - 42, 68, 4);
    circle(ctx, gx, gy - 68, 3, '#FFFFFF');
    // Rose arches.
    for (const ax of [w * 0.16, w * 0.33]) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax - 12, gy);
      ctx.lineTo(ax - 12, gy - 24);
      ctx.arc(ax, gy - 24, 12, Math.PI, 0);
      ctx.lineTo(ax + 12, gy);
      ctx.stroke();
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        circle(ctx, ax + Math.cos(a) * 12, gy - 24 + Math.sin(a) * 12, 3, k % 2 ? '#FF6F91' : '#FFB3C6');
      }
    }
    // A low hedge dotted with roses.
    for (let x = 0, k = 0; x < w + 20; x += 22, k++) {
      const y = h * 0.935 + Math.sin(x / 40) * 3;
      circle(ctx, x, y, 16, '#7CC274');
      circle(ctx, x - 5, y - 6, 7, '#8ED084');
      circle(ctx, x + 4, y - 9, 3.5, ROSES[k % 3]);
      if (k % 2) circle(ctx, x - 7, y - 2, 3, ROSES[(k + 1) % 3]);
    }
    hill(ctx, w, h, h * 0.96, 8, 'rgba(120, 190, 110, 0.95)', 2.2);
  },
};
