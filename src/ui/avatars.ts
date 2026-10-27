/** Player avatars: small round badges in the garden's art style (pick one in the profile). */
import { t } from '../i18n';

type AvatarKey = 'lotus' | 'sunflower' | 'mushroom' | 'ladybug' | 'snail' | 'frog' | 'hedgehog' | 'bee' | 'duck' | 'rabbit' | 'butterfly' | 'cactus';

export interface Avatar {
  /** Stable id stored on the server: never reorder or reuse ids. */
  id: number;
  /** Name key (`avatar.<key>` in src/i18n), shown as a tooltip / accessible label. */
  key: AvatarKey;
  /** A complete standalone SVG string: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">…</svg> */
  svg: string;
}

// Every shape below sets its own fill and stroke: the page's global CSS gives
// `svg` a stroke and no fill, and those would leak into any shape that relies on
// defaults. Light comes from the top left: shapes get a slightly darker copy
// peeking out on their bottom right.

const INK = '#5B4660';
const CREAM = '#FFF8EF';
const BLUSH = '#FFB2CC';

/** Rounds computed coordinates so the markup stays short. */
const f = (v: number): number => Math.round(v * 100) / 100;
const rot = (a: number, cx: number, cy: number): string => ` transform="rotate(${f(a)} ${f(cx)} ${f(cy)})"`;
const op = (o: number): string => ` opacity="${o}"`;

/** One shape element; `stroke` set means a rounded outline of that width. */
function el(tag: string, attrs: string, fill: string, extra = '', stroke?: [string, number]): string {
  const s = stroke
    ? ` stroke="${stroke[0]}" stroke-width="${stroke[1]}" stroke-linecap="round" stroke-linejoin="round"`
    : ' stroke="none"';
  return `<${tag} ${attrs} fill="${fill}"${s}${extra}/>`;
}

const circle = (cx: number, cy: number, r: number, fill: string, extra = ''): string =>
  el('circle', `cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"`, fill, extra);
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = ''): string =>
  el('ellipse', `cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"`, fill, extra);
const rect = (x: number, y: number, w: number, h: number, r: number, fill: string, extra = ''): string =>
  el('rect', `x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}"`, fill, extra);
const path = (d: string, fill: string, extra = ''): string => el('path', `d="${d}"`, fill, extra);
/** A filled shape whose corners are softened by a same-coloured round stroke. */
const soft = (d: string, fill: string, width: number): string => el('path', `d="${d}"`, fill, '', [fill, width]);
/** An open stroke (stems, antennae, smiles). */
const line = (d: string, color: string, width: number, extra = ''): string =>
  el('path', `d="${d}"`, 'none', extra, [color, width]);

const eyes = (x1: number, x2: number, y: number, r = 2): string => circle(x1, y, r, INK) + circle(x2, y, r, INK);
/** Pink cheeks; a stronger `o` keeps them pink on green or dark skin. */
const blush = (x1: number, x2: number, y: number, rx = 2.8, ry = 1.7, o = 0.6): string =>
  ellipse(x1, y, rx, ry, BLUSH, op(o)) + ellipse(x2, y, rx, ry, BLUSH, op(o));
const smile = (x: number, y: number, w = 2, h = 1.8): string =>
  line(`M${f(x - w)} ${f(y)} Q${f(x)} ${f(y + h)} ${f(x + w)} ${f(y)}`, INK, 1.4);
/** A soft cream shine on the lit side of a rounded shape. */
const shine = (cx: number, cy: number, rx: number, ry: number, a: number, o = 0.55): string =>
  ellipse(cx, cy, rx, ry, CREAM, rot(a, cx, cy) + op(o));

function badge(bg: string, ...parts: string[]): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="none">' +
    `<circle cx="32" cy="32" r="32" fill="${bg}" stroke="none"/>${parts.join('')}</svg>`
  );
}

/**
 * Ground or water filling the bottom of the badge below height y, following the
 * badge's edge; the top edge is a row of soft humps, or waves when `wavy` (use an
 * odd count so both ends rise).
 */
