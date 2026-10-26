/**
 * Procedural drawing of one garden tile, in unit coordinates centred on the
 * tile (-0.5..0.5) and in the tile's own (unrotated) frame.
 */
import { DX, DY, popcount4 } from '../core/grid';
import { Decor, Flower, G, PropInstance } from './decor';
import { clamp01, easeOutBack, easeOutCubic, sub } from './easing';
import { mixColor, P } from './palette';
import { currentTheme } from './themes';

export interface TileState {
  mask: number;
  decor: Decor;
  isSource: boolean;
  bloom: number;
  water: number;
  /** Side (in tile frame) through which water enters, -1 for none. */
  inflow: number;
  /** 0..1, tints water toward the loop warning colour. */
  loop: number;
  /** Resting rotation (quarter turns), so plants can be drawn upright on screen. */
  rot: number;
}

const TAU = Math.PI * 2;
/** Canals are drawn a bit past the tile edge; the tile clip trims them. */
const REACH = 0.56;

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function strokeArms(ctx: CanvasRenderingContext2D, mask: number, width: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let d = 0; d < 4; d++) {
    if (!(mask & (1 << d))) continue;
    ctx.moveTo(0, 0);
    ctx.lineTo(DX[d] * REACH, DY[d] * REACH);
  }
  ctx.stroke();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function drawSmallFlower(ctx: CanvasRenderingContext2D, f: Flower, t: number) {
  const s = easeOutBack(t);
  if (s <= 0) return;
  const r = f.r * s;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot + (1 - t) * 1.2);
  const custom = currentTheme().smallFlower;
  if (custom) {
    custom(ctx, r, f.color, f.center);
    ctx.restore();
    return;
  }
  // Soft shadow under the flower.
  disc(ctx, 0.008, 0.012, r * 0.9, 'rgba(120, 150, 110, 0.18)');
  ctx.fillStyle = f.color;
  for (let k = 0; k < f.petals; k++) {
    const a = (k / f.petals) * TAU;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.5, r * 0.34, a, 0, TAU);
    ctx.fill();
  }
  disc(ctx, 0, 0, r * 0.32, f.center);
  ctx.restore();
}

function drawTuft(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, t: number) {
  const k = easeOutBack(t);
  if (k <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  const custom = currentTheme().tuft;
  if (custom) {
    custom(ctx, s);
    ctx.restore();
    return;
  }
  ctx.strokeStyle = P.grassDeep;
  ctx.lineWidth = 0.016;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, s * 0.4);
  ctx.quadraticCurveTo(-s * 0.35, 0, -s * 0.55, -s * 0.35);
  ctx.moveTo(0, s * 0.4);
  ctx.quadraticCurveTo(0.004, -s * 0.1, s * 0.02, -s * 0.6);
  ctx.moveTo(s * 0.15, s * 0.4);
  ctx.quadraticCurveTo(s * 0.35, 0.02, s * 0.5, -s * 0.3);
  ctx.stroke();
  ctx.restore();
}

function petalPath(ctx: CanvasRenderingContext2D, w: number, l: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w, -l * 0.55, 0, -l);
  ctx.quadraticCurveTo(-w, -l * 0.55, 0, 0);
  ctx.closePath();
}

/** Lily pad with a lotus flower; `t` is the bloom progress (0..1). */
export function drawLotus(
  ctx: CanvasRenderingContext2D,
  r: number,
  color: string,
  petals: number,
  padAngle: number,
  t: number,
) {
  const padT = easeOutCubic(clamp01(t / 0.6));
  if (padT > 0) {
    ctx.save();
    ctx.rotate(padAngle);
    ctx.fillStyle = P.lily;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.95 * padT, 0.35, TAU - 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = P.lilyDark;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = 0.9 + k * 1.3;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.7 * padT, Math.sin(a) * r * 0.7 * padT);
    }
    ctx.stroke();
    ctx.restore();
  }
  const f = easeOutBack(sub(t, 0.35, 0.65), 1.6);
  if (f <= 0) return;
  const open = 0.55 + 0.45 * f;
  ctx.save();
  ctx.scale(f, f);
  ctx.fillStyle = mixColor(color, '#C98AA6', 0.12);
  for (let k = 0; k < petals; k++) {
    ctx.save();
    ctx.rotate((k / petals) * TAU + 0.2);
    petalPath(ctx, r * 0.3, r * 0.85 * open);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = color;
  for (let k = 0; k < petals; k++) {
    ctx.save();
    ctx.rotate(((k + 0.5) / petals) * TAU + 0.2);
    petalPath(ctx, r * 0.26, r * 0.7 * open);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = mixColor(color, '#FFFFFF', 0.55);
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.rotate((k / 4) * TAU + 0.6);
    petalPath(ctx, r * 0.18, r * 0.42 * open);
    ctx.fill();
    ctx.restore();
  }
  disc(ctx, 0, 0, r * 0.14, P.centers[0]);
  ctx.restore();
}

