/**
 * Materials of the 3D garden. Colours come from the current style's palette
 * (shared uniforms, updated when the style changes); what changes per tile
 * (growth of the grass, water filling the canal) are per-tile uniforms.
 */
import * as THREE from 'three';
import { P } from '../render/palette';

type U<T> = { value: T };

/** Colour from '#RRGGBB', 'rgb()' or 'rgba()' (the alpha is dropped). */
export function color(css: string): THREE.Color {
  const m = css.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (m) return new THREE.Color().setRGB(+m[1] / 255, +m[2] / 255, +m[3] / 255, THREE.SRGBColorSpace);
  return new THREE.Color(css);
}

/** The palette as uniforms, shared by every material. */
export const PAL = {
  uSoil: { value: new THREE.Color() },
  uSoilDark: { value: new THREE.Color() },
  uGrass: { value: new THREE.Color() },
  uGrassDark: { value: new THREE.Color() },
  uGrassLight: { value: new THREE.Color() },
  uWater: { value: new THREE.Color() },
  uWaterDeep: { value: new THREE.Color() },
  uWaterLight: { value: new THREE.Color() },
  uLoopColor: { value: new THREE.Color() },
  uTime: { value: 0 },
};

export function updatePalette() {
  PAL.uSoil.value.copy(color(P.soil));
  PAL.uSoilDark.value.copy(color(P.soilDark));
  PAL.uGrass.value.copy(color(P.grass));
  PAL.uGrassDark.value.copy(color(P.grassDark));
  PAL.uGrassLight.value.copy(color(P.grassLight));
  PAL.uWater.value.copy(color(P.water));
  PAL.uWaterDeep.value.copy(color(P.waterDeep));
  PAL.uWaterLight.value.copy(color(P.waterLight));
  PAL.uLoopColor.value.copy(color(P.loop));
}

/** What changes per tile, shared by its materials (and by its ghost copy). */
export interface TileUniforms {
  uBloom: U<number>;
  uWater: U<number>;
  uFill: U<number>;
  /** Side the water comes in through, in the tile's frame (x, z), and 1 when it comes in at all. */
  uIn: U<THREE.Vector3>;
  uLoop: U<number>;
  uSeed: U<number>;
  uBlob: U<THREE.Vector4[]>;
  uSpan: U<number[]>;
  uMask: U<number>;
  uDirs: U<THREE.Vector2[]>;
}

export function tileUniforms(): TileUniforms {
  return {
    uBloom: { value: 0 },
    uWater: { value: 0 },
    uFill: { value: 0 },
    uIn: { value: new THREE.Vector3() },
    uLoop: { value: 0 },
    uSeed: { value: 0 },
    uBlob: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 2)) },
    uSpan: { value: [1, 1, 1, 1, 1, 1] },
    uMask: { value: 0 },
    uDirs: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
  };
}

const NOISE = /* glsl */ `
float g3Hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float g3Noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(g3Hash(i), g3Hash(i + vec2(1.0, 0.0)), u.x), mix(g3Hash(i + vec2(0.0, 1.0)), g3Hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

interface Options {
  transparent?: boolean;
  opacity?: number;
  clipping?: THREE.Plane[];
}

function common(m: THREE.Material, o: Options) {
  if (o.transparent) {
    m.transparent = true;
    m.opacity = o.opacity ?? 0.5;
    m.depthWrite = false;
  }
  if (o.clipping) m.clippingPlanes = o.clipping;
}

/** Turf: soil until the grass spreads from its patches, as the tile drinks. */
export function turfMaterial(u: TileUniforms, o: Options = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  common(m, o);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, PAL, { uBloom: u.uBloom, uSeed: u.uSeed, uBlob: u.uBlob, uSpan: u.uSpan });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vLocal;
uniform vec3 uSoil, uSoilDark, uGrass, uGrassDark, uGrassLight;
uniform float uBloom, uSeed;
uniform vec4 uBlob[6];
uniform float uSpan[6];
${NOISE}`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec2 q = vLocal.xz;
float g = 0.0;
for (int k = 0; k < 6; k++) {
  vec4 b = uBlob[k];
  float t = clamp((uBloom - b.w) / uSpan[k], 0.0, 1.0);
  float r = b.z * (1.0 - pow(1.0 - t, 3.0));
  g = max(g, 1.0 - smoothstep(r - 0.03, r, length(q - b.xy)));
}
float n = g3Noise(q * 11.0 + uSeed) * 0.6 + g3Noise(q * 27.0 - uSeed) * 0.4;
vec3 soil = mix(uSoilDark, uSoil, 0.45 + 0.55 * n);
vec3 grass = mix(uGrassDark, uGrass, 0.35 + 0.65 * n);
grass = mix(grass, uGrassLight, smoothstep(0.05, 0.09, vLocal.y) * 0.25);
vec4 diffuseColor = vec4(mix(soil, grass, g), opacity);`,
      );
  };
  m.customProgramCacheKey = () => 'g3-turf';
  return m;
}

const GROW = /* glsl */ `
attribute vec3 aAnchor;
attribute vec2 aGrow;
attribute vec4 aMove0;
attribute vec4 aMove1;
attribute vec2 aMove2;
uniform float uBloom, uWater, uTime;
/** Angle of a moving part: turning steadily, or swinging to and fro. */
float g3Angle() {
  return uTime * aMove0.w + aMove2.x * sin(uTime * aMove2.y + aMove0.x * 13.0 + aMove0.z * 7.0);
}
/** Turn v about the unit axis k by angle a (Rodrigues). */
vec3 g3Turn(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
float g3Back(float t) {
  float c1 = 1.70158;
  float c3 = c1 + 1.0;
  return 1.0 + c3 * pow(t - 1.0, 3.0) + c1 * pow(t - 1.0, 2.0);
}
`;

const GROW_VERTEX = /* glsl */ `
vec3 transformed = vec3(position);
// Moving parts: windmill sails turn, swimmers and flyers bob.
if (aMove0.w != 0.0 || aMove2.x != 0.0) transformed = aMove0.xyz + g3Turn(transformed - aMove0.xyz, aMove1.xyz, g3Angle());
if (aMove1.w != 0.0) transformed.y += aMove1.w * sin(uTime * 2.3 + aMove0.x * 17.0 + aMove0.z * 11.0);
float k = 1.0;
if (aGrow.y < 0.5 || aGrow.y > 2.5) k = g3Back(clamp((uBloom - aGrow.x) / 0.35, 0.0, 1.0));
else if (aGrow.y > 1.5 && aGrow.y < 2.5) k = g3Back(clamp((uWater - 0.5) / 0.5, 0.0, 1.0) * clamp((uBloom - aGrow.x * 0.5) / 0.3, 0.0, 1.0));
transformed = aAnchor + (transformed - aAnchor) * k;
// Plants sway a little in the breeze.
if (aGrow.y < 0.5) transformed.x += sin(uTime * 1.6 + aAnchor.x * 7.0 + aAnchor.z * 5.0) * 0.08 * max(0.0, transformed.y - aAnchor.y);
`;

function growPatch(shader: THREE.WebGLProgramParametersWithUniforms, u: TileUniforms) {
  Object.assign(shader.uniforms, { uBloom: u.uBloom, uWater: u.uWater, uTime: PAL.uTime });
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${GROW}`)
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nif (aMove0.w != 0.0 || aMove2.x != 0.0) objectNormal = g3Turn(objectNormal, aMove1.xyz, g3Angle());')
    .replace('#include <begin_vertex>', GROW_VERTEX);
}

