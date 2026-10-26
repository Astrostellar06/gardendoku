/** Japanese garden: raked gravel, moss, red bridges, stone lanterns, pagodas and koi. */
import { SPRING } from '../palette';
import { rockProp, swimOffset } from './common';
import { circle, ellipse, glow, groundShadow, leaf, line, poly, rrect, TAU } from './kit';
import { clouds, hill, mountain } from './scenery';
import type { PropDef, Theme } from './types';

const RED = '#E8574F';
const RED_DARK = '#C9443E';
const ROOF = '#5E6B7A';

const redBridge: PropDef = {
  id: 'red-bridge',
  place: 'canal',
  size: [0.07, 0.085],
  weight: 1,
  when: 'always',
  draw(ctx, { r }) {
    const half = 0.23;
    ellipse(ctx, 0.012, r * 0.25, half, r * 1.15, 0, 'rgba(60,30,30,0.2)');
    // Arched deck: lighter in the middle.
    const g = ctx.createLinearGradient(-half, 0, half, 0);
    g.addColorStop(0, '#C9A27A');
    g.addColorStop(0.5, '#F0D2A8');
    g.addColorStop(1, '#C9A27A');
    rrect(ctx, -half, -r * 0.85, half * 2, r * 1.7, r * 0.3, g);
    // Rails bow outward in the middle, like an arched (taiko) bridge seen from above.
    for (const side of [-1, 1]) {
      const y = side * r * 0.9;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 0.03;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-half, y);
      ctx.quadraticCurveTo(0, y + side * r * 0.45, half, y);
      ctx.stroke();
      for (const x of [-half + 0.01, half - 0.01]) circle(ctx, x, y, 0.028, RED_DARK);
      circle(ctx, 0, y + side * r * 0.22, 0.022, '#F0C04A');
    }
  },
};

const lantern: PropDef = {
  id: 'stone-lantern',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 3,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    const stone = '#CFC8BE';
    const shade = '#ABA295';
    groundShadow(ctx, 0, r * 0.92, r * 0.55);
    rrect(ctx, -r * 0.42, r * 0.7, r * 0.84, r * 0.25, r * 0.06, shade);
    rrect(ctx, -r * 0.14, r * 0.05, r * 0.28, r * 0.68, r * 0.05, stone);
    rrect(ctx, -r * 0.38, -r * 0.1, r * 0.76, r * 0.18, r * 0.05, shade);
    rrect(ctx, -r * 0.3, -r * 0.48, r * 0.6, r * 0.4, r * 0.06, stone);
    // Light window, glowing once the garden is alive.
    rrect(ctx, -r * 0.16, -r * 0.4, r * 0.32, r * 0.24, r * 0.04, bloom > 0.5 ? '#FFE9A3' : '#8C8478');
    if (bloom > 0.5) glow(ctx, 0, -r * 0.28, r * 0.75, '255,220,120', 0.45 * bloom);
    poly(ctx, [-r * 0.62, -r * 0.48, 0, -r * 0.82, r * 0.62, -r * 0.48], shade);
    circle(ctx, 0, -r * 0.9, r * 0.1, shade);
  },
};

const pagoda: PropDef = {
  id: 'pagoda',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.6);
    const tiers = 3;
    for (let k = 0; k < tiers; k++) {
      const w = r * (0.62 - k * 0.14);
      const base = r * 0.95 - k * r * 0.55;
      rrect(ctx, -w * 0.62, base - r * 0.34, w * 1.24, r * 0.34, r * 0.04, k === 0 ? '#F4E6D2' : RED);
      if (k === 0) rrect(ctx, -w * 0.18, base - r * 0.3, w * 0.36, r * 0.3, r * 0.05, RED_DARK);
      ctx.fillStyle = ROOF;
      ctx.beginPath();
      ctx.moveTo(-w - r * 0.08, base - r * 0.3);
      ctx.quadraticCurveTo(-w * 0.5, base - r * 0.38, -w * 0.4, base - r * 0.52);
      ctx.lineTo(w * 0.4, base - r * 0.52);
      ctx.quadraticCurveTo(w * 0.5, base - r * 0.38, w + r * 0.08, base - r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    line(ctx, 0, r * 0.95 - 3 * r * 0.55 + r * 0.1, 0, -r * 0.98, r * 0.06, ROOF);
    circle(ctx, 0, -r * 0.78, r * 0.06, '#F0C04A');
  },
};

