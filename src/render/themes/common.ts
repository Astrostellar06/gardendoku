/** Props shared by several garden styles (parameterised by colours). */
import { P } from '../palette';
import { circle, ellipse, groundShadow, line, rrect, TAU } from './kit';
import type { PropDef } from './types';

export function rockProp(base: string, shade: string, light: string, moss?: string): PropDef {
  return {
    id: 'rock',
    place: 'ground',
    size: [0.06, 0.09],
    weight: 2,
    when: 'always',
    draw(ctx, { r, v, v2, bloom }) {
      groundShadow(ctx, 0.01, r * 0.35, r * 0.95, r * 0.45);
      ellipse(ctx, 0, 0, r * 0.95, r * 0.7, v * 0.6, shade);
      ellipse(ctx, -r * 0.08, -r * 0.1, r * 0.8, r * 0.55, v * 0.6, base);
      ellipse(ctx, -r * 0.3, -r * 0.28, r * 0.28, r * 0.16, v * 0.6, light);
      if (v2 > 0.45) {
        ellipse(ctx, r * 0.75, r * 0.35, r * 0.4, r * 0.3, 0, shade);
        ellipse(ctx, r * 0.7, r * 0.28, r * 0.32, r * 0.22, 0, base);
      }
      if (moss && bloom > 0) {
        ctx.globalAlpha = bloom;
        ellipse(ctx, r * 0.1, -r * 0.42, r * 0.45, r * 0.18, 0.2, moss);
        ctx.globalAlpha = 1;
      }
    },
  };
}

export function mushroomProp(caps: string[], when: 'always' | 'bloom' = 'bloom'): PropDef {
  return {
    id: 'mushroom',
    place: 'ground',
    size: [0.06, 0.08],
    weight: 2,
    when,
    upright: true,
    draw(ctx, { r, v }) {
      const cap = caps[Math.floor(v * caps.length)];
      const one = (x: number, s: number) => {
        groundShadow(ctx, x, r * 0.75, r * 0.45 * s);
        rrect(ctx, x - r * 0.15 * s, r * 0.05, r * 0.3 * s, r * 0.7 * s, r * 0.1 * s, '#FFF6EC');
        ctx.fillStyle = cap;
        ctx.beginPath();
        ctx.ellipse(x, r * 0.1, r * 0.5 * s, r * 0.45 * s, 0, Math.PI, TAU);
        ctx.fill();
        circle(ctx, x - r * 0.2 * s, -r * 0.12 * s, r * 0.08 * s, '#FFFFFF');
        circle(ctx, x + r * 0.15 * s, -r * 0.2 * s, r * 0.06 * s, '#FFFFFF');
      };
      one(-r * 0.25, 1);
      one(r * 0.45, 0.7);
    },
  };
}

/** Wooden plank footbridge across a canal (local x crosses the canal). */
export function plankBridge(wood: string, woodDark: string, rail: string, weight = 1): PropDef {
  return {
    id: 'plank-bridge',
    place: 'canal',
    size: [0.06, 0.08],
    weight,
    when: 'always',
    draw(ctx, { r }) {
      const half = 0.21;
      ellipse(ctx, 0.01, r * 0.2, half, r * 1.05, 0, 'rgba(60,40,30,0.18)');
      const n = 4;
      for (let k = 0; k < n; k++) {
        const y = -r + (k * 2 * r) / (n - 1);
        rrect(ctx, -half, y - r * 0.28, half * 2, r * 0.5, r * 0.12, k % 2 ? wood : woodDark);
      }
      line(ctx, -half + 0.02, -r * 1.05, -half + 0.02, r * 1.05, 0.022, rail);
      line(ctx, half - 0.02, -r * 1.05, half - 0.02, r * 1.05, 0.022, rail);
    },
  };
}

/** Flat stones laid across the canal. */
export function steppingStonesBridge(stone: string, shade: string): PropDef {
  return {
    id: 'stone-steps',
    place: 'canal',
    size: [0.05, 0.06],
    weight: 1,
    when: 'always',
    draw(ctx, { r, v }) {
      for (const [x, s] of [
        [-0.13, 0.9],
        [0, 1],
        [0.13, 0.85],
      ] as const) {
        const y = Math.sin((x + v) * 9) * r * 0.25;
        ellipse(ctx, x + 0.006, y + 0.01, r * 0.75 * s, r * 0.6 * s, v, shade);
        ellipse(ctx, x, y, r * 0.7 * s, r * 0.55 * s, v, stone);
      }
    },
  };
}

/** A couple of floating lily pads (static, appear with the water). */
export function lilyPadsProp(flower?: string): PropDef {
  return {
    id: 'lily-pads',
    place: 'water',
    size: [0.045, 0.06],
    weight: 1,
    when: 'bloom',
    draw(ctx, { r, v }) {
      const pad = (x: number, y: number, s: number, a: number) => {
        ctx.fillStyle = P.lily;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, s, a + 0.4, a + TAU - 0.1);
        ctx.closePath();
        ctx.fill();
      };
      pad(-r * 0.3, -r * 0.4, r * 0.75, v * 6);
      pad(r * 0.4, r * 0.5, r * 0.55, v * 9);
      if (flower) {
        circle(ctx, -r * 0.3, -r * 0.4, r * 0.3, flower);
        circle(ctx, -r * 0.3, -r * 0.4, r * 0.12, '#FFE07A');
      }
    },
  };
}

/** Little snail (side view). */
export function snailProp(shell: string, swirl: string): PropDef {
  return {
    id: 'snail',
    place: 'ground',
    size: [0.06, 0.08],
    weight: 2,
    when: 'bloom',
    upright: true,
    draw(ctx, { r, v }) {
      const dir = v > 0.5 ? 1 : -1;
      ctx.save();
      ctx.scale(dir, 1);
      groundShadow(ctx, 0, r * 0.62, r * 0.9);
      rrect(ctx, -r * 0.95, r * 0.25, r * 1.8, r * 0.38, r * 0.19, '#FFD9B8');
      line(ctx, r * 0.7, r * 0.3, r * 0.85, -r * 0.15, r * 0.08, '#FFD9B8');
      line(ctx, r * 0.55, r * 0.3, r * 0.6, -r * 0.08, r * 0.08, '#FFD9B8');
      circle(ctx, r * 0.85, -r * 0.18, r * 0.09, '#4A3A44');
      circle(ctx, -r * 0.1, -r * 0.08, r * 0.55, shell);
      ctx.strokeStyle = swirl;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      for (let k = 0; k < 40; k++) {
        const a = k * 0.3;
        const rad = r * 0.42 * (1 - k / 44);
        const x = -r * 0.1 + Math.cos(a) * rad;
        const y = -r * 0.08 + Math.sin(a) * rad;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** Animated swimmer that paddles up and down a canal arm (local +y runs outward). */
export function swimOffset(time: number, v: number, amp = 0.07): { y: number; dir: number } {
  const ph = time * 0.55 + v * 20;
  return { y: Math.sin(ph) * amp, dir: Math.cos(ph) >= 0 ? 1 : -1 };
}
