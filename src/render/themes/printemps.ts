/** Spring garden: the original pastel style, with tulips, ladybugs and ducklings. */
import { SPRING } from '../palette';
import { lilyPadsProp, mushroomProp, plankBridge, rockProp, snailProp, swimOffset } from './common';
import { circle, ellipse, eyes, groundShadow, line, poly, rrect, TAU } from './kit';
import { clouds, hills } from './scenery';
import type { PropDef, Theme } from './types';

const tulips: PropDef = {
  id: 'tulips',
  place: 'ground',
  size: [0.09, 0.12],
  weight: 3,
  when: 'bloom',
  upright: true,
  draw(ctx, { r, v }) {
    const colors = ['#FF7FA8', '#FFC94D', '#C9A0FF', '#FF9C6B'];
    groundShadow(ctx, 0, r * 0.8, r * 0.75);
    const stems: Array<[number, number]> = [
      [-r * 0.45, 0.85],
      [0, 1],
      [r * 0.45, 0.8],
    ];
    stems.forEach(([x, h], k) => {
      const top = r * 0.8 - r * 1.45 * h;
      line(ctx, x, r * 0.8, x * 0.8, top, r * 0.1, '#5FB45B');
      if (k === 1) ellipse(ctx, x + r * 0.2, r * 0.35, r * 0.22, r * 0.1, -0.6, '#6FC266');
      const c = colors[Math.floor(v * 4 + k) % 4];
      const cx = x * 0.8;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.22, top - r * 0.2);
      ctx.lineTo(cx - r * 0.1, top - r * 0.05);
      ctx.lineTo(cx, top - r * 0.25);
      ctx.lineTo(cx + r * 0.1, top - r * 0.05);
      ctx.lineTo(cx + r * 0.22, top - r * 0.2);
      ctx.quadraticCurveTo(cx + r * 0.24, top + r * 0.18, cx, top + r * 0.2);
      ctx.quadraticCurveTo(cx - r * 0.24, top + r * 0.18, cx - r * 0.22, top - r * 0.2);
      ctx.fill();
    });
  },
};

const ladybug: PropDef = {
  id: 'ladybug',
  place: 'ground',
  size: [0.045, 0.06],
  weight: 2,
  when: 'bloom',
  draw(ctx, { r, v }) {
    ctx.rotate(v * TAU);
    ellipse(ctx, 0.005, 0.008, r * 0.85, r * 0.95, 0, 'rgba(60,40,30,0.18)');
    circle(ctx, 0, -r * 0.7, r * 0.4, '#3E3440');
    ellipse(ctx, 0, 0.0, r * 0.8, r * 0.9, 0, '#FF5C6C');
    line(ctx, 0, -r * 0.85, 0, r * 0.85, r * 0.08, '#3E3440');
    for (const [x, y] of [
      [-0.4, -0.3],
      [0.4, -0.3],
      [-0.35, 0.35],
      [0.35, 0.35],
    ]) {
      circle(ctx, x * r, y * r, r * 0.16, '#3E3440');
    }
    circle(ctx, -r * 0.3, -r * 0.55, r * 0.12, 'rgba(255,255,255,0.6)');
  },
};

const birdhouse: PropDef = {
  id: 'birdhouse',
  place: 'ground',
  size: [0.1, 0.12],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    const wall = v > 0.5 ? '#9FD4F5' : '#FFC1D6';
    groundShadow(ctx, 0, r * 0.9, r * 0.45);
    rrect(ctx, -r * 0.08, -r * 0.1, r * 0.16, r * 1.0, r * 0.05, '#C88E5C');
    rrect(ctx, -r * 0.45, -r * 0.65, r * 0.9, r * 0.7, r * 0.1, wall);
    poly(ctx, [-r * 0.6, -r * 0.55, 0, -r * 1.05, r * 0.6, -r * 0.55], '#E46C6C');
    circle(ctx, 0, -r * 0.33, r * 0.15, '#5A4048');
    line(ctx, -r * 0.1, -r * 0.08, r * 0.1, -r * 0.08, r * 0.06, '#C88E5C');
  },
};