const torii: PropDef = {
  id: 'torii',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.9, r * 0.7, r * 0.22);
    rrect(ctx, -r * 0.55, -r * 0.45, r * 0.16, r * 1.35, r * 0.05, RED);
    rrect(ctx, r * 0.39, -r * 0.45, r * 0.16, r * 1.35, r * 0.05, RED);
    rrect(ctx, -r * 0.72, -r * 0.42, r * 1.44, r * 0.14, r * 0.04, RED_DARK);
    ctx.fillStyle = '#3F3A44';
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.72);
    ctx.quadraticCurveTo(0, -r * 0.58, r * 0.95, -r * 0.72);
    ctx.lineTo(r * 0.85, -r * 0.58);
    ctx.quadraticCurveTo(0, -r * 0.48, -r * 0.85, -r * 0.58);
    ctx.closePath();
    ctx.fill();
    rrect(ctx, -r * 0.85, -r * 0.6, r * 1.7, r * 0.12, r * 0.04, RED);
  },
};

const steppingStones: PropDef = {
  id: 'stepping-stones',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * r * 0.62;
      const y = Math.sin(k * 2 + v * 5) * r * 0.25;
      ellipse(ctx, x + 0.006, y + 0.01, r * 0.32, r * 0.26, k, '#A89F92');
      ellipse(ctx, x, y, r * 0.3, r * 0.24, k, '#D9D2C6');
    }
  },
};

const sakura: PropDef = {
  id: 'sakura',
  place: 'ground',
  size: [0.11, 0.13],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.55);
    ctx.strokeStyle = '#8A5A4A';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.1, r * 0.3, r * 0.05, 0);
    ctx.stroke();
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(-r * 0.45, -r * 0.25);
    ctx.moveTo(r * 0.04, 0);
    ctx.lineTo(r * 0.45, -r * 0.3);
    ctx.stroke();
    const pinks = ['#FFB3CE', '#FFC9DA', '#FF9DBF'];
    const blobs: Array<[number, number, number]> = [
      [0, -r * 0.45, r * 0.42],
      [-r * 0.45, -r * 0.25, r * 0.32],
      [r * 0.45, -r * 0.3, r * 0.34],
      [-r * 0.15, -r * 0.75, r * 0.28],
      [r * 0.22, -r * 0.7, r * 0.26],
    ];
    blobs.forEach(([x, y, s], k) => circle(ctx, x, y, s, pinks[(k + Math.floor(v * 3)) % 3]));
    for (let k = 0; k < 6; k++) circle(ctx, Math.cos(k * 2.1 + v) * r * 0.45, -r * 0.45 + Math.sin(k * 2.1) * r * 0.3, r * 0.06, '#FFFFFF');
  },
};

const pine: PropDef = {
  id: 'bonsai-pine',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    const dir = v > 0.5 ? 1 : -1;
    ctx.strokeStyle = '#7A5547';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.15;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.quadraticCurveTo(dir * r * 0.45, r * 0.4, -dir * r * 0.05, -r * 0.1);
    ctx.quadraticCurveTo(-dir * r * 0.3, -r * 0.35, dir * r * 0.1, -r * 0.6);
    ctx.stroke();
    const green = ['#5E9C6A', '#4E8A5C'];
    ellipse(ctx, dir * r * 0.35, r * 0.1, r * 0.4, r * 0.18, 0, green[1]);
    ellipse(ctx, -dir * r * 0.35, -r * 0.25, r * 0.38, r * 0.17, 0, green[0]);
    ellipse(ctx, dir * r * 0.15, -r * 0.65, r * 0.42, r * 0.2, 0, green[1]);
    ellipse(ctx, dir * r * 0.3, r * 0.05, r * 0.25, r * 0.08, 0, '#7DBA82');
    ellipse(ctx, -dir * r * 0.4, -r * 0.3, r * 0.22, r * 0.07, 0, '#7DBA82');
    ellipse(ctx, dir * r * 0.1, -r * 0.71, r * 0.25, r * 0.08, 0, '#7DBA82');
  },
};

const bamboo: PropDef = {
  id: 'bamboo',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.6);
    const culms: Array<[number, number]> = [
      [-r * 0.35, 1],
      [0, 1.15],
      [r * 0.35, 0.9],
    ];
    for (const [x, h] of culms) {
      const top = r * 0.95 - r * 1.75 * h;
      line(ctx, x, r * 0.95, x, top, r * 0.16, '#7CC36E');
      for (let y = r * 0.6; y > top + r * 0.1; y -= r * 0.45) line(ctx, x - r * 0.08, y, x + r * 0.08, y, r * 0.05, '#4F9A4C');
      leaf(ctx, x, top + r * 0.2, r * 0.5, r * 0.1, x > 0 ? 1.1 : -1.1, '#5DB05A');
    }
  },
};

