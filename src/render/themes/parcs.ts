/** Great national parks: pines, bison, bears, geysers, hot springs, elk and trout. */
import { grassFrom, SPRING } from '../palette';
import { pineProp, plankBridge, rockProp, swimOffset } from './common';
import { circle, ellipse, groundShadow, line, poly, rrect, TAU } from './kit';
import { hill, mountain, pineSilhouette } from './scenery';
import type { PropDef, Theme } from './types';

const bison: PropDef = {
  id: 'bison',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    groundShadow(ctx, 0, r * 0.9, r * 0.8);
    for (const x of [-0.5, -0.3, 0.15, 0.35]) rrect(ctx, x * r - r * 0.06, r * 0.35, r * 0.12, r * 0.55, r * 0.04, '#5E4438');
    ellipse(ctx, -r * 0.2, r * 0.25, r * 0.5, r * 0.3, 0, '#8A6248');
    // Shaggy hump and head.
    ellipse(ctx, r * 0.2, r * 0.05, r * 0.42, r * 0.42, 0, '#6E4E3E');
    ellipse(ctx, r * 0.15, -r * 0.1, r * 0.25, r * 0.2, 0, '#7E5C48');
    ellipse(ctx, r * 0.55, r * 0.2, r * 0.2, r * 0.24, 0, '#5E4438');
    ellipse(ctx, r * 0.6, r * 0.45, r * 0.1, r * 0.1, 0, '#4A3530');
    ctx.strokeStyle = '#E8DCC8';
    ctx.lineWidth = r * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(r * 0.48, r * 0.02, r * 0.08, Math.PI, Math.PI * 1.8);
    ctx.stroke();
    circle(ctx, r * 0.62, r * 0.16, r * 0.04, '#2E2428');
    line(ctx, -r * 0.7, r * 0.2, -r * 0.78, r * 0.45, r * 0.04, '#5E4438');
  },
};

const bear: PropDef = {
  id: 'bear',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 1,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const fur = '#9A6A4A';
    groundShadow(ctx, 0, r * 0.9, r * 0.7);
    for (const x of [-0.45, -0.25, 0.15, 0.35]) rrect(ctx, x * r - r * 0.08, r * 0.35, r * 0.16, r * 0.55, r * 0.07, '#86593C');
    ellipse(ctx, -r * 0.08, r * 0.25, r * 0.55, r * 0.35, 0, fur);
    circle(ctx, r * 0.48, -r * 0.05, r * 0.26, fur);
    circle(ctx, r * 0.36, -r * 0.3, r * 0.09, fur);
    circle(ctx, r * 0.36, -r * 0.3, r * 0.045, '#C9966E');
    ellipse(ctx, r * 0.68, 0.02 * r, r * 0.12, r * 0.09, 0, '#C9966E');
    circle(ctx, r * 0.76, 0, r * 0.04, '#2E2428');
    circle(ctx, r * 0.52, -r * 0.1, r * 0.04, '#2E2428');
    ellipse(ctx, -r * 0.2, r * 0.05, r * 0.25, r * 0.1, 0, 'rgba(255,255,255,0.15)');
  },
};

const geyser: PropDef = {
  id: 'geyser',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'bloom',
  upright: true,
  animated: true,
  drawScale: 1.7,
  draw(ctx, { r, time, v }) {
    ellipse(ctx, 0, r * 0.85, r * 0.75, r * 0.25, 0, '#E8DCC8');
    ellipse(ctx, 0, r * 0.8, r * 0.45, r * 0.14, 0, '#F4C060');
    ellipse(ctx, 0, r * 0.78, r * 0.25, r * 0.08, 0, '#7FD6F0');
    // Erupts every few seconds, steaming the rest of the time.
    const cycle = (time * 0.25 + v) % 1;
    const jet = cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
    if (jet > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, r * 0.78);
      ctx.quadraticCurveTo(-r * 0.1, r * 0.2, -r * 0.05 * jet, r * 0.78 - r * 1.7 * jet);
      ctx.lineTo(r * 0.05 * jet, r * 0.78 - r * 1.7 * jet);
      ctx.quadraticCurveTo(r * 0.1, r * 0.2, r * 0.12, r * 0.78);
      ctx.fill();
      circle(ctx, 0, r * 0.78 - r * 1.7 * jet, r * 0.2 * jet, 'rgba(255,255,255,0.8)');
    }
    for (let k = 0; k < 3; k++) {
      const t = (time * 0.4 + k / 3 + v) % 1;
      ctx.globalAlpha = (1 - t) * 0.6;
      circle(ctx, Math.sin(t * 5 + k) * r * 0.2, r * 0.7 - t * r * 1.2, r * (0.12 + t * 0.2), '#FFFFFF');
    }
    ctx.globalAlpha = 1;
  },
};

