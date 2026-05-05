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

  const viewer = useViewer(containerRef, fitRef);

  useEffect(() => {
    if (!onViewerReady || !naturalDims) return;
    onViewerReady({
      fit: viewer.fit,
      zoom100: () => viewer.zoom100(naturalDims.w, naturalDims.h),
    });
  }, [onViewerReady, naturalDims, viewer.fit, viewer.zoom100]);

  const dividerInFit = useMemo(() => {
    const dividerScreenX = pos * containerSize.w;
    const fitOffsetX = (containerSize.w - fitDims.w) / 2;
    return Math.max(0, Math.min(fitDims.w, dividerScreenX - fitOffsetX));
  }, [pos, containerSize.w, fitDims.w]);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setPos(Math.max(0, Math.min(1, ratio)));
  }

  // Container handlers — pan is the default gesture.
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
  const containerCursor = 'grab';
  const showImage = encodedUrl ?? originalUrl;
  const zoomPct = naturalDims ? Math.round((fitDims.w / naturalDims.w) * viewer.state.scale * 100) : null;
  const isReset = viewer.state.scale === 1 && viewer.state.tx === 0 && viewer.state.ty === 0;

  // Pill is centered in the visible right portion (between divider and fit
  // wrapper's right edge), and vertically centered in the container.
  const dividerScreenX = pos * containerSize.w;
  const fitRightEdgeX = (containerSize.w + fitDims.w) / 2;
  const pillLeft = (Math.min(dividerScreenX, fitRightEdgeX) + fitRightEdgeX) / 2;

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
      class="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden select-none touch-none flex items-center justify-center"
      style={`cursor: ${containerCursor}`}
      onPointerDown={onContainerDown}
      onPointerMove={onContainerMove}
      onPointerUp={onContainerUp}
      onPointerCancel={onContainerUp}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Compare slider — click and drag to pan; drag the divider to compare"
    >
      <div
        ref={fitRef}
        class="relative"
        style={`width: ${fitDims.w}px; height: ${fitDims.h}px;`}
      >
        <div
          class="absolute inset-0"
          style={`transform: ${transform}; transform-origin: 0 0;`}
        >
          <img
            src={showImage}
            alt=""
            onLoad={onImgLoad}
            class="block w-full h-full pointer-events-none"
            draggable={false}
          />
        </div>
        <div
          class="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none"
          style={`width: ${dividerInFit}px;`}
        >
          <div
            class="absolute top-0 left-0"
            style={`width: ${fitDims.w}px; height: ${fitDims.h}px; transform: ${transform}; transform-origin: 0 0;`}
          >
            <img
              src={originalUrl}
              alt=""
              class="block w-full h-full pointer-events-none"
              draggable={false}
            />
          </div>
        </div>
        {/* Encoding indicator: desaturates only the right (encoded) portion
            via backdrop-filter so the original on the left stays vivid. */}
        <div
          class="absolute top-0 bottom-0 right-0 pointer-events-none transition-opacity duration-200 backdrop-grayscale backdrop-brightness-75"
          style={`left: ${dividerInFit}px; opacity: ${encoding ? 1 : 0};`}
        />
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
        class="absolute top-0 bottom-0 w-px bg-zinc-100 pointer-events-none"
        style={`left: ${pos * 100}%`}
      />
      <div
        class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-100 shadow-lg pointer-events-none flex items-center justify-center"
        style={`left: ${pos * 100}%`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" class="text-zinc-900">
          <path d="M2 7 L5 4 M2 7 L5 10 M12 7 L9 4 M12 7 L9 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
        </svg>
      </div>

      <div class="absolute top-3 left-3 px-2 py-0.5 text-xs bg-black/60 text-zinc-100 rounded pointer-events-none">Original</div>

      {/* Encoding pill — vertically centered, horizontally between the
          divider and the right edge of the image. */}
      {encoding && fitDims.w > 0 && (
        <div
          class="absolute flex items-center gap-2 px-3 py-1.5 bg-black/75 text-zinc-100 text-xs rounded-full pointer-events-none backdrop-blur-sm shadow-lg whitespace-nowrap"
          style={`left: ${pillLeft}px; top: 50%; transform: translate(-50%, -50%);`}
        >
          <Spinner size={12} />
          <span>
            Encoding{encodingElapsed >= 500 ? ` · ${(encodingElapsed / 1000).toFixed(1)}s` : '…'}
          </span>
        </div>
      )}

      {/* Zoom indicator + fit / 100% controls. stopPropagation so the container's
          pan-on-pointerdown doesn't swallow the button click. */}
      <div
        class="absolute top-3 right-3 flex items-center gap-1 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div class="px-2 py-1 bg-black/60 text-zinc-100 rounded tabular-nums pointer-events-none">
          {zoomPct != null ? `${zoomPct}%` : '—'} · Encoded
        </div>
        <button
          onClick={viewer.fit}
          disabled={isReset}
          title="Fit to screen (0)"
          class="px-2 py-1 bg-black/60 hover:bg-black/80 text-zinc-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Fit
        </button>
        <button
          onClick={() => naturalDims && viewer.zoom100(naturalDims.w, naturalDims.h)}
          disabled={!naturalDims || (zoomPct != null && Math.abs(zoomPct - 100) < 1)}
          title="Zoom 1:1 (1)"
          class="px-2 py-1 bg-black/60 hover:bg-black/80 text-zinc-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          100%
        </button>
      </div>
    </div>
  );
}