const wateringCan: PropDef = {
  id: 'watering-can',
  place: 'ground',
  size: [0.08, 0.1],
  weight: 1,
  when: 'always',
  upright: true,
  draw(ctx, { r, v }) {
    const c = v > 0.5 ? '#8DC8FF' : '#B9A3F2';
    groundShadow(ctx, 0, r * 0.62, r * 0.75);
    line(ctx, r * 0.35, -r * 0.05, r * 0.9, -r * 0.55, r * 0.14, c);
    ellipse(ctx, r * 0.92, -r * 0.6, r * 0.14, r * 0.1, -0.6, c);
    rrect(ctx, -r * 0.55, -r * 0.35, r * 0.95, r * 0.95, r * 0.18, c);
    ctx.strokeStyle = c;
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.4, r * 0.35, Math.PI, 0);
    ctx.stroke();
    rrect(ctx, -r * 0.45, -r * 0.2, r * 0.25, r * 0.6, r * 0.1, 'rgba(255,255,255,0.35)');
  },
};

const bee: PropDef = {
  id: 'bee',
  place: 'ground',
  size: [0.04, 0.05],
  weight: 1,
  when: 'bloom',
  upright: true,
  animated: true,
  draw(ctx, { r, time, v }) {
    const bob = Math.sin(time * 3 + v * 9) * r * 0.4;
    const flap = 0.5 + 0.5 * Math.abs(Math.sin(time * 30));
    ctx.translate(Math.sin(time * 1.3 + v * 7) * r * 0.6, bob - r * 0.4);
    ellipse(ctx, -r * 0.2, -r * 0.55, r * 0.35, r * 0.5 * flap, -0.4, 'rgba(255,255,255,0.8)');
    ellipse(ctx, r * 0.25, -r * 0.55, r * 0.35, r * 0.5 * flap, 0.4, 'rgba(255,255,255,0.8)');
    ellipse(ctx, 0, 0, r * 0.75, r * 0.5, 0, '#FFD045');
    line(ctx, -r * 0.15, -r * 0.45, -r * 0.15, r * 0.45, r * 0.18, '#4A3A44');
    line(ctx, r * 0.25, -r * 0.42, r * 0.25, r * 0.42, r * 0.18, '#4A3A44');
    circle(ctx, -r * 0.55, -r * 0.1, r * 0.08, '#4A3A44');
  },
};

const duckling: PropDef = {
  id: 'duckling',
  place: 'water',
  size: [0.055, 0.065],
  weight: 2,
  when: 'bloom',
  animated: true,
  draw(ctx, { r, time, v, water }) {
    if (water < 1) return;
    const { y, dir } = swimOffset(time, v);
    ctx.translate(0, y);
    if (dir < 0) ctx.rotate(Math.PI);
    ellipse(ctx, 0, 0, r * 0.62, r * 0.85, 0, '#FFD84D');
    ellipse(ctx, r * 0.15, r * 0.2, r * 0.3, r * 0.45, 0.2, '#FFC93A');
    circle(ctx, 0, r * 0.75, r * 0.45, '#FFE066');
    ellipse(ctx, 0, r * 1.18, r * 0.18, r * 0.12, 0, '#FF9F43');
    eyes(ctx, 0, r * 0.85, r * 0.2, r * 0.07);
  },
};

export const printemps: Theme = {
  id: 'printemps',
  name: 'Printemps',
  blurb: 'Tulipes, coccinelles et canetons',
  palette: SPRING,
  ambient: 'petals',
  ambientColors: ['#FFC4D6', '#FFD9E4', '#FFF0B8', '#FFFFFF'],
  creature: 'butterfly',
  propChance: 0.8,
  extraChance: 0.4,
  props: [
    tulips,
    ladybug,
    snailProp('#FFB3CB', '#E67FA2'),
    mushroomProp(['#FF7A8A', '#FFB347', '#C9A0FF']),
    rockProp('#E9E2F0', '#C9BFD6', '#FFFFFF', '#9FD98A'),
    birdhouse,
    wateringCan,
    bee,
    plankBridge('#E2B07A', '#D29C63', '#B97F4E', 1),
    duckling,
    lilyPadsProp('#FFB3CB'),
  ],
  scenery(ctx, w, h) {
    clouds(ctx, w, h);
    hills(ctx, w, h, 'rgba(172, 230, 176, 0.85)', 'rgba(136, 212, 146, 0.9)');
  },
};
