/**
 * Background pieces for the garden styles (pixel coordinates).
 * Silhouettes made of several overlapping shapes must use opaque colours:
 * with transparency, branches would show through the foliage.
 */
import { circle, poly } from './kit';

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

/** City skyline along the bottom, with a few lit windows. */
export function skyline(ctx: Ctx, w: number, baseY: number, color: string, windows?: string, seed = 0) {
  let x = -10 - seed * 7;
  let k = seed;
  while (x < w + 10) {
    const bw = 26 + ((k * 37) % 23);
    const bh = 40 + ((k * 53) % 70);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - bh, bw, bh + 2);
    if (k % 4 === 1) {
      // Spire or water tower on some roofs.
      ctx.fillRect(x + bw / 2 - 1.5, baseY - bh - 14, 3, 14);
    } else if (k % 4 === 3) {
      ctx.fillRect(x + 4, baseY - bh - 6, bw - 8, 6);
    }
    if (windows) {
      ctx.fillStyle = windows;
      for (let wy = baseY - bh + 8; wy < baseY - 8; wy += 11) {
        for (let wx = x + 5; wx < x + bw - 6; wx += 8) {
          if ((Math.floor(wx * 7 + wy * 3) % 5) < 2) ctx.fillRect(wx, wy, 3.5, 5);
        }
      }
    }
    x += bw + 3;
    k++;
  }
}

/** Buttes of each mesa layer, back to front: [left, right] as fractions of the width, and height in px. */
const BUTTES: Array<Array<[number, number, number]>> = [
  [
    [0.04, 0.3, 100],
    [0.52, 0.68, 125],
    [0.8, 1.08, 85],
  ],
  [
    [-0.12, 0.1, 60],
    [0.34, 0.47, 78],
    [0.7, 0.8, 50],
  ],
  [[0.18, 0.24, 34]],
];

/** Flat-topped buttes in layered rock, with scree flaring at their feet, back to front. */
export function mesas(ctx: Ctx, w: number, h: number, colors: string[], stripe: string) {
  const u = h / 812;
  colors.forEach((color, k) => {
    const base = h * (0.875 + k * 0.04);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, base);
    let tallest = 0;
    for (const [x0, x1, height] of BUTTES[k % BUTTES.length]) {
      const a = x0 * w;
      const b = x1 * w;
      const hh = height * u;
      const top = base - hh;
      tallest = Math.max(tallest, hh);
      ctx.lineTo(a - 15 * u, base);
      ctx.quadraticCurveTo(a - 1 * u, base - 3 * u, a, base - hh * 0.22);
      ctx.lineTo(a + 3 * u, top + hh * 0.3);
      ctx.lineTo(a + 1 * u, top + hh * 0.22);
      ctx.lineTo(a + 6 * u, top + 3 * u);
      ctx.lineTo(a + 10 * u, top);
      ctx.lineTo(b - 10 * u, top);
      ctx.lineTo(b - 5 * u, top + 4 * u);
      ctx.lineTo(b - 2 * u, top + hh * 0.35);
      ctx.lineTo(b, base - hh * 0.22);
      ctx.quadraticCurveTo(b + 1 * u, base - 3 * u, b + 15 * u, base);
    }
    ctx.lineTo(w, base);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // Pale strata bands across the rock.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = stripe;
    for (let y = base - tallest + 8 * u, n = 0; y < base - 6 * u; y += 13 * u, n++) {
      ctx.fillRect(0, y, w, (n % 2 ? 2 : 4) * u);
    }
    // Shaded right flank of each butte.
    for (const [x0, x1, height] of BUTTES[k % BUTTES.length]) {
      const span = (x1 - x0) * w;
      const shade = ctx.createLinearGradient(0, base - height * u, 0, base - height * u * 0.15);
      shade.addColorStop(0, 'rgba(150, 60, 40, 0.14)');
      shade.addColorStop(1, 'rgba(150, 60, 40, 0)');
      ctx.fillStyle = shade;
      ctx.fillRect(x1 * w - span * 0.28, base - height * u, span * 0.28, height * u);
    }
    ctx.restore();
  });
}

