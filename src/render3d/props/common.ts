/** 3D models shared by several styles (the counterparts of render/themes/common.ts). */
import type { BridgeLook, TreeLook } from '../../render/themes/common';
import { P } from '../../render/palette';
import type { Kit, Model, ModelInfo } from './kit';

/** A rock or two, with a patch of moss once watered. */
export function rock3d(base: string, shade: string, light: string, moss?: string): Model {
  return (k, { v, v2 }) => {
    k.rock([shade, base], [0, 0.3, 0], [0.85, 0.55, 0.7], { rot: [0.2, v * 6, 0.1] });
    k.rock([base, light], [-0.15, 0.62, -0.05], [0.35, 0.18, 0.3], { rot: [0, v2 * 6, 0] });
    if (v2 > 0.45) k.rock([shade, base], [0.75, 0.18, 0.35], [0.38, 0.3, 0.32], { rot: [0, v * 3, 0.3] });
    if (moss) k.bloom(0.4, () => k.dome(moss, [0.1, 0.7, 0.05], [0.4, 0.12, 0.32]));
  };
}

/** Two little mushrooms with white dots. */
export function mushroom3d(caps: string[]): Model {
  return (k, { v }) => {
    const cap = caps[Math.floor(v * caps.length)];
    const one = (x: number, z: number, s: number) => {
      k.cyl('#FFF6EC', [x, 0, z], 0.15 * s, 0.75 * s, { top: 0.8 });
      k.dome([cap, cap], [x, 0.65 * s, z], [0.5 * s, 0.42 * s, 0.5 * s]);
      k.ball('#FFFFFF', [x - 0.2 * s, 0.95 * s, z + 0.2 * s], [0.08 * s, 0.05 * s, 0.08 * s], { sides: 0 });
      k.ball('#FFFFFF', [x + 0.18 * s, 0.98 * s, z - 0.1 * s], [0.07 * s, 0.05 * s, 0.07 * s], { sides: 0 });
    };
    one(-0.25, 0, 1);
    one(0.45, 0.25, 0.7);
  };
}

/** Snail with a spiral shell (rings of balls getting smaller). */
export function snail3d(shell: string, swirl: string): Model {
  return (k, { v }) => {
    k.at([0, 0, 0], v * 6.28, 1, () => {
      k.ball('#FFD9B8', [0, 0.15, 0], [0.9, 0.17, 0.3]);
      k.ball('#FFD9B8', [0.78, 0.4, 0], [0.18, 0.28, 0.2]);
      k.stick('#FFD9B8', [0.82, 0.6, 0.06], [0.95, 0.88, 0.1], 0.06);
      k.stick('#FFD9B8', [0.78, 0.6, -0.06], [0.88, 0.85, -0.12], 0.06);
      k.ball('#4A3A44', [0.95, 0.9, 0.1], [0.06, 0.06, 0.06], { sides: 0 });
      k.ball('#4A3A44', [0.88, 0.87, -0.12], [0.06, 0.06, 0.06], { sides: 0 });
      k.ball([swirl, shell], [-0.1, 0.62, 0], [0.5, 0.5, 0.36]);
      k.ball(swirl, [-0.1, 0.62, 0.2], [0.24, 0.24, 0.2], { sides: 0 });
      k.ball(shell, [-0.08, 0.64, 0.3], [0.1, 0.1, 0.08], { sides: 0 });
    });
  };
}

/** Two lily pads on the water, one with a flower. */
export function lilyPads3d(flower?: string): Model {
  return (k, { v }) => {
    k.cyl(P.lily, [-0.3, 0.02, -0.4], 0.75, 0.06, { sides: 9, rot: [0, v * 6, 0] });
    k.cyl(P.lilyDark, [0.4, 0.02, 0.5], 0.55, 0.06, { sides: 9, rot: [0, v * 9, 0] });
    if (flower) {
      for (let a = 0; a < 5; a++) {
        const t = (a / 5) * Math.PI * 2;
        k.ball(flower, [-0.3 + Math.cos(t) * 0.17, 0.2, -0.4 + Math.sin(t) * 0.17], [0.2, 0.1, 0.12], { rot: [0, -t, 0.5], sides: 0 });
      }
      k.ball('#FFE07A', [-0.3, 0.22, -0.4], [0.1, 0.08, 0.1], { sides: 0 });
    }
  };
}

