/**
 * The home screen's title written with a canal: the word, slightly arched, is
 * carved into a strip of garden. Water runs through the letters from left to
 * right; the grass spreads over the dry soil behind it, then flowers open.
 * Colours come from the style (the --logo-* properties set by the game).
 */
import { Rng } from '../core/rng';

const NS = 'http://www.w3.org/2000/svg';
const W = 600;
const H = 200;
const FONT = 96;
/** The arc the word follows: a quadratic curve, its middle 40 units above its ends. */
const ARC: [number, number, number, number, number, number] = [40, 158, 300, 78, 560, 158];
/** Seconds the water takes to run through the word. */
const FLOW = 2.2;
const FLOW_DELAY = 0.35;

function point(t: number): [number, number, number, number] {
  const [x0, y0, cx, cy, x1, y1] = ARC;
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
  const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
  // Tangent, then the normal pointing up (away from the arc's centre).
  const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
  const l = Math.hypot(dx, dy);
  return [x, y, dy / l, -dx / l];
}

/** When the water passes over x, in seconds from the start. */
const reach = (x: number) => FLOW_DELAY + (FLOW * (x - ARC[0])) / (ARC[4] - ARC[0]);

function flowerMarkup(x: number, y: number, r: number, petal: string, delay: number, turn: number): string {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="0" cy="${(-r * 0.62).toFixed(1)}" rx="${(r * 0.42).toFixed(1)}" ry="${(r * 0.62).toFixed(1)}" transform="rotate(${a})"/>`)
    .join('');
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${turn.toFixed(0)})"><g class="t-flower" style="--d:${delay.toFixed(2)}s"><g fill="${petal}">${petals}</g><circle r="${(r * 0.36).toFixed(1)}" class="t-heart"/></g></g>`;
}

/** The title as an SVG element (built once; `play()` waters it again). */
export function canalTitle(word: string): SVGSVGElement {
  const rng = new Rng('titre');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'logo-canal');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-hidden', 'true');
  const [x0, y0, cx, cy, x1, y1] = ARC;
  const arc = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;

  // The strip of garden: a thick band along the arc, lifted to the letters'
  // middle; the grass spreads over its soil through a mask of growing patches.
  const lift = FONT * 0.3;
  const band: string[] = [];
  for (let k = 0; k <= 24; k++) {
    const [x, y, nx, ny] = point(k / 24);
    band.push(`${k ? 'L' : 'M'}${(x + nx * lift).toFixed(1)} ${(y + ny * lift).toFixed(1)}`);
  }
  const strip = band.join(' ');
  const patches: string[] = [];
  for (let k = 0; k <= 30; k++) {
    const [x, y, nx, ny] = point(k / 30);
    const bx = x + nx * lift + rng.float(-10, 10);
    const by = y + ny * lift + rng.float(-14, 14);
    const r = FONT * rng.float(0.5, 0.75);
    patches.push(
      `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" class="t-patch" style="--d:${(reach(bx) + 0.15).toFixed(2)}s;transform-origin:${bx.toFixed(1)}px ${by.toFixed(1)}px"/>`,
    );
  }
  // Flowers on the edges of the strip, above and below the word.
  const flowers: string[] = [];
  const colours = ['#FF7FA8', '#FFD45A', '#FFFFFF', '#C4A4F8', '#FFA877', '#8DC8FF'];
  for (let k = 0; k < 16; k++) {
    const t = 0.03 + (k / 15) * 0.94 + rng.float(-0.02, 0.02);
    const [x, y, nx, ny] = point(t);
    const up = k % 2 === 0;
    const off = up ? FONT * rng.float(0.76, 0.86) : -FONT * rng.float(0.2, 0.28);
    const fx = x + nx * off;
    const fy = y + ny * off;
    flowers.push(flowerMarkup(fx, fy, rng.float(8, 12), colours[k % colours.length], reach(fx) + 0.55, rng.float(0, 72)));
  }

  const text = (cls: string) =>
    `<text class="${cls}" font-size="${FONT}"><textPath href="#t-arc" startOffset="50%" text-anchor="middle">${word}</textPath></text>`;
  svg.innerHTML = `
    <defs>
      <path id="t-arc" d="${arc}"/>
      <mask id="t-meadow" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}">${patches.join('')}</mask>
      <mask id="t-flow" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
        <rect class="t-sweep" x="${x0 - 30}" y="0" width="${x1 - x0 + 60}" height="${H}" fill="#fff"/>
      </mask>
    </defs>
    <path class="t-side" d="${strip}" transform="translate(0 9)"/>
    <path class="t-soil" d="${strip}"/>
    <path class="t-grass" d="${strip}" mask="url(#t-meadow)"/>
    ${text('t-bank')}
    ${text('t-groove')}
    <g mask="url(#t-flow)">${text('t-water')}${text('t-shine')}</g>
    <g class="t-flowers">${flowers.join('')}</g>`;
  return svg;
}

/** Water the title again (on each return to the home screen). */
export function playTitle(svg: Element) {
  svg.classList.remove('play');
  (svg as SVGSVGElement).getBoundingClientRect();
  svg.classList.add('play');
}

export const TITLE_FLOW = { delay: FLOW_DELAY, flow: FLOW };
