import { useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

const MIN_SCALE = 0.1;
const MAX_SCALE = 32;
// Mouse-wheel and trackpad-scroll deliver larger deltaY per event than a
// pinch gesture, so they need a smaller multiplier to feel right.
const WHEEL_SPEED = 0.0015;
// Trackpad pinch is reported as wheel events with ctrlKey=true. The deltas
// are tiny per event, so we crank the multiplier well above WHEEL_SPEED to
// match the visceral feel of native pinch zoom.
const PINCH_SPEED = 0.012;

export interface ViewerState {
  /** User zoom multiplier on top of the natural fit. 1 = fit, >1 = zoomed in. */
  scale: number;
  /** Translation in CSS pixels, applied with transform-origin top-left of the
   * fit-wrapper that the consumer renders. */
  tx: number;
  ty: number;
}

export interface ViewerApi {
  state: ViewerState;
  spaceHeld: boolean;
  /** Returns true if pointer-down started a pan (caller should swallow the event).
   * Pass `{ force: true }` to start a pan regardless of modifier state — used
   * by the compare slider where dragging is pan by default. */
  beginPan(e: PointerEvent, opts?: { force?: boolean }): boolean;
  movePan(e: PointerEvent): boolean;
  endPan(e: PointerEvent): boolean;
  fit(): void;
  /** Zoom so one source pixel == one screen pixel, then center. */
  zoom100(sourceWidth: number, sourceHeight: number): void;
}

/**
 * `containerRef` is the element that listens for wheel events (typically the
 * outer scroll/clip container). `fitRef` is the natural-fit-sized inner box
 * whose top-left defines the origin of (tx, ty) — i.e., the wrapper the
 * consumer applies the transform to.
 */
export function useViewer(
  containerRef: RefObject<HTMLElement | null>,
  fitRef: RefObject<HTMLElement | null>,
): ViewerApi {
  const [state, setState] = useState<ViewerState>({ scale: 1, tx: 0, ty: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panRef = useRef<{
    pointerId: number;
    startTx: number;
    startTy: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    function isInInput(e: KeyboardEvent): boolean {
      const t = e.target;
      return (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t as HTMLElement | null)?.isContentEditable === true
      );
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === ' ' && !isInInput(e)) {
        if (!e.repeat) e.preventDefault();
        setSpaceHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') setSpaceHeld(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      const fit = fitRef.current;
      if (!fit) return;
      e.preventDefault();
      const fitRect = fit.getBoundingClientRect();
      const cx = e.clientX - fitRect.left;
      const cy = e.clientY - fitRect.top;
      setState((prev) => {
        const speed = e.ctrlKey ? PINCH_SPEED : WHEEL_SPEED;
        const factor = Math.exp(-e.deltaY * speed);
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        // Zoom around cursor: keep the content point under the cursor stable.
        const newTx = cx - ((cx - prev.tx) / prev.scale) * newScale;
        const newTy = cy - ((cy - prev.ty) / prev.scale) * newScale;
        return { scale: newScale, tx: newTx, ty: newTy };
      });
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, fitRef]);

  function beginPan(e: PointerEvent, opts?: { force?: boolean }): boolean {
    if (!opts?.force && !spaceHeld && e.button !== 1) return false;
    panRef.current = {
      pointerId: e.pointerId,
      startTx: state.tx,
      startTy: state.ty,
      startX: e.clientX,
      startY: e.clientY,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
    return true;
  }

  function movePan(e: PointerEvent): boolean {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return false;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    setState((prev) => ({ ...prev, tx: pan.startTx + dx, ty: pan.startTy + dy }));
    return true;
  }

  function endPan(e: PointerEvent): boolean {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return false;
    panRef.current = null;
    return true;
  }

  function fit() {
    setState({ scale: 1, tx: 0, ty: 0 });
  }

  function zoom100(sourceWidth: number, sourceHeight: number) {
    const c = containerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const fitScale = Math.min(r.width / sourceWidth, r.height / sourceHeight);
    if (fitScale > 0 && Number.isFinite(fitScale)) {
      setState({ scale: 1 / fitScale, tx: 0, ty: 0 });
    }
  }

  return { state, spaceHeld, beginPan, movePan, endPan, fit, zoom100 };
}