/**
 * Footbridge over a canal: a deck resting on both banks, arched by `hump`,
 * with railings and post caps when the look has them.
 */
export function bridge3d(look: BridgeLook): Model {
  return (k: Kit, { canalHalf }: ModelInfo) => {
    const half = canalHalf + 0.55;
    const w = 1.1;
    const lift = (look.hump / 0.065) * 0.9 + 0.12;
    // Deck in three slabs: up, over, down.
    const n = look.planks ? 7 : 3;
    for (let s = 0; s < n; s++) {
      const x0 = -half + (s * 2 * half) / n;
      const x1 = x0 + (2 * half) / n;
      const xm = (x0 + x1) / 2;
      const y = Math.sin(((xm + half) / (2 * half)) * Math.PI) * lift;
      const slope = Math.cos(((xm + half) / (2 * half)) * Math.PI) * lift * (Math.PI / (2 * half));
      const deck = look.planks && s % 2 ? look.deckShade : look.deck;
      k.box([look.side, deck], [xm, y - 0.08, 0], [x1 - x0 + 0.04, 0.16, w], { rot: [0, 0, Math.atan(slope)] });
    }
    if (look.rail) {
      for (const z of [-w / 2 + 0.05, w / 2 - 0.05]) {
        for (const x of [-half + 0.1, 0, half - 0.1]) {
          const y = Math.sin(((x + half) / (2 * half)) * Math.PI) * lift;
          k.cyl(look.rail, [x, y, z], 0.06, 0.42, { sides: 4 });
          if (look.cap) k.ball(look.cap, [x, y + 0.45, z], [0.09, 0.09, 0.09], { sides: 0 });
        }
        const pts: Array<[number, number, number]> = [-half + 0.1, -half / 2, 0, half / 2, half - 0.1].map((x) => [
          x,
          Math.sin(((x + half) / (2 * half)) * Math.PI) * lift + 0.36,
          z,
        ]);
        for (let s = 0; s + 1 < pts.length; s++) k.stick(look.rail, pts[s], pts[s + 1], 0.06);
      }
    }
    if (look.snow) k.box('#FFFFFF', [0, lift + 0.02, 0], [half * 1.2, 0.05, w * 0.8]);
    if (look.vines) {
      for (const x of [-half + 0.15, half - 0.2]) k.ball(look.vines, [x, 0.25, w / 2], [0.18, 0.22, 0.12], { sides: 0 });
    }
  };
}

/** Flat stones across a canal. */
export function steppingStones3d(stone: string, shade: string): Model {
  return (k, { v, waterY }) => {
    for (const [x, s] of [
      [-1.7, 0.9],
      [0, 1],
      [1.7, 0.85],
    ] as const) {
      const z = Math.sin((x + v) * 9) * 0.25;
      k.cyl([shade, stone], [x, waterY - 0.1, z], 0.65 * s, -waterY + 0.25, { sides: 7, rz: 0.55 * s, top: 0.85 });
    }
  };
}

/** Round, cone-shaped or topiary-ball tree, with fruit once watered. */
export function tree3d(look: TreeLook): Model {
  // Trees sway gently in the breeze.
  return (k, info) => k.swing([0, 0, 0], [1, 0, 0.4], 0.035, 0.32 + info.v * 0.1, () => treeShape(k, info.v, look));
}