function band(y: number, amp: number, humps: number, fill: string, wavy = false): string {
  const half = Math.sqrt(32 * 32 - (y - 32) ** 2);
  const x0 = 32 - half;
  const step = (2 * half) / humps;
  let d = `M${f(x0)} ${f(y)}`;
  for (let k = 0; k < humps; k++) {
    const dy = wavy && k % 2 ? amp * 2 : -amp * 2;
    d += ` Q${f(x0 + step * (k + 0.5))} ${f(y + dy)} ${f(x0 + step * (k + 1))} ${f(y)}`;
  }
  return path(`${d} A32 32 0 0 1 ${f(x0)} ${f(y)} Z`, fill);
}

/** A pointed petal standing on (bx, by), `len` tall, tilted by `angle` degrees. */
function petal(bx: number, by: number, angle: number, len: number, w: number, fill: string): string {
  const d =
    `M${bx} ${by} C${f(bx - w)} ${f(by - len * 0.35)} ${f(bx - w * 0.55)} ${f(by - len * 0.8)} ${bx} ${f(by - len)} ` +
    `C${f(bx + w * 0.55)} ${f(by - len * 0.8)} ${f(bx + w)} ${f(by - len * 0.35)} ${bx} ${by} Z`;
  return path(d, fill, angle ? rot(angle, bx, by) : '');
}

