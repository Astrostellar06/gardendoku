/** Small drawing kit shared by the garden styles (all sizes in tile units). */

export const TAU = Math.PI * 2;

type Ctx = CanvasRenderingContext2D;
/** A fill colour or gradient. */
export type Paint = string | CanvasGradient;

export function circle(ctx: Ctx, x: number, y: number, r: number, color: Paint) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  ctx.fill();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, color: Paint) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU);
  ctx.fill();
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: Paint) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

/** Filled polygon from a flat [x0, y0, x1, y1, ...] list. */
export function poly(ctx: Ctx, pts: number[], color: Paint) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
  ctx.closePath();
  ctx.fill();
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, color: Paint) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function curve(ctx: Ctx, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w: number, color: Paint) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
}

/** Pointed leaf starting at (x, y), pointing toward `angle` (0 = up). */
export function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, angle: number, color: Paint) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
  ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
  ctx.fill();
  ctx.restore();
}

/** Soft contact shadow under an object standing at (x, y). */
export function groundShadow(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 0.42) {
  ellipse(ctx, x, y, rx, ry, 0, 'rgba(70, 45, 40, 0.16)');
}

export function star(ctx: Ctx, x: number, y: number, r: number, points: number, inner: number, color: Paint, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const rad = k % 2 === 0 ? r : r * inner;
    const a = rot - Math.PI / 2 + (k * Math.PI) / points;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Simple maple leaf (five rounded lobes and a stem). */
export function mapleLeaf(ctx: Ctx, x: number, y: number, s: number, rot: number, color: Paint) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  star(ctx, 0, 0, s, 5, 0.5, color);
  circle(ctx, 0, 0, s * 0.45, color);
  line(ctx, 0, s * 0.3, 0, s * 1.05, s * 0.14, color);
  ctx.restore();
}

export function snowflake(ctx: Ctx, x: number, y: number, r: number, color: Paint) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
}

/** Radial glow, e.g. around a lit lantern. */
export function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, alpha: number) {
  if (alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Tiny dot eyes for the little animals. */
export function eyes(ctx: Ctx, x: number, y: number, gap: number, r: number) {
  circle(ctx, x - gap, y, r, '#4A3A44');
  circle(ctx, x + gap, y, r, '#4A3A44');
}
