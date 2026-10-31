/**
 * Draws the app icon: a watering can on a garden lawn, in bright colours that
 * stand out on a home screen. Writes the sources used by `npm run icons`
 * (assets/icon-only.png, icon-foreground.png, icon-background.png) and the
 * web icon (public/icon.svg).
 *
 *   node scripts/make-icon.mjs && npm run icons
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const S = 1024;

/** Five-petal flower centred on (x, y). */
function flower(x, y, r, petal, heart = '#FFD23F', turn = 0) {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="0" cy="${-r * 0.62}" rx="${r * 0.42}" ry="${r * 0.62}" transform="rotate(${a})" />`)
    .join('');
  return `<g transform="translate(${x} ${y}) rotate(${turn})" fill="${petal}">${petals}<circle r="${r * 0.36}" fill="${heart}" /></g>`;
}

/** Tuft of grass standing on (x, y). */
function tuft(x, y, s, color = '#1E9A47') {
  return `<path transform="translate(${x} ${y}) scale(${s})" fill="${color}" d="M-22 0 C-24 -30 -30 -52 -40 -70 C-18 -56 -10 -34 -6 -12 C-6 -44 -2 -70 6 -92 C12 -66 12 -40 8 -12 C14 -34 26 -52 44 -62 C32 -42 24 -22 22 0 Z" />`;
}

/** The lawn, with a winding canal and flowers: the adaptive icon's background. */
const background = `
  <defs>
    <linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9BEA6A" />
      <stop offset="1" stop-color="#2FB24F" />
    </linearGradient>
    <radialGradient id="sun" cx="0.28" cy="0.2" r="0.6">
      <stop offset="0" stop-color="#FFFBD0" stop-opacity="0.75" />
      <stop offset="1" stop-color="#FFFBD0" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#lawn)" />
  <rect width="${S}" height="${S}" fill="url(#sun)" />
  <path d="M-40 860 C 200 700, 420 980, 640 830 S 980 700, 1080 760" fill="none" stroke="#FFF4DA" stroke-width="150" stroke-linecap="round" />
  <path d="M-40 860 C 200 700, 420 980, 640 830 S 980 700, 1080 760" fill="none" stroke="#2AA9F0" stroke-width="96" stroke-linecap="round" />
  <path d="M-40 860 C 200 700, 420 980, 640 830 S 980 700, 1080 760" fill="none" stroke="#9EE3FF" stroke-width="14" stroke-linecap="round" stroke-dasharray="40 70" transform="translate(0 -14)" />
  ${tuft(120, 380, 1.3)}${tuft(905, 330, 1.2)}${tuft(210, 650, 1)}${tuft(840, 640, 1.1)}${tuft(470, 150, 0.9, '#2AA352')}
  ${flower(150, 170, 46, '#FF5C9A', '#FFD23F', 10)}
  ${flower(880, 150, 40, '#FFC21A', '#FF7A3D', -12)}
  ${flower(90, 540, 34, '#FFFFFF', '#FFD23F', 20)}
  ${flower(950, 480, 42, '#B278FF', '#FFE45C', 5)}
  ${flower(300, 250, 26, '#FFFFFF', '#FFB13D')}
  ${flower(760, 260, 28, '#FF5C9A', '#FFE45C', 30)}
  ${flower(110, 980, 40, '#FFC21A', '#FF7A3D')}
  ${flower(930, 960, 36, '#FF5C9A', '#FFE45C', 15)}
`;

/** The watering can, pouring, kept within the adaptive icon's safe circle. */
const foreground = `
  <defs>
    <linearGradient id="can" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6FD0FF" />
      <stop offset="0.55" stop-color="#2E9DF5" />
      <stop offset="1" stop-color="#1A6FD6" />
    </linearGradient>
  </defs>
  <ellipse cx="470" cy="760" rx="220" ry="40" fill="#0B5A26" opacity="0.28" />
  <g transform="translate(482 520) rotate(10) scale(0.92) translate(-512 -520)">
    <path d="M405 420 C 400 255, 625 255, 622 420" fill="none" stroke="#1A6FD6" stroke-width="44" stroke-linecap="round" />
    <path d="M640 640 L 812 430" stroke="#2E9DF5" stroke-width="58" stroke-linecap="round" />
    <path d="M640 640 L 812 430" stroke="#6FD0FF" stroke-width="14" stroke-linecap="round" transform="translate(-14 -10)" />
    <ellipse cx="832" cy="404" rx="58" ry="40" transform="rotate(-50 832 404)" fill="#1A6FD6" />
    <ellipse cx="842" cy="392" rx="40" ry="24" transform="rotate(-50 842 392)" fill="#5BC4FF" />
    <path d="M330 430 H 690 L 670 700 C 667 735, 640 760, 604 760 H 416 C 380 760, 353 735, 350 700 Z" fill="url(#can)" />
    <ellipse cx="510" cy="430" rx="182" ry="36" fill="#1A6FD6" />
    <ellipse cx="510" cy="426" rx="150" ry="22" fill="#0F5BB8" />
    <rect x="372" y="470" width="42" height="220" rx="21" fill="#FFFFFF" opacity="0.5" />
    ${flower(530, 600, 66, '#FFFFFF', '#FFD23F')}
  </g>
  <g fill="#3FB8FF" stroke="#FFFFFF" stroke-width="6">
    <path d="M832 520 c 18 24 28 40 28 54 a 28 28 0 0 1 -56 0 c 0 -14 10 -30 28 -54 Z" />
    <path d="M770 560 c 13 18 20 30 20 40 a 20 20 0 0 1 -40 0 c 0 -10 7 -22 20 -40 Z" />
    <path d="M818 620 c 11 15 17 25 17 33 a 17 17 0 0 1 -34 0 c 0 -8 6 -18 17 -33 Z" />
  </g>
`;

const svg = (body, rounded = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${
    rounded ? `<clipPath id="r"><rect width="${S}" height="${S}" rx="224" /></clipPath><g clip-path="url(#r)">${body}</g>` : body
  }</svg>`;

const png = (text, file) => sharp(Buffer.from(text)).png().toFile(file);

await png(svg(background + foreground), 'assets/icon-only.png');
await png(svg(foreground), 'assets/icon-foreground.png');
await png(svg(background), 'assets/icon-background.png');
writeFileSync('public/icon.svg', svg(background + foreground, true) + '\n');
console.log('icon written');
