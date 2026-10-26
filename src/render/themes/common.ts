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

export interface BridgeLook {
  /** Walking surface. */
  deck: string;
  /** Plank seams / far ramp shade. */
  deckShade: string;
  /** Side of the bridge (the arch body). */
  side: string;
  rail?: string;
  /** Round caps on the posts. */
  cap?: string;
  planks?: boolean;
  /** Arch height (tile units); 0 for a flat footbridge. */
  hump: number;
  snow?: boolean;
  vines?: string;
}

/** Half span of a bridge: wide enough to rest on both canal banks. */
const SPAN = 0.235;
const RAIL_H = 0.05;

/**
 * Bridge seen in 2.5D, like the other upright props. It is drawn in screen
 * orientation: across a vertical canal we see its side (arch, railings), across a
 * horizontal canal we look along it (a ramp up and down between two railings).
 */
export function bridgeProp(id: string, look: BridgeLook, weight = 1): PropDef {
  return {
    id,
    place: 'canal',
    screen: true,
    size: [0.06, 0.075],
    weight,
    when: 'always',
    draw(ctx, { r, axis }) {
      if (axis === 'h') drawBridgeAlong(ctx, r, look);
      else drawBridgeSide(ctx, r, look);
    },
  };
}

/** Height of the deck at position t (-1..1 along the span). */
const deckHeight = (look: BridgeLook, t: number) => 0.018 + look.hump * (1 - t * t);

