/**
 * Background pieces for the garden styles (pixel coordinates).
 * Silhouettes made of several overlapping shapes must use opaque colours:
 * with transparency, branches would show through the foliage.
 */
import { circle } from './kit';

type Ctx = CanvasRenderingContext2D;

export function cloud(ctx: Ctx, cx: number, cy: number, s: number, color = 'rgba(255,255,255,0.7)') {
  // Each puff is its own sub-path: chained arcs would be joined by stray segments.
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [x, y, r] of [
    [cx, cy, 22 * s],
    [cx + 26 * s, cy - 10 * s, 28 * s],
    [cx + 56 * s, cy, 20 * s],
  ]) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.rect(cx, cy, 56 * s, 20 * s);
  ctx.fill();
}

export function clouds(ctx: Ctx, w: number, h: number, color?: string) {
  cloud(ctx, w * 0.08, h * 0.07, 0.7, color);
  cloud(ctx, w * 0.7, h * 0.04, 0.55, color);
}

/** One rolling hill layer. */
export function hill(ctx: Ctx, w: number, h: number, base: number, amp: number, color: string, phase: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 8; x += 8) {
    const y = base + Math.sin((x / w) * Math.PI * 1.6 + phase) * amp + Math.sin(x / 60 + phase) * amp * 0.15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function hills(ctx: Ctx, w: number, h: number, back: string, front: string) {
  hill(ctx, w, h, h * 0.9, 16, back, 0.4);
  hill(ctx, w, h, h * 0.95, 12, front, 2.2);
}

export function sun(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2);
  g.addColorStop(0, color.replace('ALPHA', '0.45'));
  g.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  circle(ctx, x, y, r, color.replace('ALPHA', '0.9'));
}

/** Snow-capped mountain (Fuji-like). */
export function mountain(ctx: Ctx, cx: number, baseY: number, width: number, height: number, color: string, cap: string) {
  const top = baseY - height;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, baseY);
  ctx.quadraticCurveTo(cx - width * 0.18, top + height * 0.25, cx - width * 0.07, top);
  ctx.lineTo(cx + width * 0.07, top);
  ctx.quadraticCurveTo(cx + width * 0.18, top + height * 0.25, cx + width / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cap;
  ctx.beginPath();
  const capY = top + height * 0.28;
  ctx.moveTo(cx - width * 0.07, top);
  ctx.lineTo(cx + width * 0.07, top);
  ctx.lineTo(cx + width * 0.15, capY);
  for (let k = 0; k <= 4; k++) {
    const x = cx + width * 0.15 - (k * width * 0.3) / 4;
    ctx.lineTo(x, capY + (k % 2 ? 8 : -2));
  }
  ctx.closePath();
  ctx.fill();
}

/** Smooth rolling dunes, back to front. */
export function dunes(ctx: Ctx, w: number, h: number, colors: string[]) {
  colors.forEach((color, k) => {
    const base = h * (0.82 + k * 0.06);
    const amp = 34 - k * 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 6) {
      const u = (x / w) * Math.PI;
      const y = base - amp * (0.5 + 0.5 * Math.sin(u * (1.3 + k * 0.45) + k * 1.9)) - amp * 0.2 * Math.sin(u * 3.1 + k);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  });
}

export function acaciaSilhouette(ctx: Ctx, x: number, baseY: number, s: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, baseY - 30 * s);
  ctx.lineTo(x - 14 * s, baseY - 44 * s);
  ctx.moveTo(x, baseY - 30 * s);
  ctx.lineTo(x + 16 * s, baseY - 46 * s);
  ctx.stroke();
  ctx.fillStyle = color;
  for (const [ex, ey, rx, ry] of [
    [x, baseY - 50 * s, 34 * s, 9 * s],
    [x - 18 * s, baseY - 47 * s, 18 * s, 7 * s],
    [x + 20 * s, baseY - 48 * s, 18 * s, 7 * s],
  ]) {
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function pineSilhouette(ctx: Ctx, x: number, baseY: number, s: number, color: string, snow?: string) {
  for (let k = 0; k < 3; k++) {
    const y = baseY - 10 * s - k * 14 * s;
    const half = (20 - k * 5) * s;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - half, y);
    ctx.lineTo(x, y - 22 * s);
    ctx.lineTo(x + half, y);
    ctx.closePath();
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.moveTo(x - half * 0.35, y - 14 * s);
      ctx.lineTo(x, y - 22 * s);
      ctx.lineTo(x + half * 0.35, y - 14 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = color;
  ctx.fillRect(x - 3 * s, baseY - 10 * s, 6 * s, 10 * s);
}

export function roundTree(ctx: Ctx, x: number, baseY: number, s: number, foliage: string, trunk: string) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 2.5 * s, baseY - 16 * s, 5 * s, 16 * s);
  circle(ctx, x, baseY - 26 * s, 15 * s, foliage);
  circle(ctx, x - 9 * s, baseY - 20 * s, 10 * s, foliage);
  circle(ctx, x + 9 * s, baseY - 21 * s, 10 * s, foliage);
}

/** Big tropical leaves framing the screen. */
export function jungleLeaf(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, vein: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -len * 0.35, 0, -len);
  ctx.quadraticCurveTo(-len * 0.45, -len * 0.35, 0, 0);
  ctx.fill();
  // Veins stay inside the leaf.
  ctx.clip();
  ctx.strokeStyle = vein;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len * 0.95);
  for (let k = 1; k < 6; k++) {
    const yy = -len * (k / 6.5);
    ctx.moveTo(0, yy);
    ctx.lineTo(len * 0.22, yy - len * 0.08);
    ctx.moveTo(0, yy);
    ctx.lineTo(-len * 0.22, yy - len * 0.08);
  }
  ctx.stroke();
  ctx.restore();
}

export function reeds(ctx: Ctx, w: number, h: number, color: string, head: string) {
  for (let k = 0; k < 26; k++) {
    const x = (k / 25) * w + Math.sin(k * 7.1) * 10;
    const top = h * (0.8 + Math.sin(k * 3.7) * 0.05);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(x + 4, (h + top) / 2, x + Math.sin(k) * 8, top);
    ctx.stroke();
    if (k % 3 === 0) {
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(k) * 8, top + 8, 3.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
