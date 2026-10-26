/**
 * Light-weight particles: the style's ambient drift (petals, leaves, snow,
 * pollen, sand, fireflies, dandelion seeds, hearts), celebration bursts, sparkles
 * and butterflies.
 */
import { P } from './palette';
import { heart, mapleLeaf, snowflake } from './themes/kit';
import type { AmbientKind } from './themes/types';

type Shape = 'petal' | 'leaf' | 'snow' | 'flake' | 'dot' | 'glow' | 'seed' | 'heart';

interface Mote {
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
  shape: Shape;
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

/** Kinds that float around instead of falling. */
const FLOATING: AmbientKind[] = ['pollen', 'sand', 'fireflies', 'seeds', 'hearts'];

export class Particles {
  private motes: Mote[] = [];
  private sparkles: Sparkle[] = [];
  private butterflies: Butterfly[] = [];
  private width = 1;
  private height = 1;
  private kind: AmbientKind = 'petals';
  private colors: string[] = ['#FFC4D6', '#FFD9E4', '#FFF0B8', '#FFFFFF'];

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.fillAmbient();
  }

  /** Switch the ambient drift (on style change). */
  setAmbient(kind: AmbientKind, colors: string[]) {
    this.kind = kind;
    this.colors = colors;
    this.motes = this.motes.filter((m) => !m.ambient);
    this.fillAmbient();
  }

  private fillAmbient() {
    const density = this.kind === 'snow' ? 2.2 : this.kind === 'sand' ? 1.6 : this.kind === 'fireflies' ? 1.2 : 1;
    const want = Math.round(Math.min(16, (this.width * this.height) / 30000) * density);
    const have = this.motes.filter((m) => m.ambient).length;
    for (let k = have; k < want; k++) this.motes.push(this.makeAmbient(true));
  }

  private makeAmbient(anywhere: boolean): Mote {
    const base: Mote = {
      x: rand(-20, this.width + 20),
      y: anywhere ? rand(0, this.height) : -20,
      vx: rand(4, 14),
      vy: rand(10, 22),
      rot: rand(0, Math.PI * 2),
      vr: rand(-1, 1),
      size: rand(4, 7),
      color: pick(this.colors),
      phase: rand(0, 10),
      life: 0,
      maxLife: Infinity,
      gravity: 0,
      ambient: true,
      shape: 'petal',
    };
    switch (this.kind) {
      case 'leaves':
        return { ...base, shape: 'leaf', size: rand(4.5, 7.5), vr: rand(-2, 2), vy: rand(14, 26) };
      case 'snow':
        return { ...base, shape: 'snow', size: rand(1.4, 3.6), vx: rand(-4, 6), vy: rand(14, 32) };
      case 'pollen':
        return { ...base, shape: 'dot', size: rand(1.2, 2.4), vx: rand(-6, 6), vy: rand(-5, 3), y: rand(0, this.height) };
      case 'sand':
        return { ...base, shape: 'dot', size: rand(0.8, 1.8), vx: rand(22, 48), vy: rand(-3, 4), y: rand(0, this.height) };
      case 'fireflies':
        return { ...base, shape: 'glow', size: rand(1.6, 2.8), vx: rand(-8, 8), vy: rand(-8, 8), y: rand(0, this.height) };
      case 'seeds':
        return { ...base, shape: 'seed', size: rand(3.5, 5.5), vx: rand(8, 18), vy: rand(-4, 6), y: rand(0, this.height) };
      case 'hearts':
        // Little hearts rising slowly.
        return { ...base, shape: 'heart', size: rand(3, 5.5), vx: rand(-4, 4), vy: rand(-16, -7), vr: rand(-0.4, 0.4), y: rand(0, this.height) };
      default:
        return base;
    }
  }

  burst(x: number, y: number, count: number, spread = 1) {
    const shape: Shape = this.kind === 'leaves' ? 'leaf' : this.kind === 'snow' ? 'flake' : 'petal';
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(30, 120) * spread;
      this.motes.push({
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
        shape,
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
    return this.sparkles.length > 0 || this.butterflies.length > 0 || this.motes.some((p) => !p.ambient);
  }

  clearEffects() {
    this.motes = this.motes.filter((p) => p.ambient);
    this.sparkles = [];
    this.butterflies = [];
  }

  update(dt: number, time: number, bounds: { x: number; y: number; w: number; h: number }) {
    const floating = FLOATING.includes(this.kind);
    for (const p of this.motes) {
      p.life += dt;
      p.vy += p.gravity * dt;
      if (!p.ambient) {
        p.vx *= 1 - dt * 1.2;
        p.vy = Math.min(p.vy, 70);
      } else if (this.kind === 'fireflies') {
        // Slow random wandering.
        p.vx += Math.sin(time * 0.7 + p.phase * 3) * 10 * dt;
        p.vy += Math.cos(time * 0.9 + p.phase * 2) * 10 * dt;
        p.vx = Math.max(-12, Math.min(12, p.vx));
        p.vy = Math.max(-12, Math.min(12, p.vy));
      }
      const sway = p.shape === 'dot' || p.shape === 'glow' ? 3 : p.shape === 'snow' ? 8 : 12;
      p.x += (p.vx + Math.sin(time * 1.3 + p.phase) * sway) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (!p.ambient) continue;
      if (floating) {
        if (p.x > this.width + 30) p.x = -20;
        if (p.x < -30) p.x = this.width + 20;
        if (p.y > this.height + 20) p.y = -20;
        if (p.y < -30) p.y = this.height + 20;
      } else if (p.y > this.height + 20 || p.x > this.width + 30 || p.x < -40) {
        Object.assign(p, this.makeAmbient(false));
      }
    }
    this.motes = this.motes.filter((p) => p.life < p.maxLife);
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

  private drawMote(ctx: CanvasRenderingContext2D, p: Mote, time: number) {
    const fade = p.ambient ? 0.8 : Math.min(1, (p.maxLife - p.life) * 1.5);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(p.x, p.y);
    switch (p.shape) {
      case 'leaf':
        ctx.rotate(p.rot);
        ctx.scale(1, 0.6 + 0.4 * Math.abs(Math.sin(time * 1.6 + p.phase)));
        mapleLeaf(ctx, 0, 0, p.size, 0, p.color);
        break;
      case 'snow':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'flake':
        ctx.rotate(p.rot);
        snowflake(ctx, 0, 0, p.size, '#FFFFFF');
        break;
      case 'dot':
        ctx.globalAlpha = fade * (0.55 + 0.45 * Math.sin(time * 2.5 + p.phase));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'glow': {
        const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(time * 1.8 + p.phase * 4));
        ctx.globalAlpha = pulse * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#FFFDE0';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'heart':
        ctx.rotate(Math.sin(time * 1.4 + p.phase) * 0.3);
        ctx.scale(0.75 + 0.25 * Math.abs(Math.sin(time * 1.1 + p.phase)), 1);
        heart(ctx, 0, 0, p.size, p.color);
        break;
      case 'seed': {
        ctx.rotate(Math.sin(time + p.phase) * 0.4);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI / 2 + (k - 3) * 0.32;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
        }
        ctx.moveTo(0, 0);
        ctx.lineTo(0, p.size * 0.9);
        ctx.stroke();
        ctx.fillStyle = '#E8DCC8';
        ctx.beginPath();
        ctx.arc(0, p.size * 0.9, 0.9, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default:
        ctx.rotate(p.rot);
        ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(time * 2 + p.phase)));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size);
        ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size);
        ctx.fill();
    }
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    for (const p of this.motes) this.drawMote(ctx, p, time);

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
        ctx.fill();
        ctx.beginPath();
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