const hotSpring: PropDef = {
  id: 'hot-spring',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 2,
  when: 'always',
  draw(ctx, { r, v, bloom }) {
    ctx.rotate(v * TAU);
    // Rainbow rings like the Grand Prismatic Spring.
    ellipse(ctx, 0, 0, r * 0.95, r * 0.8, 0, '#F29A4A');
    ellipse(ctx, 0, 0, r * 0.8, r * 0.66, 0, '#F7C85A');
    ellipse(ctx, 0, 0, r * 0.66, r * 0.54, 0, '#CFE58A');
    ellipse(ctx, 0, 0, r * 0.54, r * 0.44, 0, bloom > 0.3 ? '#5FD0E8' : '#9CCFD8');
    ellipse(ctx, 0, 0, r * 0.34, r * 0.28, 0, bloom > 0.3 ? '#2FA8D8' : '#7FB8C8');
    ellipse(ctx, -r * 0.15, -r * 0.12, r * 0.15, r * 0.07, 0.3, 'rgba(255,255,255,0.45)');
  },
};

const cabin: PropDef = {
  id: 'ranger-cabin',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, bloom }) {
    groundShadow(ctx, 0, r * 0.95, r * 0.85);
    rrect(ctx, -r * 0.7, -r * 0.15, r * 1.4, r * 1.1, r * 0.05, '#B97F4E');
    for (let k = 0; k < 5; k++) line(ctx, -r * 0.7, -r * 0.05 + k * r * 0.22, r * 0.7, -r * 0.05 + k * r * 0.22, r * 0.05, '#9A6A3E');
    poly(ctx, [-r * 0.88, -r * 0.1, 0, -r * 0.8, r * 0.88, -r * 0.1], '#6E8E5A');
    poly(ctx, [-r * 0.88, -r * 0.1, 0, -r * 0.8, -r * 0.2, -r * 0.1], '#7FA06A');
    rrect(ctx, -r * 0.18, r * 0.35, r * 0.36, r * 0.6, r * 0.04, '#7A5547');
    rrect(ctx, r * 0.3, r * 0.1, r * 0.28, r * 0.25, r * 0.03, bloom > 0.5 ? '#FFE9A0' : '#CFE6F2');
    rrect(ctx, r * 0.35, -r * 0.75, r * 0.16, r * 0.35, r * 0.02, '#A8A0A8');
  },
};

const elk: PropDef = {
  id: 'elk',
  place: 'ground',
  size: [0.09, 0.11],
  weight: 2,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    ctx.scale(v > 0.5 ? 1 : -1, 1);
    const coat = '#C98E5E';
    groundShadow(ctx, 0, r * 0.92, r * 0.6);
    for (const x of [-0.4, -0.22, 0.12, 0.28]) rrect(ctx, x * r - r * 0.04, r * 0.25, r * 0.08, r * 0.67, r * 0.03, '#A8744A');
    ellipse(ctx, -r * 0.05, r * 0.2, r * 0.48, r * 0.25, 0, coat);
    ellipse(ctx, -r * 0.48, r * 0.15, r * 0.12, r * 0.12, 0, '#F2E2C8');
    rrect(ctx, r * 0.22, -r * 0.35, r * 0.18, r * 0.55, r * 0.07, '#8A5E3E');
    ellipse(ctx, r * 0.42, -r * 0.4, r * 0.2, r * 0.12, 0.35, coat);
    circle(ctx, r * 0.42, -r * 0.44, r * 0.035, '#2E2428');
    // Antlers.
    ctx.strokeStyle = '#E8D8BC';
    ctx.lineWidth = r * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.5);
    ctx.lineTo(r * 0.12, -r * 0.95);
    ctx.moveTo(r * 0.22, -r * 0.7);
    ctx.lineTo(r * 0.02, -r * 0.75);
    ctx.moveTo(r * 0.17, -r * 0.85);
    ctx.lineTo(r * 0.3, -r * 1.0);
    ctx.moveTo(r * 0.36, -r * 0.5);
    ctx.lineTo(r * 0.5, -r * 0.9);
    ctx.moveTo(r * 0.44, -r * 0.72);
    ctx.lineTo(r * 0.62, -r * 0.78);
    ctx.stroke();
  },
};

