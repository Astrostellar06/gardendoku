/**
 * Touch / mouse input on the garden canvas:
 *  - tap: rotate
 *  - long press, then optionally slide: lock (or unlock) every tile the finger crosses
 *  - in lock mode, touching and sliding does the same right away
 *  - right click / right drag (desktop): same as a long press
 *  - two fingers (or the mouse wheel): zoom; while zoomed, sliding one finger moves the view
 *    (never in lock mode, where sliding paints locks); after a victory, sliding turns the garden
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
  /** True when sliding a finger moves (or turns) the view instead of cancelling the touch. */
  canDrag(): boolean;
  drag(dx: number, dy: number): void;
  dragEnd(): void;
  /** Two fingers sliding together move the (zoomed) view. */
  pan(dx: number, dy: number): void;
  /** Zoom by `factor` around (x, y). */
  zoom(x: number, y: number, factor: number): void;
}

const MOVE_TOLERANCE = 14;
/** Spacing (px) of the points sampled along a fast stroke, so no tile is skipped. */
const SAMPLE_STEP = 8;
/**
 * In lock mode, painting waits this long (or for the finger to move), so that
 * a second finger coming down to zoom does not flip a lock first.
 */
const LOCK_MODE_DELAY = 90;

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
  dragging: boolean;
}

export function attachInput(el: HTMLElement, h: InputHandlers, longPressMs = 420): void {
  let active: Stroke | null = null;
  /** Fingers on the garden, for pinching. */
  const fingers = new Map<number, [number, number]>();
  let pinch: { dist: number; mid: [number, number] } | null = null;
  /** After a pinch, the finger left on the screen does nothing until lifted. */
  let spent = false;

  const local = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const startPainting = (s: Stroke) => {
    clearTimeout(s.timer);
    s.painting = true;
    s.lastCell = s.cell;
    h.holdEnd();
    h.paintStart(s.cell);
  };

  const finish = () => {
    if (!active) return;
    clearTimeout(active.timer);
    const { painting, dragging } = active;
    active = null;
    h.holdEnd();
    if (painting) h.paintEnd();
    if (dragging) h.dragEnd();
  };

  const twoFingers = (): [[number, number], [number, number]] => {
    const [a, b] = [...fingers.values()];
    return [a, b];
  };

  el.addEventListener('pointerdown', (e) => {
    const secondary = e.pointerType === 'mouse' && e.button === 2;
    if (e.pointerType === 'mouse' && e.button !== 0 && !secondary) return;
    const [x, y] = local(e);
    fingers.set(e.pointerId, [x, y]);
    if (fingers.size === 2) {
      // A second finger: the touch becomes a pinch.
      finish();
      spent = true;
      const [a, b] = twoFingers();
      pinch = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
      e.preventDefault();
      return;
    }
    if (fingers.size > 2 || active) return;
    spent = false;
    const cell = h.cellAt(x, y);
    const draggable = h.canDrag();
    if (cell < 0 && !draggable) {
      fingers.delete(e.pointerId);
      return;
    }
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; input still works.
    }
    const stroke: Stroke = { id: e.pointerId, cell, x, y, lastX: x, lastY: y, lastCell: cell, timer: 0, painting: false, dragging: false };
    active = stroke;
    if (cell < 0) return;
    if (secondary) {
      startPainting(stroke);
      return;
    }
    if (h.lockMode()) {
      stroke.timer = window.setTimeout(() => {
        if (active === stroke) startPainting(stroke);
      }, LOCK_MODE_DELAY);
      return;
    }
    stroke.timer = window.setTimeout(() => {
      if (active === stroke) startPainting(stroke);
    }, longPressMs);
    h.holdStart(cell, longPressMs);
  });

  el.addEventListener('pointermove', (e) => {
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, local(e));
    if (pinch && fingers.size === 2) {
      const [a, b] = twoFingers();
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (pinch.dist > 0) h.zoom(mid[0], mid[1], dist / pinch.dist);
      // Both fingers sliding together move the view too.
      h.pan(mid[0] - pinch.mid[0], mid[1] - pinch.mid[1]);
      pinch = { dist, mid };
      return;
    }
    const s = active;
    if (!s || e.pointerId !== s.id) return;
    const [x, y] = local(e);
    if (s.dragging) {
      h.drag(x - s.lastX, y - s.lastY);
      s.lastX = x;
      s.lastY = y;
      return;
    }
    if (!s.painting) {
      if (Math.hypot(x - s.x, y - s.y) <= MOVE_TOLERANCE) return;
      clearTimeout(s.timer);
      h.holdEnd();
      if (h.lockMode() && s.cell >= 0) {
        // Lock mode: sliding paints locks, from the first tile.
        startPainting(s);
      } else if (h.canDrag()) {
        // Moving before the long press completes: the view moves (no rotation).
        s.dragging = true;
        h.drag(x - s.lastX, y - s.lastY);
        s.lastX = x;
        s.lastY = y;
        return;
      } else {
        // Moving before the long press completes cancels it (no rotation either).
        active = null;
        return;
      }
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

  const lift = (e: PointerEvent) => {
    fingers.delete(e.pointerId);
    if (fingers.size < 2) pinch = null;
    const s = active;
    if (!s || e.pointerId !== s.id) return;
    if (s.painting || s.dragging || e.type === 'pointercancel') {
      finish();
      return;
    }
    clearTimeout(s.timer);
    active = null;
    h.holdEnd();
    // A lock mode touch that never moved still flips its tile's lock.
    if (h.lockMode() && s.cell >= 0 && !spent) {
      h.paintStart(s.cell);
      h.paintEnd();
      return;
    }
    if (s.cell >= 0 && !spent) h.tap(s.cell);
  };
  el.addEventListener('pointerup', lift);
  el.addEventListener('pointercancel', lift);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const [x, y] = local(e);
      h.zoom(x, y, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
}