/** Plants and pebbles of a tile (vertex colours), sprouting with the water. */
export function partsMaterial(u: TileUniforms, o: Options = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 });
  common(m, o);
  m.onBeforeCompile = (shader) => growPatch(shader, u);
  m.customProgramCacheKey = () => 'g3-parts';
  return m;
}

/** Shadow of the plants: they have to grow in it too. */
export function partsDepthMaterial(u: TileUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => growPatch(shader, u);
  m.customProgramCacheKey = () => 'g3-parts-depth';
  return m;
}

/**
 * Water in a canal: it runs in from the side the tile drinks through, then
 * on into the other arms; glints drift downstream.
 */
export function waterMaterial(u: TileUniforms, o: Options = {}): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...PAL, uFill: u.uFill, uIn: u.uIn, uLoop: u.uLoop, uMask: u.uMask, uDirs: u.uDirs, uOpacity: { value: o.opacity ?? 1 } },
    vertexShader: /* glsl */ `
#include <common>
#include <clipping_planes_pars_vertex>
varying vec2 vLocal;
void main() {
  vLocal = position.xz;
  vec3 transformed = position;
  #include <project_vertex>
  #include <clipping_planes_vertex>
}`,
    fragmentShader: /* glsl */ `
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uWater, uWaterDeep, uWaterLight, uLoopColor;
uniform float uFill, uLoop, uMask, uTime, uOpacity;
uniform vec3 uIn;
uniform vec2 uDirs[6];
varying vec2 vLocal;
void main() {
  #include <clipping_planes_fragment>
  float h0 = 0.45;
  // Distance run by the water to get here: in through the inflow arm, then out along the others.
  float s = length(vLocal) * 2.0;
  if (uIn.z > 0.5) {
    float a = dot(vLocal, uIn.xy);
    float c = vLocal.x * uIn.y - vLocal.y * uIn.x;
    s = a > abs(c) ? h0 - a : h0 + length(vLocal);
  }
  // Offset from the centre line of the nearest arm.
  float lat = length(vLocal);
  for (int d = 0; d < 6; d++) {
    if (mod(floor(uMask / pow(2.0, float(d))), 2.0) < 0.5) continue;
    vec2 u = uDirs[d];
    float c = vLocal.x * u.y - vLocal.y * u.x;
    if (dot(vLocal, u) > 0.0 && abs(c) < abs(lat)) lat = c;
  }
  float reach = uFill;
  if (s >= reach) discard;
  vec3 col = mix(uWater, uWaterDeep, smoothstep(0.03, 0.12, abs(lat)) * 0.8);
  float flow = s * 6.0 - uTime * 1.3;
  float g1 = exp(-pow((lat - 0.03) / 0.012, 2.0)) * smoothstep(0.55, 0.95, sin(flow * 6.2832 + 1.0));
  float g2 = exp(-pow((lat + 0.028) / 0.01, 2.0)) * smoothstep(0.6, 0.98, sin(flow * 4.7 + 2.3));
  col = mix(col, uWaterLight, clamp(g1 * 0.85 + g2 * 0.6, 0.0, 1.0));
  // The leading edge of the water is light and frothy.
  col = mix(col, uWaterLight, smoothstep(0.05, 0.0, reach - s) * step(uFill, 0.999) * 0.7);
  col = mix(col, uLoopColor, uLoop * 0.75);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`,
    clipping: true,
    side: THREE.DoubleSide,
  });
  if (o.transparent) {
    m.transparent = true;
    m.depthWrite = false;
  }
  if (o.clipping) m.clippingPlanes = o.clipping;
  return m;
}

/** Plain lit material in one of the palette's colours. */
export function solid(css: string, o: Options & { roughness?: number } = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: color(css), roughness: o.roughness ?? 0.85, metalness: 0 });
  common(m, o);
  return m;
}
