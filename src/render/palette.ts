/**
 * Colours of the current garden style. `P` is mutable: switching style copies
 * the theme's palette into it, and every drawing function reads `P` at draw time.
 */
export interface Palette {
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  /** Soft background blobs, as 'r,g,b'. */
  bokeh: string[];

  bed: string;
  bedShadow: string;
  tileShadow: string;
  /** Joined-edge (hard) levels: lilac tray, dotted edge, mist over the ghost strips. */
  hardBed: string;
  hardEdge: string;
  hardMist: string;

  soil: string;
  soilLight: string;
  soilDark: string;
  soilSide: string;
  soilSideDark: string;
  pebble: string;
  pebbleShade: string;

  grass: string;
  grassLight: string;
  grassDark: string;
  grassDeep: string;
  grassSide: string;
  grassSideDark: string;

  rim: string;
  rimShade: string;
  groove: string;
  grooveDeep: string;

  water: string;
  waterDeep: string;
  waterLight: string;

  loop: string;

  petals: string[];
  centers: string[];
  lotus: string[];
  lily: string;
  lilyDark: string;

  lockRing: string;
  lockBadge: string;
  lockIcon: string;

  ink: string;
}

/** The original pastel spring garden. Other styles start from it. */
export const SPRING: Palette = {
  bgTop: '#FFD6E5',
  bgMid: '#FFF0DA',
  bgBottom: '#C9EED6',
  bokeh: ['255,160,196', '255,214,110', '140,200,255', '150,226,170', '196,168,250'],

  bed: 'rgba(255, 255, 255, 0.72)',
  bedShadow: 'rgba(214, 120, 160, 0.3)',
  tileShadow: 'rgba(170, 90, 125, 0.4)',
  hardBed: 'rgba(238, 226, 255, 0.85)',
  hardEdge: '#A47EE6',
  hardMist: 'rgba(238, 226, 255, 0.95)',

  soil: '#F8D7AE',
  soilLight: '#FFE7C6',
  soilDark: '#EDC08E',
  soilSide: '#E9B47E',
  soilSideDark: '#DCA06A',
  pebble: '#FFF6EA',
  pebbleShade: '#E4B98A',

  grass: '#A3DF8C',
  grassLight: '#C4EEA9',
  grassDark: '#86CF72',
  grassDeep: '#5FB45B',
  grassSide: '#78C266',
  grassSideDark: '#62AE55',

  rim: '#FFFAF2',
  rimShade: '#DDAA76',
  groove: '#E8B57C',
  grooveDeep: '#D79C5E',

  water: '#6ECDF7',
  waterDeep: '#3FAFE9',
  waterLight: '#DDF6FF',

  loop: '#FF6F98',

  petals: ['#FF8FB6', '#FFB1CB', '#FFD45A', '#FFFFFF', '#C4A4F8', '#8DC8FF', '#FFA877'],
  centers: ['#FFC83A', '#FFE07A', '#FF8DAF', '#FFFFFF'],
  lotus: ['#FF97BE', '#FFBCD3', '#FFFFFF', '#D2B5FF', '#FFD86A'],
  lily: '#84CF7B',
  lilyDark: '#63B65F',

  lockRing: '#A47EE6',
  lockBadge: '#FFFFFF',
  lockIcon: '#8A5CD8',

  ink: '#7A6386',
};

export const P: Palette = { ...SPRING };

type GrassShades = Pick<Palette, 'grass' | 'grassLight' | 'grassDark' | 'grassDeep' | 'grassSide' | 'grassSideDark'>;

/**
 * The six grass shades of a style from one base colour (hue in degrees,
 * saturation and lightness in 0..1), with the same relations as in spring.
 */
export function grassFrom(h: number, s: number, l: number): GrassShades {
  const c = (dh: number, ks: number, dl: number) => hslHex(h + dh, s * ks, l + dl);
  return {
    grass: c(0, 1, 0),
    grassLight: c(-7, 1.19, 0.086),
    grassDark: c(4, 0.87, -0.083),
    grassDeep: c(14, 0.65, -0.18),
    grassSide: c(5, 0.76, -0.13),
    grassSideDark: c(8, 0.63, -0.2),
  };
}

function hslHex(h: number, s: number, l: number): string {
  const sat = Math.min(1, Math.max(0, s));
  const lum = Math.min(0.97, Math.max(0.05, l));
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = lum - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function applyPalette(palette: Palette): void {
  Object.assign(P, palette);
}

export function mixColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