const koi: PropDef = {
  id: 'koi',
  place: 'water',
  size: [0.06, 0.07],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time, v, 0.08);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    const swish = Math.sin(time * 6 + v * 10) * 0.35;
    const body = v > 0.5 ? '#FF8A3D' : '#FFFFFF';
    const spot = v > 0.5 ? '#FFFFFF' : '#FF6A3D';
    ctx.save();
    ctx.translate(0, -r * 0.7);
    ctx.rotate(swish);
    ellipse(ctx, 0, -r * 0.35, r * 0.35, r * 0.4, 0, body);
    ctx.restore();
    ellipse(ctx, 0, 0, r * 0.38, r * 0.85, 0, body);
    circle(ctx, r * 0.1, r * 0.1, r * 0.2, spot);
    circle(ctx, -r * 0.12, -r * 0.35, r * 0.14, spot);
    ellipse(ctx, -r * 0.42, r * 0.25, r * 0.2, r * 0.1, -0.5, body);
    ellipse(ctx, r * 0.42, r * 0.25, r * 0.2, r * 0.1, 0.5, body);
    circle(ctx, -r * 0.14, r * 0.62, r * 0.06, '#3E3440');
    circle(ctx, r * 0.14, r * 0.62, r * 0.06, '#3E3440');
  },
};

const maple: PropDef = {
  id: 'red-maple',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 1,
  when: 'bloom',
  upright: true,
  draw(ctx, { r }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.5);
    line(ctx, 0, r * 0.95, 0, -r * 0.1, r * 0.14, '#7A5547');
    for (const [x, y, s, c] of [
      [0, -r * 0.4, r * 0.45, '#F06A4E'],
      [-r * 0.4, -r * 0.15, r * 0.3, '#FF8A5C'],
      [r * 0.4, -r * 0.2, r * 0.32, '#E9564A'],
      [r * 0.05, -r * 0.75, r * 0.28, '#FF9F6B'],
    ] as const) {
      circle(ctx, x, y, s, c);
    }
  },
};

export const japon: Theme = {
  id: 'japon',
  name: 'Japon',
  blurb: 'Ponts rouges, lanternes et carpes koï',
  palette: {
    ...SPRING,
    bgTop: '#FFD9E6',
    bgMid: '#FFF1EA',
    bgBottom: '#DDEEDD',
    bokeh: ['255,170,200', '255,225,235', '200,190,240', '170,220,190'],
    bedShadow: 'rgba(190, 120, 150, 0.3)',
    tileShadow: 'rgba(120, 90, 110, 0.38)',
    soil: '#EAE3D6',
    soilLight: '#F5F0E6',
    soilDark: '#DCD3C3',
    soilSide: '#CBBFAD',
    soilSideDark: '#B9AC98',
    pebble: '#FAF8F3',
    pebbleShade: '#C9C0B1',
    grass: '#A7D28A',
    grassLight: '#C3E2A6',
    grassDark: '#8DC274',
    grassDeep: '#5E9C5E',
    grassSide: '#82B56C',
    grassSideDark: '#6CA15B',
    rim: '#F4F1EC',
    rimShade: '#AFA597',
    groove: '#C8BEAE',
    grooveDeep: '#B3A895',
    water: '#6CC9E6',
    waterDeep: '#3AA7D2',
    petals: ['#FFB3CE', '#FFC9DA', '#FFFFFF', '#FF9DBF', '#F7D6E6'],
    centers: ['#FFE07A', '#FFFFFF'],
    lotus: ['#FF9DBF', '#FFC9DA', '#FFFFFF'],
  },
  ambient: 'sakura',
  ambientColors: ['#FFC2D8', '#FFD6E4', '#FFFFFF', '#FFB0CB'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    redBridge,
    lantern,
    pagoda,
    torii,
    steppingStones,
    sakura,
    pine,
    bamboo,
    koi,
    maple,
    rockProp('#D5CEC3', '#ADA497', '#F4F0EA', '#8FC27A'),
  ],
  dryGround(ctx, g) {
    // Raked gravel: gentle parallel waves.
    ctx.save();
    ctx.rotate(g.rnd[0] > 0.5 ? Math.PI / 2 : 0);
    ctx.strokeStyle = 'rgba(160, 148, 130, 0.35)';
    ctx.lineWidth = 0.012;
    for (let k = -4; k <= 4; k++) {
      const y = k * 0.1;
      ctx.beginPath();
      for (let x = -0.5; x <= 0.5; x += 0.05) {
        const yy = y + Math.sin(x * 9 + g.rnd[1] * 6) * 0.012;
        if (x === -0.5) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  smallFlower(ctx, r, color) {
    // Cherry blossom: five notched petals.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ellipse(ctx, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.45, r * 0.36, a, color);
    }
    circle(ctx, 0, 0, r * 0.25, '#FF7FA6');
    circle(ctx, 0, 0, r * 0.12, '#FFE07A');
  },
  scenery(ctx, w, h) {
    clouds(ctx, w, h);
    mountain(ctx, w * 0.72, h * 0.93, w * 0.9, h * 0.22, 'rgba(196, 178, 222, 0.55)', 'rgba(255,255,255,0.85)');
    hill(ctx, w, h, h * 0.92, 14, 'rgba(178, 222, 180, 0.85)', 1.2);
    hill(ctx, w, h, h * 0.96, 10, 'rgba(150, 205, 158, 0.9)', 3.1);
  },
};