/** Little seedling waiting for water in a dry basin. */
function drawSprout(ctx: CanvasRenderingContext2D, s: number) {
  if (s <= 0) return;
  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = P.grassDeep;
  ctx.lineWidth = 0.018;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.05);
  ctx.quadraticCurveTo(0.01, 0, 0, -0.04);
  ctx.stroke();
  ctx.fillStyle = P.grassDark;
  ctx.beginPath();
  ctx.ellipse(-0.035, -0.05, 0.04, 0.022, -0.5, 0, TAU);
  ctx.ellipse(0.035, -0.055, 0.04, 0.022, 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawTile(ctx: CanvasRenderingContext2D, st: TileState) {
  const { mask, decor, isSource, bloom, water } = st;
  const arms = popcount4(mask);
  const isLeaf = arms === 1 && !isSource;
  const H = G.half;

  ctx.save();
  roundRectPath(ctx, -H, -H, H * 2, H * 2, G.corner);
  ctx.clip();

  // Dry soil.
  const soil = ctx.createLinearGradient(-H, -H, H, H);
  soil.addColorStop(0, P.soilLight);
  soil.addColorStop(1, decor.tint > 0 ? P.soil : mixColor(P.soil, P.soilDark, 0.25));
  ctx.fillStyle = soil;
  ctx.fillRect(-0.5, -0.5, 1, 1);
  for (const p of decor.pebbles) {
    ctx.fillStyle = P.pebbleShade;
    ctx.beginPath();
    ctx.ellipse(p.x + 0.006, p.y + 0.008, p.r, p.r * 0.75, p.rot, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.pebble;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.75, p.rot, 0, TAU);
    ctx.fill();
  }
  const theme = currentTheme();
  theme.dryGround?.(ctx, decor.ground);

  // Grass spreading from the canal.
  if (bloom > 0) {
    const grass = ctx.createLinearGradient(-H, -H, H, H);
    grass.addColorStop(0, P.grassLight);
    grass.addColorStop(1, decor.tint > 0 ? P.grass : mixColor(P.grass, P.grassDark, 0.2));
    ctx.fillStyle = grass;
    ctx.beginPath();
    for (const b of decor.blobs) {
      const k = easeOutCubic(sub(bloom, b.delay, b.span));
      if (k <= 0) continue;
      ctx.moveTo(b.x + b.r * k, b.y);
      ctx.arc(b.x, b.y, b.r * k, 0, TAU);
    }
    ctx.fill();
    if (theme.bloomGround) {
      ctx.save();
      ctx.clip();
      theme.bloomGround(ctx, decor.ground);
      ctx.restore();
    }
  }

  // Canal: stone rim then sandy groove.
  ctx.lineCap = 'round';
  strokeArms(ctx, mask, G.rimW + 0.04, P.rimShade);
  if (isSource) disc(ctx, 0, 0, G.pondR + 0.065, P.rimShade);
  else if (isLeaf) disc(ctx, 0, 0, G.basinR + 0.065, P.rimShade);
  strokeArms(ctx, mask, G.rimW, P.rim);
  if (isSource) disc(ctx, 0, 0, G.pondR + 0.045, P.rim);
  else if (isLeaf) disc(ctx, 0, 0, G.basinR + 0.045, P.rim);
  strokeArms(ctx, mask, G.grooveW, P.grooveDeep);
  strokeArms(ctx, mask, G.grooveW - 0.05, P.groove);
  if (isLeaf) {
    disc(ctx, 0, 0, G.basinR, P.grooveDeep);
    disc(ctx, 0.01, 0.012, G.basinR - 0.03, P.groove);
  }

  // Water: a deeper edge and a lighter body.
  const loopMix = st.loop * 0.75;
  const waterEdge = st.loop > 0 ? mixColor(P.waterDeep, P.loop, loopMix) : P.waterDeep;
  const waterColor = st.loop > 0 ? mixColor(P.water, P.loop, loopMix) : P.water;
  const strokeWater = () => {
    ctx.strokeStyle = waterEdge;
    ctx.lineWidth = G.waterW;
    ctx.stroke();
    ctx.strokeStyle = waterColor;
    ctx.lineWidth = G.waterW - 0.045;
    ctx.stroke();
  };
  if (isSource) {
    disc(ctx, 0, 0, G.pondR, waterEdge);
    disc(ctx, 0, 0, G.pondR - 0.025, waterColor);
    const k = easeOutCubic(water);
    ctx.beginPath();
    for (let d = 0; d < 4; d++) {
      if (!(mask & (1 << d))) continue;
      ctx.moveTo(DX[d] * G.pondR * 0.8, DY[d] * G.pondR * 0.8);
      ctx.lineTo(DX[d] * (G.pondR * 0.8 + (REACH - G.pondR * 0.8) * k), DY[d] * (G.pondR * 0.8 + (REACH - G.pondR * 0.8) * k));
    }
    if (k > 0) strokeWater();
    disc(ctx, 0, 0, G.pondR - 0.025, waterColor);
  } else if (water > 0) {
    const inArm = st.inflow >= 0 && mask & (1 << st.inflow) ? st.inflow : -1;
    const inPart = inArm < 0 ? 0 : isLeaf ? 0.65 : 0.45;
    ctx.beginPath();
    let any = false;
    if (inArm >= 0) {
      const a = sub(water, 0, inPart);
      const ex = DX[inArm] * REACH;
      const ey = DY[inArm] * REACH;
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex * (1 - a), ey * (1 - a));
      any = a > 0;
    }
    const b = sub(water, inPart, 1 - inPart);
    if (b > 0 && !isLeaf) {
      for (let d = 0; d < 4; d++) {
        if (d === inArm || !(mask & (1 << d))) continue;
        ctx.moveTo(0, 0);
        ctx.lineTo(DX[d] * REACH * b, DY[d] * REACH * b);
        any = true;
      }
    }
    if (any) strokeWater();
    if (isLeaf && b > 0) {
      const r = (G.basinR - 0.02) * easeOutCubic(b);
      disc(ctx, 0, 0, r, waterEdge);
      disc(ctx, 0, 0, Math.max(0, r - 0.022), waterColor);
      if (inArm >= 0) {
        // Re-open the inlet so the basin and its canal read as one body of water.
        ctx.beginPath();
        ctx.moveTo(DX[inArm] * r * 0.5, DY[inArm] * r * 0.5);
        ctx.lineTo(DX[inArm] * (r + 0.01), DY[inArm] * (r + 0.01));
        ctx.strokeStyle = waterColor;
        ctx.lineWidth = G.waterW - 0.045;
        ctx.stroke();
      }
    }
  }

  // Spring pond details.
  if (isSource) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.arc(0, 0, G.pondR - 0.04, Math.PI * 1.05, Math.PI * 1.45);
    ctx.stroke();
    ctx.save();
    ctx.translate(G.pondR * 0.3, G.pondR * 0.28);
    drawLotus(ctx, 0.13, decor.bloomColor, 8, decor.padAngle, 0.4 + bloom * 0.6);
    ctx.restore();
  }

  // End of a canal: a seedling becomes a lotus (or the style's own bloom).
  const upright = (-st.rot * Math.PI) / 2;
  if (isLeaf) {
    const t = sub(bloom, 0.3, 0.7);
    ctx.save();
    ctx.rotate(upright);
    drawSprout(ctx, 1 - easeOutCubic(clamp01(t * 3)));
    ctx.restore();
    if (t > 0) {
      if (theme.basin) theme.basin(ctx, G.basinR * 0.95, decor.ground, t);
      else drawLotus(ctx, G.basinR * 0.95, decor.bloomColor, decor.bloomPetals, decor.padAngle, t);
    }
  }

  // Bridges over the canals, then things floating on the water.
  for (const p of decor.props) {
    if (p.def.place !== 'ground' && !p.def.animated) drawProp(ctx, p, st, upright, 0);
  }

  // Tufts and flowers (plants stand upright once the tile is at rest).
  if (bloom > 0) {
    for (const t of decor.tufts) drawTuft(ctx, t.x, t.y, t.s, t.rot + upright, sub(bloom, t.delay, 0.35));
    for (const f of decor.flowers) drawSmallFlower(ctx, f, sub(bloom, f.delay, 0.3));
  }

  ctx.restore();

  // Ground props, back to front as seen on screen. They are not clipped to the
  // tile face: a tree may rise a little above it, over the tile behind.
  const ground = decor.props.filter((p) => p.def.place === 'ground' && !p.def.animated);
  if (ground.length > 1) {
    const a = (st.rot * Math.PI) / 2;
    const screenY = (p: PropInstance) => p.x * Math.sin(a) + p.y * Math.cos(a);
    ground.sort((p, q) => screenY(p) - screenY(q));
  }
  for (const p of ground) drawProp(ctx, p, st, upright, 0);
}

