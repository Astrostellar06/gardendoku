/** Pastel garden palette: soft, but saturated enough to read clearly. */
export const P = {
  bgTop: '#FFD6E5',
  bgMid: '#FFF0DA',
  bgBottom: '#C9EED6',

  bed: 'rgba(255, 255, 255, 0.72)',
  bedShadow: 'rgba(214, 120, 160, 0.3)',
  tileShadow: 'rgba(170, 90, 125, 0.4)',

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
} as const;

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
