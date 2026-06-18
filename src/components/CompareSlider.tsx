import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useViewer } from '../lib/viewer';
import { Spinner } from './ui/Spinner';

interface Props {
  originalUrl: string;
  encodedUrl: string | null;
  /** True while a fresh encode is in flight; the visible "encoded" layer
   * is then a previous (stale) result and gets desaturated to flag that. */
  encoding?: boolean;
  /** Receives the viewer API so the parent can wire `0` / `1` shortcuts. */
  onViewerReady?: (api: { fit: () => void; zoom100: () => void }) => void;
}

const DIVIDER_HIT_WIDTH = 30;

export function CompareSlider({ originalUrl, encodedUrl, encoding, onViewerReady }: Props) {
  const [pos, setPos] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const dividerDragRef = useRef(false);

  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitDims = useMemo(() => {
    if (!naturalDims || containerSize.w === 0 || containerSize.h === 0) return { w: 0, h: 0 };
    const baseScale = Math.min(containerSize.w / naturalDims.w, containerSize.h / naturalDims.h);
    return { w: naturalDims.w * baseScale, h: naturalDims.h * baseScale };
  }, [naturalDims, containerSize]);

  // Where the fitted image sits at rest (centred in the full-size card). The
  // image is free to pan/zoom across the *whole* card from here — the letterbox
  // margins are just empty space at rest, not a clip boundary.
  const fitOffsetX = (containerSize.w - fitDims.w) / 2;
  const fitOffsetY = (containerSize.h - fitDims.h) / 2;

  const viewer = useViewer(containerRef, fitRef);

  useEffect(() => {
    if (!onViewerReady || !naturalDims) return;
    onViewerReady({
      fit: viewer.fit,
      zoom100: () => viewer.zoom100(naturalDims.w, naturalDims.h),
    });
  }, [onViewerReady, naturalDims, viewer.fit, viewer.zoom100]);

  // Divider position in card pixels. Each side is clipped to its half of the
  // *full card height*, so the wipe spans everything the image can be panned to.
  const dividerX = pos * containerSize.w;

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setPos(Math.max(0, Math.min(1, ratio)));
  }

  // Card handlers — pan is the default gesture.
  function onContainerDown(e: PointerEvent) {
    viewer.beginPan(e, { force: true });
  }
  function onContainerMove(e: PointerEvent) {
    viewer.movePan(e);
  }
  function onContainerUp(e: PointerEvent) {
    viewer.endPan(e);
  }

  // Divider hit zone handlers — only divider drag, not pan.
  function onDividerDown(e: PointerEvent) {
    // Holding space defers to pan: don't stop propagation, let it bubble.
    if (viewer.spaceHeld) return;
    e.stopPropagation();
    dividerDragRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  }
  function onDividerMove(e: PointerEvent) {
    if (!dividerDragRef.current) return;
    e.stopPropagation();
    updateFromClientX(e.clientX);
  }
  function onDividerUp(e: PointerEvent) {
    if (!dividerDragRef.current) return;
    dividerDragRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 0.05 : 0.01;
    if (e.key === 'ArrowLeft') {
      setPos((p) => Math.max(0, p - step));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setPos((p) => Math.min(1, p + step));
      e.preventDefault();
    }
  }

  useEffect(() => {
    setPos(0.5);
  }, [encodedUrl]);

  function onImgLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalDims({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }

  const transform = `translate(${viewer.state.tx}px, ${viewer.state.ty}px) scale(${viewer.state.scale})`;
  const showImage = encodedUrl ?? originalUrl;
  const zoomPct = naturalDims ? Math.round((fitDims.w / naturalDims.w) * viewer.state.scale * 100) : null;
  const isReset = viewer.state.scale === 1 && viewer.state.tx === 0 && viewer.state.ty === 0;

  // Encoding pill: centred in the visible encoded region (divider → image right).
  const imageRightX = fitOffsetX + fitDims.w;
  const pillLeft = (Math.min(dividerX, imageRightX) + imageRightX) / 2;

  const [encodingElapsed, setEncodingElapsed] = useState(0);
  useEffect(() => {
    if (!encoding) {
      setEncodingElapsed(0);
      return;
    }
    const start = performance.now();
    const id = window.setInterval(() => setEncodingElapsed(performance.now() - start), 100);
    return () => window.clearInterval(id);
  }, [encoding]);

  return (
    <div
      ref={containerRef}
      class="relative w-full h-full bg-surface rounded-xl overflow-hidden select-none touch-none"
      style="cursor: grab"
      onPointerDown={onContainerDown}
      onPointerMove={onContainerMove}
      onPointerUp={onContainerUp}
      onPointerCancel={onContainerUp}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Before and after comparison. Use the arrow keys to move the divider."
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos * 100)}
      aria-valuetext={`${Math.round(pos * 100)}% revealed`}
    >
      {/* Invisible reference box at the image's rest position — the viewer uses
          it as the transform origin for cursor-anchored zoom. */}
      <div
        ref={fitRef}
        class="absolute pointer-events-none"
        style={`left: ${fitOffsetX}px; top: ${fitOffsetY}px; width: ${fitDims.w}px; height: ${fitDims.h}px;`}
      />

      {/* Encoded image — clipped to the RIGHT of the divider, full card height.
          The inner wrapper is placed at the image's rest offset (shifted by the
          clip's own left edge) so it stays registered with the original. */}
      <div
        class="absolute top-0 bottom-0 right-0 overflow-hidden pointer-events-none"
        style={`left: ${dividerX}px;`}
      >
        <div
          class="absolute"
          style={`left: ${fitOffsetX - dividerX}px; top: ${fitOffsetY}px; width: ${fitDims.w}px; height: ${fitDims.h}px; transform: ${transform}; transform-origin: 0 0;`}
        >
          <img
            src={showImage}
            alt=""
            draggable={false}
            class="block w-full h-full pointer-events-none transition-[filter] duration-200"
            // Desaturate the encoded layer in place so the effect tracks the
            // image as it pans/zooms (a fixed overlay would fall out of sync).
            style={encoding ? 'filter: grayscale(1) brightness(0.75)' : undefined}
          />
        </div>
      </div>
      {/* Original image — clipped to the LEFT of the divider, full card height.
          Each side is clipped to its own half so neither bleeds across the
          divider, and panning into a margin reveals the image, not a bar. */}
      <div
        class="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
        style={`width: ${dividerX}px;`}
      >
        <div
          class="absolute"
          style={`left: ${fitOffsetX}px; top: ${fitOffsetY}px; width: ${fitDims.w}px; height: ${fitDims.h}px; transform: ${transform}; transform-origin: 0 0;`}
        >
          <img
            src={originalUrl}
            alt=""
            onLoad={onImgLoad}
            draggable={false}
            class="block w-full h-full pointer-events-none"
          />
        </div>
      </div>

      {/* Divider hit zone — wide, transparent, captures the divider drag */}
      <div
        class="absolute top-0 bottom-0"
        style={`left: ${pos * 100}%; width: ${DIVIDER_HIT_WIDTH}px; transform: translateX(-50%); cursor: ${viewer.spaceHeld ? 'grab' : 'ew-resize'}`}
        onPointerDown={onDividerDown}
        onPointerMove={onDividerMove}
        onPointerUp={onDividerUp}
        onPointerCancel={onDividerUp}
      />

      {/* Visual divider line + handle (purely cosmetic) */}
      <div
        class="absolute top-0 bottom-0 w-px bg-brand pointer-events-none"
        style={`left: ${pos * 100}%`}
      />
      <div
        class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-brand shadow-lg pointer-events-none flex items-center justify-center"
        style={`left: ${pos * 100}%`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" class="text-white">
          <path d="M2 7 L5 4 M2 7 L5 10 M12 7 L9 4 M12 7 L9 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
        </svg>
      </div>

      <div class="absolute top-3 left-3 px-2 py-0.5 text-xs bg-black/60 text-white rounded pointer-events-none">Original</div>

      {/* Encoding pill — vertically centred, in the encoded half. */}
      {encoding && fitDims.w > 0 && (
        <div
          role="status"
          aria-live="polite"
          class="absolute flex items-center gap-2 px-3 py-1.5 bg-black/75 text-white text-xs rounded-full pointer-events-none backdrop-blur-sm shadow-lg whitespace-nowrap"
          style={`left: ${pillLeft}px; top: 50%; transform: translate(-50%, -50%);`}
        >
          <Spinner size={12} />
          <span>
            Encoding{encodingElapsed >= 500 ? ` · ${(encodingElapsed / 1000).toFixed(1)}s` : '…'}
          </span>
        </div>
      )}

      {/* Zoom indicator + fit / 100% controls. stopPropagation so the card's
          pan-on-pointerdown doesn't swallow the button click. */}
      <div
        class="absolute top-3 right-3 flex items-center gap-1 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div class="px-2 py-1 bg-black/60 text-white rounded tabular-nums pointer-events-none">
          {zoomPct != null ? `${zoomPct}%` : '—'} · Encoded
        </div>
        <button
          onClick={viewer.fit}
          disabled={isReset}
          title="Fit to screen (0)"
          class="px-2 py-1 bg-black/60 hover:bg-black/80 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Fit
        </button>
        <button
          onClick={() => naturalDims && viewer.zoom100(naturalDims.w, naturalDims.h)}
          disabled={!naturalDims || (zoomPct != null && Math.abs(zoomPct - 100) < 1)}
          title="Zoom 1:1 (1)"
          class="px-2 py-1 bg-black/60 hover:bg-black/80 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          100%
        </button>
      </div>
    </div>
  );
}