/** How far (in tiles) drawings may spill outside the tile, e.g. tall props. */
export const TILE_OVERFLOW = 0.2;

/** Draw one style prop in its own frame, scaled in when it belongs to the bloom. */
function drawProp(ctx: CanvasRenderingContext2D, p: PropInstance, st: TileState, upright: number, time: number) {
  const def = p.def;
  let scale = 1;
  if (def.when === 'bloom') {
    const t = def.place === 'water' ? sub(st.water, 0.5, 0.5) * sub(st.bloom, p.delay * 0.5, 0.3) : sub(st.bloom, p.delay, 0.35);
    scale = easeOutBack(t);
    if (scale <= 0.01) return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  if (def.place !== 'ground') ctx.rotate(p.angle);
  else if (def.upright) ctx.rotate(upright);
  // Upright props stand on their base and grow upward from it.
  const k = scale * (def.upright ? def.drawScale ?? 1.5 : 1);
  const base = def.upright ? p.r * 0.9 : 0;
  if (k !== 1) {
    ctx.translate(0, base);
    ctx.scale(k, k);
    ctx.translate(0, -base);
  }
  def.draw(ctx, { r: p.r, bloom: st.bloom, water: st.water, time, v: p.v, v2: p.v2 });
  ctx.restore();
}

/**
 * Animated details drawn every frame on top of the (possibly cached) tile:
 * glints flowing down the canals and ripples in the spring.
 */
export function drawTileOverlay(ctx: CanvasRenderingContext2D, st: TileState, time: number) {
  const { mask, isSource } = st;
  for (const p of st.decor.props) {
    if (p.def.animated) drawProp(ctx, p, st, (-st.rot * Math.PI) / 2, time);
  }
  if (st.water >= 1) {
    // Two lanes of irregular glints drifting downstream.
    ctx.save();
    ctx.lineCap = 'round';
    const arms = popcount4(mask);
    const lanes: Array<[number, number[], number, number, string]> = [
      [0.026, [0.035, 0.11, 0.07, 0.19], 0.3, 0.018, 'rgba(255,255,255,0.7)'],
      [-0.022, [0.05, 0.23, 0.02, 0.09], 0.22, 0.013, 'rgba(255,255,255,0.45)'],
    ];
    for (const [offset, dash, speed, width, color] of lanes) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.lineDashOffset = -time * speed;
      ctx.beginPath();
      for (let d = 0; d < 4; d++) {
        if (!(mask & (1 << d))) continue;
        const ex = DX[d] * (G.half - 0.03);
        const ey = DY[d] * (G.half - 0.03);
        const ox = -DY[d] * offset;
        const oy = DX[d] * offset;
        const start = isSource ? G.pondR * 0.9 : 0;
        if (d === st.inflow) {
          ctx.moveTo(ex + ox, ey + oy);
          ctx.lineTo(ox, oy);
        } else if (!(arms === 1 && !isSource)) {
          ctx.moveTo(DX[d] * start + ox, DY[d] * start + oy);
          ctx.lineTo(ex + ox, ey + oy);
        }
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (isSource) {
    ctx.lineWidth = 0.014;
    for (let k = 0; k < 3; k++) {
      const ph = (time * 0.35 + k / 3) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(-0.06, -0.05, 0.03 + ph * (G.pondR - 0.08), 0, TAU);
      ctx.stroke();
    }
    // Tiny bubbling spout.
    disc(ctx, -0.06, -0.05, 0.022 + Math.sin(time * 5) * 0.004, 'rgba(255,255,255,0.85)');
  }
}