const trout: PropDef = {
  id: 'trout',
  place: 'water',
  size: [0.05, 0.06],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time, v, 0.08);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    const swish = Math.sin(time * 7 + v * 10) * 0.3;
    ctx.save();
    ctx.translate(0, -r * 0.75);
    ctx.rotate(swish);
    poly(ctx, [0, 0, -r * 0.3, -r * 0.4, r * 0.3, -r * 0.4], '#8FA8A0');
    ctx.restore();
    ellipse(ctx, 0, 0, r * 0.28, r * 0.85, 0, '#A8C0B4');
    ellipse(ctx, 0, 0, r * 0.1, r * 0.7, 0, '#F29A9A');
    for (const [x, yy] of [[-0.12, -0.3], [0.12, 0], [-0.1, 0.3]]) circle(ctx, x * r, yy * r, r * 0.04, '#5E7068');
    circle(ctx, -r * 0.1, r * 0.6, r * 0.05, '#2E2428');
    circle(ctx, r * 0.1, r * 0.6, r * 0.05, '#2E2428');
  },
};

export const parcs: Theme = {
  id: 'parcs',
  name: 'Grands parcs',
  blurb: 'Geysers, bisons et grands pins',
  palette: {
    ...SPRING,
    bgTop: '#BDE2FF',
    bgMid: '#EAF5FF',
    bgBottom: '#CBE6C2',
    bokeh: ['150,200,255', '190,230,255', '170,220,170', '255,230,170'],
    bedShadow: 'rgba(90, 140, 120, 0.3)',
    tileShadow: 'rgba(70, 100, 80, 0.4)',
    soil: '#E3C8A0',
    soilLight: '#EED9B6',
    soilDark: '#D4B486',
    soilSide: '#C49F70',
    soilSideDark: '#B08B5C',
    pebble: '#F6EDE0',
    pebbleShade: '#BFA382',
    ...grassFrom(145, 0.28, 0.55),
    rim: '#FAF6EE',
    rimShade: '#BFA07A',
    groove: '#D4B080',
    grooveDeep: '#C29A68',
    water: '#5EC4EE',
    waterDeep: '#36A6DE',
    petals: ['#FFD45A', '#FFFFFF', '#B9A0F2', '#FF9F7A', '#8DC8FF'],
    centers: ['#FFC83A', '#8A5A3A'],
    lotus: ['#FFFFFF', '#FFE58A', '#D2B5FF'],
    lily: '#7CC27A',
    lilyDark: '#5EA85E',
  },
  ambient: 'pollen',
  ambientColors: ['#FFFFFF', '#E8F6FF', '#FFF4C8'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    pineProp('park-pine', '#3F8F6A', '#55A67D', 4),
    bison,
    bear,
    geyser,
    hotSpring,
    cabin,
    elk,
    rockProp('#C9C3BE', '#A8A19A', '#E8E4E0', '#8FCF86'),
    plankBridge('#B98A5E', '#A67648', '#7A5A3E'),
    trout,
  ],
  scenery(ctx, w, h) {
    mountain(ctx, w * 0.25, h * 0.93, w * 0.75, h * 0.23, '#B9CBE6', '#FFFFFF');
    mountain(ctx, w * 0.78, h * 0.93, w * 0.6, h * 0.18, '#A9BEDC', '#FFFFFF');
    // The forest stands behind the meadow, which hides the foot of the trees.
    for (let k = 0; k < 9; k++) {
      pineSilhouette(ctx, w * (0.03 + k * 0.12), h * (0.915 + Math.sin(k * 2.1) * 0.01), 0.6 + (k % 3) * 0.2, '#6FA886');
    }
    hill(ctx, w, h, h * 0.91, 8, '#9BCB98', 1.2);
    hill(ctx, w, h, h * 0.95, 10, 'rgba(120, 186, 126, 0.95)', 2.6);
  },
};
