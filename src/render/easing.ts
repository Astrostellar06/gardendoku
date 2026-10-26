export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

export function easeOutBack(t: number, s = 1.9): number {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

/** Progress of a sub-animation that runs from `start` to `start + span` inside a 0..1 timeline. */
export const sub = (t: number, start: number, span: number): number => clamp01((t - start) / span);
