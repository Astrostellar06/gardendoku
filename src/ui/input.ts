/**
 * Touch / mouse input on the garden canvas:
 *  - tap: rotate (or lock, in lock mode)
 *  - long press: lock / unlock
 *  - right click (desktop): lock / unlock
 */

export interface InputHandlers {
  cellAt(x: number, y: number): number;
  tap(cell: number): void;
  longPress(cell: number): void;
  secondary(cell: number): void;
  holdStart(cell: number, durationMs: number): void;
  holdEnd(): void;
}

const MOVE_TOLERANCE = 14;

export function attachInput(el: HTMLElement, h: InputHandlers, longPressMs = 420): void {
  let active: {
    id: number;
    cell: number;
    x: number;
    y: number;
    timer: number;
    fired: boolean;
  } | null = null;

  const local = (e: PointerEvent): [number, number] => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const cancel = () => {
    if (!active) return;
    clearTimeout(active.timer);
    active = null;
    h.holdEnd();
  };

  el.addEventListener('pointerdown', (e) => {
    const [x, y] = local(e);
    const cell = h.cellAt(x, y);
    if (e.pointerType === 'mouse' && e.button === 2) {
      e.preventDefault();
      if (cell >= 0) h.secondary(cell);
      return;
    }
    if (active || cell < 0 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; input still works.
    }
    const state = {
      id: e.pointerId,
      cell,
      x,
      y,
      fired: false,
      timer: window.setTimeout(() => {
        state.fired = true;
        h.holdEnd();
        h.longPress(cell);
      }, longPressMs),
    };
    active = state;
    h.holdStart(cell, longPressMs);
  });

  el.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== active.id || active.fired) return;
    const [x, y] = local(e);
    if (Math.hypot(x - active.x, y - active.y) > MOVE_TOLERANCE) cancel();
  });

  el.addEventListener('pointerup', (e) => {
    if (!active || e.pointerId !== active.id) return;
    const { cell, fired } = active;
    clearTimeout(active.timer);
    active = null;
    if (!fired) {
      h.holdEnd();
      h.tap(cell);
    }
  });

  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
