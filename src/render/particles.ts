/** Light-weight particles: drifting petals, celebration bursts, sparkles and butterflies. */
import { P } from './palette';

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  phase: number;
  life: number;
  maxLife: number;
  gravity: number;
  ambient: boolean;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
}

interface Butterfly {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  phase: number;
  color: string;
  size: number;
  life: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export class Particles {
  private petals: Petal[] = [];
  private sparkles: Sparkle[] = [];
  private butterflies: Butterfly[] = [];
  private width = 1;
  private height = 1;

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const want = Math.round(Math.min(16, (width * height) / 30000));
    const ambient = this.petals.filter((p) => p.ambient);
    for (let k = ambient.length; k < want; k++) this.petals.push(this.makeAmbient(true));
  }

  private makeAmbient(anywhere: boolean): Petal {
    return {
      x: rand(-20, this.width + 20),
      y: anywhere ? rand(0, this.height) : -20,
      vx: rand(4, 14),
      vy: rand(10, 22),
      rot: rand(0, Math.PI * 2),
      vr: rand(-1, 1),
      size: rand(4, 7),
      color: pick(['#FFC4D6', '#FFD9E4', '#FFF0B8', '#FFFFFF']),
      phase: rand(0, 10),
      life: 0,
      maxLife: Infinity,
      gravity: 0,
      ambient: true,
    };
  }

  burst(x: number, y: number, count: number, spread = 1) {
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(30, 120) * spread;
      this.petals.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60 * spread,
        rot: rand(0, Math.PI * 2),
        vr: rand(-6, 6),
        size: rand(3.5, 6.5),
        color: pick(P.petals),
        phase: rand(0, 10),
        life: 0,
        maxLife: rand(1.2, 2.2),
        gravity: 90,
        ambient: false,
      });
    }
  }

  sparkle(x: number, y: number, count: number, radius: number) {
    for (let k = 0; k < count; k++) {
      this.sparkles.push({
        x: x + rand(-radius, radius),
        y: y + rand(-radius, radius),
        size: rand(3, 7),
        life: -rand(0, 0.4),
        maxLife: rand(0.6, 1.1),
      });
    }
  }

  butterfly(fromX: number, fromY: number, bounds: { x: number; y: number; w: number; h: number }) {
    this.butterflies.push({
      x: fromX,
      y: fromY,
      tx: bounds.x + rand(0, bounds.w),
      ty: bounds.y + rand(0, bounds.h),
      vx: 0,
      vy: 0,
      phase: rand(0, 10),
      color: pick(['#FFB3CB', '#D8C5F3', '#BEDFFF', '#FFE69A']),
      size: rand(9, 13),
      life: 0,
    });
  }

  hasEffects(): boolean {
    return this.sparkles.length > 0 || this.butterflies.length > 0 || this.petals.some((p) => !p.ambient);
  }

  clearEffects() {
    this.petals = this.petals.filter((p) => p.ambient);
    this.sparkles = [];
    this.butterflies = [];
  }

  update(dt: number, time: number, bounds: { x: number; y: number; w: number; h: number }) {
    for (const p of this.petals) {
      p.life += dt;
      p.vy += p.gravity * dt;
      if (!p.ambient) {
        p.vx *= 1 - dt * 1.2;
        p.vy = Math.min(p.vy, 70);
      }
      p.x += (p.vx + Math.sin(time * 1.3 + p.phase) * 12) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.ambient && (p.y > this.height + 20 || p.x > this.width + 30)) {
        Object.assign(p, this.makeAmbient(false));
      }
    }
    this.petals = this.petals.filter((p) => p.life < p.maxLife);
    for (const s of this.sparkles) s.life += dt;
    this.sparkles = this.sparkles.filter((s) => s.life < s.maxLife);

    for (const b of this.butterflies) {
      b.life += dt;
      const dx = b.tx - b.x;
      const dy = b.ty - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 20) {
        b.tx = bounds.x + rand(0, bounds.w);
        b.ty = bounds.y + rand(0, bounds.h);
      }
      b.vx += (dx / (d || 1)) * 140 * dt + Math.sin(time * 3 + b.phase) * 60 * dt;
      b.vy += (dy / (d || 1)) * 140 * dt + Math.cos(time * 2.3 + b.phase) * 60 * dt;
      const sp = Math.hypot(b.vx, b.vy);
      const max = 70;
      if (sp > max) {
        b.vx = (b.vx / sp) * max;
        b.vy = (b.vy / sp) * max;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    for (const p of this.petals) {
      const fade = p.ambient ? 0.75 : Math.min(1, (p.maxLife - p.life) * 1.5);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(time * 2 + p.phase)));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size);
      ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }

    for (const s of this.sparkles) {
      if (s.life < 0) continue;
      const t = s.life / s.maxLife;
      const k = Math.sin(t * Math.PI);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(t * 1.5);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#FFFFFF';
      const r = s.size * k;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.butterflies) {
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(time * 14 + b.phase));
      const appear = Math.min(1, b.life * 2);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.globalAlpha = appear;
      const s = b.size;
      ctx.fillStyle = b.color;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side * flap, 1);
        ctx.beginPath();
        ctx.ellipse(s * 0.5, -s * 0.25, s * 0.55, s * 0.42, -0.5, 0, Math.PI * 2);
        ctx.ellipse(s * 0.38, s * 0.35, s * 0.36, s * 0.3, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#8B7394';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.09, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
