/**
 * Pictures for the 3D garden, drawn with the 2D art: the styles' props
 * (paper cut-outs standing in the garden, or laid flat on it) and the padlock badge.
 */
import * as THREE from 'three';
import type { PropInstance } from '../render/decor';
import { P } from '../render/palette';
import { roundRectPath } from '../render/tileArt';

/** Pixels per tile unit, at most. */
const PX = 420;
const MAX_SIDE = 256;

export interface PropArt {
  texture: THREE.CanvasTexture;
  /** Size in tile units. */
  w: number;
  h: number;
  /** Height of the prop's foot in the picture, from its bottom (0..1). */
  foot: number;
}

function art(x0: number, x1: number, y0: number, y1: number, foot: number, draw: (ctx: CanvasRenderingContext2D) => void): PropArt {
  const w = x1 - x0;
  const h = y1 - y0;
  const scale = Math.min(PX, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w * scale));
  c.height = Math.max(2, Math.ceil(h * scale));
  const ctx = c.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  draw(ctx);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, w, h, foot };
}

/** A prop standing upright (trees, animals, lanterns), fully grown. */
export function uprightArt(p: PropInstance): PropArt {
  const { def, r } = p;
  const k = def.drawScale ?? 1.5;
  // Upright props stand on their base and grow upward from it, as in the 2D garden.
  const base = r * 0.9;
  const y0 = base - 2.8 * r * k;
  const y1 = base + 0.3 * r;
  return art(-1.35 * r * k, 1.35 * r * k, y0, y1, (y1 - base) / (y1 - y0), (ctx) => {
    ctx.translate(0, base);
    ctx.scale(k, k);
    ctx.translate(0, -base);
    def.draw(ctx, { r, bloom: 1, water: 1, time: 0, v: p.v, v2: p.v2 });
  });
}

/** A prop seen from above (ladybugs, lily pads, planks across a canal), fully grown. */
export function flatArt(p: PropInstance): PropArt {
  const e = p.r * 1.8;
  return art(-e, e, -e, e, 0.5, (ctx) => p.def.draw(ctx, { r: p.r, bloom: 1, water: 1, time: 0, v: p.v, v2: p.v2 }));
}

/** White badge with a padlock, in the style's colours. */
export function badgeTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.translate(s / 2, s / 2);
  ctx.shadowColor = 'rgba(140, 100, 170, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = P.lockBadge;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const k = (s * 0.4) / 0.12;
  ctx.scale(k, k);
  ctx.fillStyle = P.lockIcon;
  roundRectPath(ctx, -0.05, -0.012, 0.1, 0.072, 0.018);
  ctx.fill();
  ctx.strokeStyle = P.lockIcon;
  ctx.lineWidth = 0.019;
  ctx.beginPath();
  ctx.arc(0, -0.014, 0.029, Math.PI, 0);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