function treeShape(k: Kit, v: number, look: TreeLook) {
  const c0 = look.foliage[0];
  const c1 = look.foliage[1] ?? c0;
  const c2 = look.foliage[2] ?? c0;
  let base = 0;
  if (look.pot) {
    k.cyl(look.pot, [0, 0, 0], 0.4, 0.45, { sides: 8, top: 1.15 });
    k.cyl(look.pot, [0, 0.42, 0], 0.5, 0.1, { sides: 8 });
    base = 0.5;
  }
  if (look.shape === 'cone') {
    k.cyl(look.trunk, [0, base, 0], 0.1, 0.25);
    k.cone([c0, c1], [0, base + 0.2, 0], 0.55, 1.9, { sides: 8 });
    return;
  }
  if (look.shape === 'ball') {
    k.cyl(look.trunk, [0, base, 0], 0.07, 0.7);
    k.ball([c0, c1], [0, base + 1.05, 0], [0.55, 0.55, 0.55]);
  } else {
    k.cyl(look.trunk, [0, 0, 0], 0.13, 0.9, { top: 0.7 });
    k.stick(look.trunk, [0, 0.55, 0], [0.3, 0.9, 0.05], 0.1);
    k.ball([c0, c1], [0, 1.35, 0], [0.62, 0.55, 0.6]);
    k.ball(c1, [-0.38, 1.05, 0.15], [0.38, 0.34, 0.36]);
    k.ball(c2, [0.4, 1.1, -0.1], [0.4, 0.36, 0.38]);
  }
  if (look.fruit) {
    const fruit = look.fruit;
    const cy = base + (look.shape === 'ball' ? 1.05 : 1.3);
    const rad = look.shape === 'ball' ? 0.55 : 0.6;
    k.bloom(0.5, () => {
      for (let n = 0; n < 7; n++) {
        const a = n * 2.3 + v * 5;
        const y = cy + Math.sin(n * 1.7) * 0.3;
        const rr = Math.sqrt(Math.max(0.05, rad * rad - (y - cy) ** 2)) + 0.02;
        k.ball(fruit, [Math.cos(a) * rr, y, Math.sin(a) * rr], [0.09, 0.09, 0.09], { sides: 0 });
      }
    });
  }

}

/** Pine tree in stacked cones, optionally snowy. */
export function pine3d(dark: string, light: string, snow = false): Model {
  return (k, { v }) => k.swing([0, 0, 0], [1, 0, -0.3], 0.03, 0.3 + v * 0.1, () => pineShape(k, dark, light, snow));
}

function pineShape(k: Kit, dark: string, light: string, snow: boolean) {
  k.cyl('#8A6248', [0, 0, 0], 0.1, 0.35);
  const tiers: Array<[number, number, number]> = [
    [0.25, 0.7, 1.0],
    [0.75, 0.55, 0.85],
    [1.2, 0.4, 0.75],
  ];
  for (const [y, r, h] of tiers) {
    k.cone([dark, light], [0, y, 0], r, h, { sides: 7 });
    if (snow) k.cone('#FFFFFF', [0, y + h * 0.55, 0], r * 0.48, h * 0.45, { sides: 7 });
  }
}

/** Generic four-legged animal (body, head, legs), facing +x: enough for many styles' fauna. */
export function quadruped(
  k: Kit,
  look: { body: string; belly?: string; head?: string; legs?: string; size?: [number, number]; neck?: number; legLen?: number },
) {
  const [bl, bh] = look.size ?? [0.8, 0.45];
  const legLen = look.legLen ?? 0.35;
  const legs = look.legs ?? look.body;
  for (const x of [-bl * 0.6, bl * 0.55]) for (const z of [-0.18, 0.18]) k.cyl(legs, [x, 0, z], 0.07, legLen + 0.1, { sides: 5 });
  k.ball([look.belly ?? look.body, look.body], [0, legLen + bh * 0.5, 0], [bl, bh, 0.36]);
  const neck = look.neck ?? 0.25;
  const hx = bl * 0.95;
  const hy = legLen + bh * 0.7 + neck;
  if (neck > 0.3) k.stick(look.body, [bl * 0.7, legLen + bh * 0.6, 0], [hx, hy, 0], 0.18, 5);
  k.ball(look.head ?? look.body, [hx, hy, 0], [0.26, 0.22, 0.22]);
  k.ball('#3E3440', [hx + 0.12, hy + 0.06, 0.15], [0.04, 0.04, 0.03], { sides: 0 });
  k.ball('#3E3440', [hx + 0.12, hy + 0.06, -0.15], [0.04, 0.04, 0.03], { sides: 0 });
}