function drawBridgeSide(ctx: CanvasRenderingContext2D, r: number, look: BridgeLook) {
  const D = r * 1.5;
  const steps = 16;
  const xs = Array.from({ length: steps + 1 }, (_, k) => -SPAN + (k / steps) * SPAN * 2);
  const back = (x: number) => -D / 2 - deckHeight(look, x / SPAN);
  const front = (x: number) => D / 2 - deckHeight(look, x / SPAN);
  const waterY = D / 2 + 0.012;

  ellipse(ctx, 0.01, waterY, SPAN, D * 0.35, 0, 'rgba(40, 60, 90, 0.18)');

  const railing = (edge: (x: number) => number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    xs.forEach((x, k) => (k ? ctx.lineTo(x, edge(x) - RAIL_H) : ctx.moveTo(x, edge(x) - RAIL_H)));
    ctx.stroke();
    ctx.lineWidth = 0.013;
    ctx.beginPath();
    for (const x of [-SPAN + 0.012, -SPAN / 3, SPAN / 3, SPAN - 0.012]) {
      ctx.moveTo(x, edge(x));
      ctx.lineTo(x, edge(x) - RAIL_H);
    }
    ctx.stroke();
    if (look.cap) for (const x of [-SPAN + 0.012, SPAN - 0.012]) circle(ctx, x, edge(x) - RAIL_H, 0.014, look.cap);
    if (look.snow) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      xs.forEach((x, k) => (k ? ctx.lineTo(x, edge(x) - RAIL_H - 0.008) : ctx.moveTo(x, edge(x) - RAIL_H - 0.008)));
      ctx.stroke();
    }
  };

  // Far railing, deck, near side with its arch, near railing.
  if (look.rail) railing(back, look.rail);
  ctx.fillStyle = look.deck;
  ctx.beginPath();
  xs.forEach((x, k) => (k ? ctx.lineTo(x, back(x)) : ctx.moveTo(x, back(x))));
  for (let k = steps; k >= 0; k--) ctx.lineTo(xs[k], front(xs[k]));
  ctx.closePath();
  ctx.fill();
  if (look.planks) {
    ctx.strokeStyle = look.deckShade;
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    for (let x = -SPAN + 0.04; x < SPAN - 0.02; x += 0.045) {
      ctx.moveTo(x, back(x));
      ctx.lineTo(x, front(x));
    }
    ctx.stroke();
  }
  if (look.snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    xs.forEach((x, k) => (k ? ctx.lineTo(x, back(x)) : ctx.moveTo(x, back(x))));
    for (let k = steps; k >= 0; k--) ctx.lineTo(xs[k], back(xs[k]) + D * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  const archW = SPAN * 0.62;
  const archH = Math.max(0, deckHeight(look, 0) - 0.03);
  ctx.fillStyle = look.side;
  ctx.beginPath();
  xs.forEach((x, k) => (k ? ctx.lineTo(x, front(x)) : ctx.moveTo(x, front(x))));
  if (archH > 0.01) {
    ctx.lineTo(SPAN, waterY);
    ctx.lineTo(archW, waterY);
    for (let k = 0; k <= 12; k++) {
      const x = archW - (k / 12) * archW * 2;
      ctx.lineTo(x, waterY - archH * Math.sqrt(Math.max(0, 1 - (x / archW) ** 2)));
    }
    ctx.lineTo(-SPAN, waterY);
  } else {
    // Flat footbridge: only the thickness of the planks.
    for (let k = steps; k >= 0; k--) ctx.lineTo(xs[k], front(xs[k]) + 0.03);
  }
  ctx.closePath();
  ctx.fill();
  if (look.rail) railing(front, look.rail);
  if (look.vines) {
    for (const x of [-SPAN * 0.6, -SPAN * 0.1, SPAN * 0.45]) {
      ellipse(ctx, x, front(x) - RAIL_H * 0.5, 0.018, 0.026, 0.4, look.vines);
      ellipse(ctx, x + 0.02, front(x) - RAIL_H * 0.15, 0.014, 0.02, -0.5, look.vines);
    }
  }
}

function drawBridgeAlong(ctx: CanvasRenderingContext2D, r: number, look: BridgeLook) {
  const halfW = r * 1.25;
  const steps = 16;
  // Screen y of a point at position y along the span (raised by the hump).
  const ys = Array.from({ length: steps + 1 }, (_, k) => -SPAN + (k / steps) * SPAN * 2);
  const lift = (y: number) => y - deckHeight(look, y / SPAN);

  ellipse(ctx, 0.01, 0.02, halfW * 1.3, SPAN * 0.9, 0, 'rgba(40, 60, 90, 0.16)');
  // Deck: the near ramp faces us (light), the far one slopes away (shaded).
  const crest = (lift(0) - lift(-SPAN)) / (lift(SPAN) - lift(-SPAN));
  const shade = ctx.createLinearGradient(0, lift(-SPAN), 0, lift(SPAN));
  shade.addColorStop(0, look.deckShade);
  shade.addColorStop(Math.max(0, crest - 0.05), look.deckShade);
  shade.addColorStop(crest, look.deck);
  shade.addColorStop(1, look.deck);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ys.forEach((y, k) => (k ? ctx.lineTo(-halfW, lift(y)) : ctx.moveTo(-halfW, lift(y))));
  for (let k = steps; k >= 0; k--) ctx.lineTo(halfW, lift(ys[k]));
  ctx.closePath();
  ctx.fill();
  if (look.planks) {
    ctx.strokeStyle = look.deckShade;
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    for (let y = -SPAN + 0.04; y < SPAN - 0.02; y += 0.045) {
      ctx.moveTo(-halfW, lift(y));
      ctx.lineTo(halfW, lift(y));
    }
    ctx.stroke();
  }
  if (look.snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ys.forEach((y, k) => (k ? ctx.lineTo(-halfW * 0.6, lift(y)) : ctx.moveTo(-halfW * 0.6, lift(y))));
    for (let k = steps; k >= 0; k--) ctx.lineTo(halfW * 0.6, lift(ys[k]));
    ctx.closePath();
    ctx.fill();
  }
  // Light catching the crest of the arch.
  if (look.hump > 0.02) rrect(ctx, -halfW, lift(0) - 0.006, halfW * 2, 0.012, 0.004, 'rgba(255,255,255,0.45)');
  // Near end of the bridge, facing us.
  rrect(ctx, -halfW, lift(SPAN) - 0.004, halfW * 2, 0.035, 0.008, look.side);

  if (!look.rail) return;
  for (const side of [-1, 1]) {
    const x = side * halfW;
    ctx.strokeStyle = look.rail;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    for (const y of [-SPAN + 0.012, -SPAN / 3, SPAN / 3, SPAN - 0.012]) {
      ctx.moveTo(x, lift(y));
      ctx.lineTo(x, lift(y) - RAIL_H);
    }
    ctx.stroke();
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ys.forEach((y, k) => (k ? ctx.lineTo(x, lift(y) - RAIL_H) : ctx.moveTo(x, lift(y) - RAIL_H)));
    ctx.stroke();
    if (look.cap) for (const y of [-SPAN + 0.012, SPAN - 0.012]) circle(ctx, x, lift(y) - RAIL_H, 0.014, look.cap);
    if (look.snow) circle(ctx, x, lift(SPAN - 0.012) - RAIL_H - 0.006, 0.012, '#FFFFFF');
    if (look.vines) {
      ellipse(ctx, x, lift(SPAN * 0.4) - RAIL_H * 0.4, 0.016, 0.024, side * 0.4, look.vines);
      ellipse(ctx, x, lift(-SPAN * 0.2) - RAIL_H * 0.4, 0.014, 0.02, -side * 0.4, look.vines);
    }
  }
}

/** Wooden plank footbridge. */
export function plankBridge(wood: string, woodDark: string, rail: string, weight = 1, extra: Partial<BridgeLook> = {}): PropDef {
  return bridgeProp('plank-bridge', { deck: wood, deckShade: woodDark, side: woodDark, rail, planks: true, hump: 0.035, ...extra }, weight);
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