/** Rolling fields rising to the horizon: each hill is split into coloured plots with furrows. */
export function fields(ctx: Ctx, w: number, h: number, horizon: number, colors: string[]) {
  const layers = 4;
  for (let k = 0; k < layers; k++) {
    const base = horizon + (h - horizon) * (k / layers) * 0.85;
    const amp = 9 - k * 1.5;
    const top = (x: number) => base + Math.sin((x / w) * Math.PI * 1.4 + k * 1.7) * amp;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, top(x));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.clip();
    const plots = 3 + k;
    const shift = k % 2 ? 18 : -12;
    for (let p = 0; p < plots; p++) {
      const x0 = (w * p) / plots + shift;
      const x1 = (w * (p + 1)) / plots + shift;
      ctx.fillStyle = colors[(k * 2 + p) % colors.length];
      ctx.beginPath();
      ctx.moveTo(p === 0 ? -40 : x0 - 30, h);
      ctx.lineTo(p === 0 ? -40 : x0 + 12, base - amp - 4);
      ctx.lineTo(p === plots - 1 ? w + 40 : x1 + 12, base - amp - 4);
      ctx.lineTo(p === plots - 1 ? w + 40 : x1 - 30, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2 + k * 0.4;
    ctx.beginPath();
    for (let j = 1; j < 7; j++) {
      const dy = j * (4 + k * 3);
      for (let x = 0; x <= w + 8; x += 8) {
        if (x === 0) ctx.moveTo(x, top(x) + dy);
        else ctx.lineTo(x, top(x) + dy);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Classical palace on the horizon: mansard roofs, end pavilions and a domed centre. */
export function palace(ctx: Ctx, cx: number, baseY: number, s: number, wall: string, roof: string) {
  const half = 110 * s;
  const body = 28 * s;
  const top = baseY - body;
  const glass = 'rgba(110, 130, 165, 0.6)';
  const gold = '#E8C060';
  ctx.fillStyle = wall;
  ctx.fillRect(cx - half, top, half * 2, body);
  poly(ctx, [cx - half - 2 * s, top, cx - half + 6 * s, top - 10 * s, cx + half - 6 * s, top - 10 * s, cx + half + 2 * s, top], roof);
  for (const side of [-1, 1]) {
    const px = cx + side * (half - 16 * s);
    ctx.fillStyle = wall;
    ctx.fillRect(px - 16 * s, top - 8 * s, 32 * s, body + 8 * s);
    poly(ctx, [px - 18 * s, top - 8 * s, px - 12 * s, top - 22 * s, px + 12 * s, top - 22 * s, px + 18 * s, top - 8 * s], roof);
    ctx.fillStyle = gold;
    ctx.fillRect(px - 12 * s, top - 23 * s, 24 * s, 1.5 * s);
  }
  // Central pavilion: pediment and dome.
  ctx.fillStyle = wall;
  ctx.fillRect(cx - 22 * s, top - 12 * s, 44 * s, body + 12 * s);
  poly(ctx, [cx - 25 * s, top - 12 * s, cx, top - 24 * s, cx + 25 * s, top - 12 * s], '#F8F1E6');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.arc(cx, top - 24 * s, 11 * s, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.fillRect(cx - 1.5 * s, top - 42 * s, 3 * s, 8 * s);
  circle(ctx, cx, top - 43 * s, 2.5 * s, gold);
  // Two rows of tall windows, and a golden ridge.
  ctx.fillStyle = glass;
  for (let x = cx - half + 5 * s; x < cx + half - 8 * s; x += 9 * s) {
    ctx.fillRect(x, top + 5 * s, 4 * s, 8 * s);
    ctx.fillRect(x, top + 17 * s, 4 * s, 8 * s);
  }
  ctx.fillStyle = gold;
  ctx.fillRect(cx - half + 6 * s, top - 10.5 * s, half * 2 - 12 * s, 1.5 * s);
}

/** Soft rainbow arc. */
export function rainbow(ctx: Ctx, cx: number, cy: number, r: number, alpha: number) {
  const bands = ['255,140,170', '255,190,120', '255,230,130', '160,225,150', '140,200,255', '196,168,250'];
  ctx.lineWidth = r * 0.06;
  bands.forEach((rgb, k) => {
    ctx.strokeStyle = `rgba(${rgb},${alpha})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r - k * r * 0.06, Math.PI, 0);
    ctx.stroke();
  });
}

/** Windmill on the horizon. */
export function windmillSilhouette(ctx: Ctx, x: number, baseY: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, baseY);
  ctx.lineTo(x - 5 * s, baseY - 36 * s);
  ctx.lineTo(x + 5 * s, baseY - 36 * s);
  ctx.lineTo(x + 9 * s, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, baseY - 36 * s);
  ctx.lineTo(x, baseY - 44 * s);
  ctx.lineTo(x + 7 * s, baseY - 36 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = 0.4 + (k * Math.PI) / 2;
    ctx.moveTo(x, baseY - 38 * s);
    ctx.lineTo(x + Math.cos(a) * 22 * s, baseY - 38 * s + Math.sin(a) * 22 * s);
  }
  ctx.stroke();
}

export function reeds(ctx: Ctx, w: number, h: number, color: string, head: string) {
  for (let k = 0; k < 26; k++) {
    const x = (k / 25) * w + Math.sin(k * 7.1) * 10;
    const top = h * (0.8 + Math.sin(k * 3.7) * 0.05);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const cx = x + 4;
    const cy = (h + top) / 2;
    const tx = x + Math.sin(k) * 8;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(cx, cy, tx, top);
    ctx.stroke();
    if (k % 3 === 0) {
      // The brown head sits on the stem just below its tip, along the stem.
      const t = 0.9;
      const px = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * tx;
      const py = (1 - t) ** 2 * h + 2 * (1 - t) * t * cy + t * t * top;
      const dx = 2 * (1 - t) * (cx - x) + 2 * t * (tx - cx);
      const dy = 2 * (1 - t) * (cy - h) + 2 * t * (top - cy);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.ellipse(px, py, 3.5, 9, Math.atan2(dy, dx) + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
