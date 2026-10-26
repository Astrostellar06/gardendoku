/**
 * Touch / mouse input on the garden canvas:
 *  - tap: rotate
 *  - long press, then optionally slide: lock (or unlock) every tile the finger crosses
 *  - in lock mode, touching and sliding does the same right away
 *  - right click / right drag (desktop): same as a long press
 */

export interface InputHandlers {
  cellAt(x: number, y: number): number;
  /** Lock mode: painting starts as soon as the finger touches the garden. */
  lockMode(): boolean;
  tap(cell: number): void;
  /** Start painting locks from `cell` (it decides whether the stroke locks or unlocks). */
  paintStart(cell: number): void;
  /** The stroke entered another tile. */
  paintMove(cell: number): void;
  paintEnd(): void;
  holdStart(cell: number, durationMs: number): void;
  holdEnd(): void;
}

const MOVE_TOLERANCE = 14;
/** Spacing (px) of the points sampled along a fast stroke, so no tile is skipped. */
const SAMPLE_STEP = 8;

interface Stroke {
  id: number;
  cell: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  lastCell: number;
  timer: number;
  painting: boolean;
}

export function attachInput(el: HTMLElement, h: InputHandlers, longPressMs = 420): void {
  let active: Stroke | null = null;

  const local = (e: PointerEvent): [number, number] => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const startPainting = (s: Stroke) => {
    s.painting = true;
    s.lastCell = s.cell;
    h.holdEnd();
    h.paintStart(s.cell);
  };

  const finish = () => {
    if (!active) return;
    clearTimeout(active.timer);
    const wasPainting = active.painting;
    active = null;
    h.holdEnd();
    if (wasPainting) h.paintEnd();
  };

  el.addEventListener('pointerdown', (e) => {
    if (active) return;
    const [x, y] = local(e);
    const cell = h.cellAt(x, y);
    const secondary = e.pointerType === 'mouse' && e.button === 2;
    if (cell < 0 || (e.pointerType === 'mouse' && e.button !== 0 && !secondary)) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; input still works.
    }
    const stroke: Stroke = { id: e.pointerId, cell, x, y, lastX: x, lastY: y, lastCell: cell, timer: 0, painting: false };
    active = stroke;
    if (secondary || h.lockMode()) {
      startPainting(stroke);
      return;
    }
    stroke.timer = window.setTimeout(() => {
      if (active === stroke) startPainting(stroke);
    }, longPressMs);
    h.holdStart(cell, longPressMs);
  });

  el.addEventListener('pointermove', (e) => {
    const s = active;
    if (!s || e.pointerId !== s.id) return;
    const [x, y] = local(e);
    if (!s.painting) {
      // Moving before the long press completes cancels it (no rotation either).
      if (Math.hypot(x - s.x, y - s.y) > MOVE_TOLERANCE) {
        clearTimeout(s.timer);
        active = null;
        h.holdEnd();
      }
      return;
    }
    const dist = Math.hypot(x - s.lastX, y - s.lastY);
    const steps = Math.max(1, Math.ceil(dist / SAMPLE_STEP));
    for (let k = 1; k <= steps; k++) {
      const px = s.lastX + ((x - s.lastX) * k) / steps;
      const py = s.lastY + ((y - s.lastY) * k) / steps;
      const cell = h.cellAt(px, py);
      if (cell >= 0 && cell !== s.lastCell) {
        s.lastCell = cell;
        h.paintMove(cell);
      }
    }
    s.lastX = x;
    s.lastY = y;
  });

  el.addEventListener('pointerup', (e) => {
    const s = active;
    if (!s || e.pointerId !== s.id) return;
    if (s.painting) {
      finish();
      return;
    }
    clearTimeout(s.timer);
    active = null;
    h.holdEnd();
    h.tap(s.cell);
  });

  el.addEventListener('pointercancel', finish);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
