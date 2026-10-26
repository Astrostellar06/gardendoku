/**
 * Per-tile decoration (grass patches, tufts, flowers, pebbles and the style's
 * props), generated deterministically in the tile's own frame so it rotates
 * with the tile and stays clear of the canals.
 */
import { DX, DY, popcount4 } from '../core/grid';
import { Rng } from '../core/rng';
import { P } from './palette';
import { currentTheme } from './themes';
import type { GroundInfo, PropDef } from './themes/types';

/** Tile geometry in unit coordinates (a cell spans -0.5..0.5). */
export const G = {
  /** Half size of the tile's top face. */
  half: 0.445,
  /** Height of the tile's side: the face sits depth/2 above the cell centre. */
  depth: 0.085,
  corner: 0.15,
  rimW: 0.36,
  grooveW: 0.24,
  waterW: 0.16,
  basinR: 0.17,
  pondR: 0.3,
} as const;

export interface Blob {
  x: number;
  y: number;
  r: number;
  delay: number;
  span: number;
}

export interface Flower {
  x: number;
  y: number;
  r: number;
  petals: number;
  color: string;
  center: string;
  rot: number;
  delay: number;
}

export interface Tuft {
  x: number;
  y: number;
  s: number;
  rot: number;
  delay: number;
}

export interface Pebble {
  x: number;
  y: number;
  r: number;
  rot: number;
}

/** A style prop placed on the tile. Canal / water props sit on an arm, `angle` turning their frame along it. */
export interface PropInstance {
  def: PropDef;
  x: number;
  y: number;
  r: number;
  angle: number;
  delay: number;
  v: number;
  v2: number;
}

export interface Decor {
  blobs: Blob[];
  flowers: Flower[];
  tufts: Tuft[];
  pebbles: Pebble[];
  props: PropInstance[];
  ground: GroundInfo;
  bloomColor: string;
  bloomPetals: number;
  padAngle: number;
  /** Small per-tile tint variation (-1..1). */
  tint: number;
}

/** Distance from (x, y) to the closest canal centre line of `mask`. */
function canalDistance(mask: number, x: number, y: number): number {
  let best = Math.hypot(x, y);
  for (let d = 0; d < 4; d++) {
    if (!(mask & (1 << d))) continue;
    const ex = DX[d] * 0.5;
    const ey = DY[d] * 0.5;
    // Project onto the segment (0,0) -> (ex, ey).
    const t = Math.max(0, Math.min(1, (x * ex + y * ey) / 0.25));
    best = Math.min(best, Math.hypot(x - ex * t, y - ey * t));
  }
  return best;
}

/** Props are authored small; they are scaled up so they read on a phone. */
const PROP_SCALE = { ground: 1.75, canal: 1.25, water: 1.2 } as const;
/** Upright props are drawn 1.5x their footprint, so their footprint stays smaller. */
const UPRIGHT_SCALE = 1.2;

const footprint = (d: PropDef) => (d.upright ? UPRIGHT_SCALE : PROP_SCALE[d.place]);

function weightedPick(defs: PropDef[], rng: Rng): PropDef {
  const total = defs.reduce((s, d) => s + d.weight, 0);
  let roll = rng.next() * total;
  for (const d of defs) {
    roll -= d.weight;
    if (roll < 0) return d;
  }
  return defs[defs.length - 1];
}