/** Star outline: n points alternating between radii rOut and rIn, turned by `turn` radians. */
function star(cx: number, cy: number, rOut: number, rIn: number, n: number, turn: number): string {
  const pts: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = turn + (k * Math.PI) / n;
    const r = k % 2 ? rIn : rOut;
    pts.push(`${f(cx + Math.sin(a) * r)} ${f(cy - Math.cos(a) * r)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** n copies of an ellipse placed `dist` above (cx, cy), turned evenly around it. */
function ring(cx: number, cy: number, n: number, dist: number, rx: number, ry: number, turn: number, fill: string): string {
  let out = '';
  for (let k = 0; k < n; k++) out += ellipse(cx, cy - dist, rx, ry, fill, rot(turn + (k * 360) / n, cx, cy));
  return out;
}

function lotus(): string {
  return badge(
    '#DDF1FB',
    band(45, 1.4, 5, '#94D5F2', true),
    line('M12 52.5 Q15.5 51 19 52.5 M45 55 Q48.5 53.5 52 55', CREAM, 1.4, op(0.85)),
    ellipse(32, 47.6, 22, 5.8, '#7CC36B'),
    ellipse(32, 46.6, 22, 5.2, '#9ED68C'),
    petal(32, 45, -64, 24, 9.5, '#FF97BE'),
    petal(32, 45, 64, 24, 9.5, '#FF97BE'),
    petal(32, 45, -34, 29, 10.5, '#FFA6C4'),
    petal(32, 45, 34, 29, 10.5, '#FFA6C4'),
    petal(32, 45, 0, 33, 11.5, '#FFB2CC'),
    line('M32 35 Q31.2 25 32 17', CREAM, 1.3, op(0.7)),
    petal(32, 45.5, -16, 21.5, 9.5, '#FFC7D9'),
    petal(32, 45.5, 16, 21.5, 9.5, '#FFC7D9'),
  );
}

function sunflower(): string {
  return badge(
    '#EEE2FF',
    band(54, 1.6, 3, '#C4E8B5'),
    line('M32 40 V56', '#7CC36B', 3.6),
    path('M31.5 51.5 C26 45.5 19 46.5 16 49.5 C20 53.5 27 54.5 31.5 51.5 Z', '#9ED68C'),
    path('M32.5 48.5 C37 42.5 44 42.5 47 45.5 C44 50.5 37 51.5 32.5 48.5 Z', '#9ED68C'),
    ring(32, 28, 10, 13.5, 4.4, 8, 18, '#FFC83A'),
    ring(32, 28, 10, 12.5, 4.4, 7.5, 0, '#FFD56A'),
    circle(32.6, 28.6, 9.5, '#B57846'),
    circle(32, 28, 9, '#C88E5C'),
    circle(30, 25.2, 1.1, '#E8B57E'),
    circle(34.6, 25.4, 1.1, '#E8B57E'),
    circle(36.2, 29.6, 1.1, '#E8B57E'),
    circle(32.2, 31.8, 1.1, '#E8B57E'),
    circle(27.8, 29.8, 1.1, '#E8B57E'),
    circle(32.3, 28.3, 1.1, '#E8B57E'),
    shine(28.4, 24.2, 2.6, 1.5, -35, 0.5),
  );
}

function mushroom(): string {
  return badge(
    '#DDF3E4',
    rect(21, 30, 22, 25, 9, '#F8D7AE'),
    rect(21, 30, 20.6, 24, 9, CREAM),
    path('M9 34 C9 19 20 10 32 10 C44 10 55 19 55 34 C55 37 53 38.5 50 38.5 H14 C11 38.5 9 37 9 34 Z', '#F27A8C'),
    path('M9 33.5 C9 19 20 10 31.5 10 C42 10 52.5 18 53 32 C53 35 51.5 36.5 48.5 36.5 H14 C11 36.5 9 35.5 9 33.5 Z', '#FF8FA0'),
    circle(21, 24, 4, CREAM),
    circle(34.5, 16.5, 3.2, CREAM),
    circle(44.5, 27, 3, CREAM),
    circle(30, 29.5, 2, CREAM),
    band(52, 1.6, 3, '#C4E8B5'),
    eyes(27.3, 35.3, 43.5),
    smile(31.3, 46.4),
    blush(24.4, 38.2, 47),
  );
}

function ladybug(): string {
  return badge(
    '#FFF1C2',
    path('M6 46 C15 35 49 35 58 46 C49 57 15 57 6 46 Z', '#9ED68C'),
    line('M9 46 H55', '#7CC36B', 1.6),
    line('M28.5 9.5 Q25 5.5 21 7.5', INK, 1.9),
    line('M35.5 9.5 Q39 5.5 43 7.5', INK, 1.9),
    circle(21, 7.5, 2, INK),
    circle(43, 7.5, 2, INK),
    circle(32, 16, 9.5, INK),
    circle(28.3, 14.5, 2.6, CREAM),
    circle(35.7, 14.5, 2.6, CREAM),
    circle(28.6, 15, 1.4, INK),
    circle(36, 15, 1.4, INK),
    blush(25.4, 38.6, 19.4, 1.8, 1.1, 0.9),
    circle(32.7, 39.7, 18.3, '#EE6774'),
    circle(32, 39, 17.6, '#FF7F8A'),
    line('M32 22 V56.5', INK, 1.8),
    circle(24, 33, 3.4, INK),
    circle(40, 33, 3.4, INK),
    circle(23, 46, 2.8, INK),
    circle(41, 46, 2.8, INK),
    shine(24.5, 27.5, 3.4, 1.9, -35),
  );
}

function snail(): string {
  const body = '#FFD9B8';
  const bodyShade = '#F5BF95';
  return badge(
    '#EEE2FF',
    band(54, 1.6, 3, '#C4E8B5'),
    line('M42 24 L40 14', body, 2.4),
    line('M50 24 L52 14', body, 2.4),
    circle(40, 14, 2.5, body),
    circle(52, 14, 2.5, body),
    rect(8, 44, 46, 11, 5.5, bodyShade),
    rect(8, 44, 46, 9.6, 4.8, body),
    rect(38, 20, 16, 33, 8, bodyShade),
    rect(38, 20, 14.8, 33, 7.4, body),
    eyes(42.6, 49, 29, 1.8),
    smile(45.8, 33, 1.8, 1.6),
    blush(40.6, 51, 33, 1.8, 1.2),
    circle(25.6, 36.6, 15, '#FF97BE'),
    circle(25, 36, 14.3, '#FFB2CC'),
    line('M27 36 A2 2 0 0 0 23 36 A4 4 0 0 0 31 36 A6 6 0 0 0 19 36 A8 8 0 0 0 35 36', '#F084AC', 2.4),
    shine(18.5, 27.5, 3.4, 1.9, -40, 0.6),
  );
}

function frog(): string {
  const g = '#9ED68C';
  const gs = '#7CC36B';
  return badge(
    '#FFE3EE',
    ellipse(32, 56.5, 17, 3.2, '#F7C8D8'),
    ellipse(22.5, 55, 6, 3, gs),
    ellipse(41.5, 55, 6, 3, gs),
    ellipse(32.6, 46.6, 15.5, 10.5, gs),
    ellipse(32, 46, 15, 10, g),
    ellipse(32, 49, 9, 6, '#C4E8B5'),
    circle(20.6, 21.6, 8, gs),
    circle(44.6, 21.6, 8, gs),
    circle(20, 21, 7.6, g),
    circle(44, 21, 7.6, g),
    ellipse(32.6, 33.6, 21, 14.2, gs),
    ellipse(32, 33, 20.4, 13.6, g),
    circle(20, 21, 5.4, CREAM),
    circle(44, 21, 5.4, CREAM),
    circle(21, 22, 2.9, INK),
    circle(43, 22, 2.9, INK),
    circle(20.2, 21, 1, '#FFFFFF'),
    circle(42.2, 21, 1, '#FFFFFF'),
    line('M25 35.5 Q32 41 39 35.5', INK, 1.8),
    blush(17.5, 46.5, 36, 3, 1.9, 0.9),
  );
}

function hedgehog(): string {
  const face = '#FFE7C6';
  const faceShade = '#F8D7AE';
  return badge(
    '#DDF3E4',
    soft(star(32, 33, 26, 19.5, 13, 0.24), '#C88E5C', 2.2),
    soft(star(32, 33, 23.5, 17.5, 13, 0), '#DDA471', 2.2),
    circle(20, 27, 4.2, face),
    circle(44, 27, 4.2, face),
    circle(20, 27, 2.2, BLUSH),
    circle(44, 27, 2.2, BLUSH),
    ellipse(25.5, 52.8, 3.6, 2.4, '#E8B57E'),
    ellipse(38.5, 52.8, 3.6, 2.4, '#E8B57E'),
    ellipse(32.6, 39.2, 14, 12, faceShade),
    ellipse(32, 38.6, 13.4, 11.4, face),
    eyes(26.5, 37.5, 36.5),
    ellipse(32, 41.8, 2.6, 2, INK),
    line('M30 44.8 Q32 46.3 34 44.8', INK, 1.3),
    blush(22.5, 41.5, 41.5, 2.6, 1.6),
  );
}

function bee(): string {
  const wing = (cx: number, cy: number, a: number): string =>
    el('ellipse', `cx="${cx}" cy="${cy}" rx="7" ry="10.5"`, '#FFFFFF', rot(a, cx, cy) + op(0.95), ['#BFE3F5', 1.4]);
  return badge(
    '#FFE3EE',
    '<defs><clipPath id="av7-body">' + ellipse(32.3, 38.3, 18.8, 14.8, '#FFFFFF') + '</clipPath></defs>',
    wing(35, 19.5, -22),
    wing(45, 21, 26),
    el('path', 'd="M49.5 35.5 L57 38.5 L49.5 41.5 Z"', INK, '', [INK, 1.6]),
    ellipse(32.6, 38.6, 19, 15, '#FFC83A'),
    ellipse(32, 38, 18.4, 14.4, '#FFD56A'),
    '<g clip-path="url(#av7-body)">' +
      line('M37 22 Q34.5 38 37 54', INK, 5) +
      line('M46 24 Q44 38 46 52', INK, 4.6) +
      '</g>',
    shine(23.5, 29.5, 4, 2, -20, 0.6),
    line('M21 25.5 Q18 18 13.5 16.5', INK, 1.8),
    line('M26.5 24.5 Q26.5 16 30 12.5', INK, 1.8),
    circle(13.5, 16.5, 2, INK),
    circle(30, 12.5, 2, INK),
    eyes(20.5, 28.5, 37),
    smile(24.5, 41.2),
    blush(17.3, 31.7, 41.4, 2.4, 1.5),
  );
}

function duck(): string {
  const y = '#FFDB5C';
  const ys = '#F4C443';
  return badge(
    '#DDF1FB',
    path('M48 39 Q55 29.5 57.5 31.5 Q58.5 38.5 52 45 Z', ys),
    ellipse(35.6, 43.4, 19, 11.6, ys),
    ellipse(35, 42.6, 18.4, 11, y),
    circle(25.6, 25.6, 11, ys),
    circle(25, 25, 10.5, y),
    path('M30 40.5 Q38 34 48.5 38.5 Q47 47.5 37 47.5 Q30.5 47 30 40.5 Z', ys),
    path('M16 23 Q7 23 7.5 26.8 Q8 30.5 16.5 29.5 Z', '#FFA95C'),
    circle(22.5, 22.5, 2, INK),
    circle(21.9, 21.8, 0.7, '#FFFFFF'),
    ellipse(26.5, 28.2, 2.6, 1.6, BLUSH, op(0.6)),
    shine(28.5, 18.5, 3, 1.8, 30, 0.5),
    band(49, 1.3, 5, '#94D5F2', true),
    line('M14 55 Q17.5 53.5 21 55 M40 57.5 Q43.5 56 47 57.5', CREAM, 1.4, op(0.85)),
  );
}

function rabbit(): string {
  const fur = '#FFFFFF';
  const shade = '#EEDCE4';
  const ear = (x: number, a: number): string =>
    ellipse(x + 0.6, 17.6, 5.8, 12.6, shade, rot(a, x + 0.6, 17.6)) +
    ellipse(x, 17, 5.4, 12.2, fur, rot(a, x, 17)) +
    ellipse(x + (a < 0 ? 0.2 : -0.2), 18.4, 2.7, 8.4, BLUSH, rot(a, x, 18.4));
  return badge(
    '#FDE7D3',
    ear(24.6, -12),
    ear(39.4, 12),
    ellipse(32.7, 39.7, 17, 15, shade),
    ellipse(32, 39, 16.4, 14.4, fur),
    eyes(26, 38, 38, 2.1),
    circle(25.4, 37.3, 0.7, '#FFFFFF'),
    circle(37.4, 37.3, 0.7, '#FFFFFF'),
    path('M30.2 41.8 Q32 41 33.8 41.8 Q33.6 43.5 32 44.1 Q30.4 43.5 30.2 41.8 Z', '#FF97BE'),
    line('M32 44.1 V45.4 M29.6 45.8 Q30.8 47.2 32 45.4 Q33.2 47.2 34.4 45.8', INK, 1.3),
    blush(22, 42, 44, 3, 1.9),
  );
}

function butterfly(): string {
  const body = '#7A6386';
  const wing = (cx: number, cy: number, rx: number, ry: number, a: number, shade: string, fill: string): string =>
    ellipse(cx + 0.7, cy + 0.7, rx, ry, shade, rot(a, cx + 0.7, cy + 0.7)) + ellipse(cx, cy, rx, ry, fill, rot(a, cx, cy));
  return badge(
    '#FFF1C2',
    wing(20.5, 22.5, 13, 10, 32, '#A080E0', '#B89AF0'),
    wing(43.5, 22.5, 13, 10, -32, '#A080E0', '#B89AF0'),
    wing(23.5, 40.5, 9.5, 8, -35, '#FF97BE', '#FFB2CC'),
    wing(40.5, 40.5, 9.5, 8, 35, '#FF97BE', '#FFB2CC'),
    circle(16, 19.5, 3.4, CREAM),
    circle(48, 19.5, 3.4, CREAM),
    circle(24.5, 26, 1.7, CREAM),
    circle(39.5, 26, 1.7, CREAM),
    circle(21.5, 42, 2.3, CREAM),
    circle(42.5, 42, 2.3, CREAM),
    line('M30.5 18 Q28 11 23.5 9.5', body, 1.7),
    line('M33.5 18 Q36 11 40.5 9.5', body, 1.7),
    circle(23.5, 9.5, 1.9, body),
    circle(40.5, 9.5, 1.9, body),
    ellipse(32, 36.5, 3.8, 12.5, body),
    circle(32, 21.5, 5.6, body),
    circle(30, 21.3, 1.1, CREAM),
    circle(34, 21.3, 1.1, CREAM),
    line('M30.8 23.8 Q32 24.9 33.2 23.8', CREAM, 1),
  );
}

function cactus(): string {
  const g = '#9ED68C';
  const gs = '#7CC36B';
  let petals = '';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    petals += circle(32 + Math.cos(a) * 3.4, 12.5 + Math.sin(a) * 3.4, 3, '#FF97BE');
  }
  return badge(
    '#FDE7D3',
    line('M26 37.6 H20.6 Q18.1 37.6 18.1 35.1 V28.6', gs, 6.6),
    line('M26 37 H20 Q17.5 37 17.5 34.5 V28', g, 6.2),
    line('M38.6 31.6 H44.6 Q47.1 31.6 47.1 29.1 V22.6', gs, 6.6),
    line('M38 31 H44 Q46.5 31 46.5 28.5 V22', g, 6.2),
    rect(23.3, 14.6, 18.6, 36, 9.3, gs),
    rect(22.7, 14, 18.6, 36, 9.3, g),
    circle(26.2, 21, 0.9, CREAM),
    circle(37.6, 19.6, 0.9, CREAM),
    circle(25.8, 42.5, 0.9, CREAM),
    circle(38, 41, 0.9, CREAM),
    circle(16.6, 31, 0.9, CREAM),
    circle(46.6, 25, 0.9, CREAM),
    eyes(28, 36, 31, 1.9),
    smile(32, 34.6),
    blush(25.4, 38.6, 35, 2.2, 1.4, 0.9),
    petals,
    circle(32, 12.5, 2.2, '#FFD56A'),
    path('M19.5 51 H44.5 L42.2 58.6 Q41.6 60.6 39.6 60.6 H24.4 Q22.4 60.6 21.8 58.6 Z', '#94D5F2'),
    path('M38.5 51 H44.5 L42.2 58.6 Q41.6 60.6 39.6 60.6 H37 Z', '#80CCEF'),
    rect(16.5, 46.1, 32, 7, 3.5, '#80CCEF'),
    rect(16, 45.5, 32, 6.6, 3.3, '#B4E2F7'),
  );
}

export const AVATARS: Avatar[] = [
  { id: 0, key: 'lotus', svg: lotus() },
  { id: 1, key: 'sunflower', svg: sunflower() },
  { id: 2, key: 'mushroom', svg: mushroom() },
  { id: 3, key: 'ladybug', svg: ladybug() },
  { id: 4, key: 'snail', svg: snail() },
  { id: 5, key: 'frog', svg: frog() },
  { id: 6, key: 'hedgehog', svg: hedgehog() },
  { id: 7, key: 'bee', svg: bee() },
  { id: 8, key: 'duck', svg: duck() },
  { id: 9, key: 'rabbit', svg: rabbit() },
  { id: 10, key: 'butterfly', svg: butterfly() },
  { id: 11, key: 'cactus', svg: cactus() },
];

/** Name of an avatar in the current language. */
export function avatarName(a: Avatar): string {
  return t(`avatar.${a.key}`);
}

/** The SVG of an avatar; unknown ids fall back to the first one. */
export function avatarSvg(id: number): string {
  return (AVATARS.find((a) => a.id === id) ?? AVATARS[0]).svg;
}
