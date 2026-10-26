/**
 * Tiny synthesised sound design (no audio files): soft wooden taps, a
 * pentatonic bell each time water reaches a tile (so the flowing water
 * plays a little melody), and a chime arpeggio on victory.
 */

const PENTA = [0, 2, 4, 7, 9];

export class Sound {
  enabled = true;
  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private lastNote = 0;
  private notesInWindow = 0;

  /** Must be called from a user gesture (browsers block audio before that). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      // A soft feedback echo gives the bells some airy space.
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.24;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2400;
      const wet = ctx.createGain();
      wet.gain.value = 0.28;
      const bus = ctx.createGain();
      bus.connect(master);
      bus.connect(delay);
      delay.connect(tone);
      tone.connect(feedback);
      feedback.connect(delay);
      tone.connect(wet);
      wet.connect(master);

      this.ctx = ctx;
      this.bus = bus;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private ready(): AudioContext | null {
    if (!this.enabled || !this.ctx || !this.bus || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, attack = 0.006) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(this.bus!);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private bell(freq: number, start: number, gain = 0.05, dur = 1.3) {
    this.tone(freq, start, dur, 'sine', gain, 0.008);
    this.tone(freq * 2, start, dur * 0.45, 'sine', gain * 0.3, 0.004);
    this.tone(freq * 3.01, start, dur * 0.2, 'sine', gain * 0.12, 0.002);
  }

  rotate() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = 520 + Math.random() * 60;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g);
    g.connect(this.bus!);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  lock(on: boolean) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const [a, b] = on ? [880, 1320] : [1320, 880];
    this.tone(a, t, 0.07, 'sine', 0.05);
    this.tone(b, t + 0.06, 0.1, 'sine', 0.05);
  }

  /** Soft rising note for each extra tile locked while sliding the finger. */
  lockStep(on: boolean, step: number) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const semis = PENTA[step % 5] + 12 * Math.min(2, Math.floor(step / 5));
    const base = on ? 660 : 520;
    this.tone(base * 2 ** (semis / 12), t, 0.12, 'sine', 0.035);
  }

  denied() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(220, t, 0.12, 'triangle', 0.05);
  }

  /** A note per tile reached by water, climbing the pentatonic scale with distance. */
  water(dist: number) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    if (t - this.lastNote < 0.12) {
      if (++this.notesInWindow > 2) return;
    } else {
      this.notesInWindow = 0;
    }
    this.lastNote = t;
    const step = Math.min(dist, 14);
    const semis = PENTA[step % 5] + 12 * Math.floor(step / 5);
    this.bell(392 * 2 ** (semis / 12), t, 0.035, 1.1);
  }

  loop() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(392, t, 0.3, 'sine', 0.05);
    this.tone(311, t + 0.13, 0.45, 'sine', 0.05);
  }

  win() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    const base = 523.25;
    const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 24];
    steps.forEach((s, k) => this.bell(base * 2 ** (s / 12), t + k * 0.09, 0.04, 1.6));
    [0, 4, 7].forEach((s) => this.tone((base / 2) * 2 ** (s / 12), t + 0.9, 2.2, 'sine', 0.025, 0.4));
  }
}