/** `minProps` forces a number of props (style previews). */
export function makeDecor(mask: number, seed: string, isSource: boolean, minProps = 0): Decor {
  const theme = currentTheme();
  const rng = new Rng(seed);
  const propRng = new Rng(`${seed}:${theme.id}`);
  const arms = popcount4(mask);
  const isLeaf = arms === 1 && !isSource;
  const hubClear = isSource ? G.pondR + 0.07 : isLeaf ? G.basinR + 0.1 : G.rimW / 2 + 0.04;
  const canalClear = G.rimW / 2 + 0.035;

  const fits = (x: number, y: number, r: number, slack: number): boolean => {
    if (Math.abs(x) > G.half - r - 0.02 || Math.abs(y) > G.half - r - 0.02) return false;
    if (Math.hypot(x, y) < hubClear + r * slack) return false;
    return canalDistance(mask, x, y) >= canalClear + r * slack;
  };

  // Style props first: they need the most room.
  const props: PropInstance[] = [];
  const rolled = propRng.chance(theme.propChance) ? (propRng.chance(theme.extraChance) ? 2 : 1) : 0;
  const wanted = Math.max(rolled, minProps);
  const armList = [0, 1, 2, 3].filter((d) => mask & (1 << d));

  /** Largest prop radius that fits at (x, y); props may lean a little over the canal rim. */
  const capacity = (x: number, y: number): number => {
    const slack = 0.45;
    let cap = Math.min(G.half - 0.02 - Math.abs(x), G.half - 0.02 - Math.abs(y));
    cap = Math.min(cap, (Math.hypot(x, y) - hubClear) / slack, (canalDistance(mask, x, y) - canalClear) / slack);
    for (const p of props) if (p.def.place === 'ground') cap = Math.min(cap, Math.hypot(p.x - x, p.y - y) - p.r - 0.01);
    return cap;
  };
  /** One of the roomiest spots of the tile (a little randomness keeps tiles varied). */
  const roomySpot = (): [number, number, number] => {
    const spots: Array<[number, number, number]> = [];
    for (let k = 0; k < 40; k++) {
      const x = propRng.float(-0.4, 0.4);
      const y = propRng.float(-0.4, 0.4);
      spots.push([x, y, capacity(x, y)]);
    }
    spots.sort((a, b) => b[2] - a[2]);
    return spots[propRng.int(3)];
  };

  for (let n = 0; n < wanted; n++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      let def = weightedPick(theme.props, propRng);
      if (props.some((p) => p.def.id === def.id)) continue;
      let r = propRng.float(def.size[0], def.size[1]) * footprint(def);
      let x = 0;
      let y = 0;
      let angle = 0;
      if (def.place === 'ground') {
        const [sx, sy, cap] = roomySpot();
        const minR = (d: PropDef) => d.size[0] * footprint(d) * 0.8;
        if (cap < minR(def)) {
          // Too big here: pick another ground prop that fits the spot.
          const fitting = theme.props.filter((d) => d.place === 'ground' && minR(d) <= cap && !props.some((p) => p.def.id === d.id));
          if (!fitting.length) continue;
          def = weightedPick(fitting, propRng);
          r = propRng.float(def.size[0], def.size[1]) * footprint(def);
        }
        r = Math.min(r, cap);
        x = sx;
        y = sy;
      } else {
        // Bridges and swimmers sit on a canal arm (never in the spring pond).
        if (isSource || !armList.length) continue;
        if (props.some((p) => p.def.place !== 'ground')) continue;
        const d = propRng.pick(armList);
        // Keep bridges clear of the tile edge.
        const t = def.place === 'canal' ? propRng.float(isLeaf ? 0.31 : 0.25, 0.33) : propRng.float(isLeaf ? 0.3 : 0.18, 0.36);
        x = DX[d] * t;
        y = DY[d] * t;
        angle = Math.atan2(DY[d], DX[d]) - Math.PI / 2;
      }
      props.push({ def, x, y, r, angle, delay: propRng.float(0.3, 0.6), v: propRng.next(), v2: propRng.next() });
      break;
    }
  }
  const clearOfProps = (x: number, y: number, r: number) =>
    props.every((p) => p.def.place !== 'ground' || Math.hypot(p.x - x, p.y - y) > p.r + r * 0.8);

  // Grass grows from the canal outwards with a few organic patches.
  const blobs: Blob[] = [{ x: 0, y: 0, r: 0.8, delay: 0, span: 0.75 }];
  for (let k = 0; k < 5; k++) {
    blobs.push({
      x: rng.float(-0.35, 0.35),
      y: rng.float(-0.35, 0.35),
      r: rng.float(0.16, 0.3),
      delay: rng.float(0.05, 0.35),
      span: rng.float(0.25, 0.4),
    });
  }

  const flowers: Flower[] = [];
  const flowerCount = isSource ? rng.range(1, 2) : arms >= 3 ? rng.range(1, 3) : rng.range(2, 4);
  const wantFlowers = Math.max(0, flowerCount - props.length);
  for (let attempt = 0; attempt < 60 && flowers.length < wantFlowers; attempt++) {
    const r = rng.float(0.055, 0.085);
    const x = rng.float(-0.45, 0.45);
    const y = rng.float(-0.45, 0.45);
    if (!fits(x, y, r, 0.7) || !clearOfProps(x, y, r)) continue;
    if (flowers.some((f) => Math.hypot(f.x - x, f.y - y) < f.r + r + 0.03)) continue;
    flowers.push({
      x,
      y,
      r,
      petals: rng.chance(0.7) ? 5 : 6,
      color: rng.pick(P.petals),
      center: rng.pick(P.centers),
      rot: rng.float(0, Math.PI * 2),
      delay: rng.float(0.35, 0.7),
    });
  }

  const tufts: Tuft[] = [];
  const tuftCount = rng.range(3, 6);
  for (let attempt = 0; attempt < 60 && tufts.length < tuftCount; attempt++) {
    const s = rng.float(0.05, 0.08);
    const x = rng.float(-0.45, 0.45);
    const y = rng.float(-0.45, 0.45);
    if (!fits(x, y, s * 0.6, 0.7) || !clearOfProps(x, y, s * 0.6)) continue;
    if (flowers.some((f) => Math.hypot(f.x - x, f.y - y) < f.r + s * 0.6)) continue;
    tufts.push({ x, y, s, rot: rng.float(-0.35, 0.35), delay: rng.float(0.2, 0.55) });
  }

  const pebbles: Pebble[] = [];
  const pebbleCount = rng.range(2, 5);
  for (let attempt = 0; attempt < 40 && pebbles.length < pebbleCount; attempt++) {
    const r = rng.float(0.018, 0.034);
    const x = rng.float(-0.44, 0.44);
    const y = rng.float(-0.44, 0.44);
    if (!fits(x, y, r, 0.7) || !clearOfProps(x, y, r)) continue;
    pebbles.push({ x, y, r, rot: rng.float(0, Math.PI) });
  }

  const tint = rng.float(-1, 1);
  return {
    blobs,
    flowers,
    tufts,
    pebbles,
    props,
    ground: { rnd: [rng.next(), rng.next(), rng.next(), rng.next(), rng.next(), rng.next()], tint },
    bloomColor: rng.pick(P.lotus),
    bloomPetals: rng.chance(0.5) ? 8 : 6,
    padAngle: rng.float(0, Math.PI * 2),
    tint,
  };
}
