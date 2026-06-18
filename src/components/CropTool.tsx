import { useEffect, useRef, useState } from 'preact/hooks';
import type { CropRect, HandleId } from '../lib/crop';
import { applyResize, clampRect, constrainCreate, normalizeRect } from '../lib/crop';
import { useViewer, type ViewerApi } from '../lib/viewer';

const HANDLE_SCREEN_PX = 12;
const STROKE_SCREEN_PX = 1.5;
const PIXEL_GRID_THRESHOLD = 4;

const CORNER_HANDLES: ReadonlyArray<HandleId> = ['nw', 'ne', 'se', 'sw'];
const EDGE_HANDLES: ReadonlyArray<HandleId> = ['n', 'e', 's', 'w'];

const HANDLE_CURSOR: Record<HandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

interface DragState {
  mode: 'create' | 'move' | 'resize';
  handle?: HandleId;
  startSrcX: number;
  startSrcY: number;
  startRect: CropRect;
  pointerId: number;
}

interface Props {
  imageUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  rect: CropRect | null;
  aspectRatio: number | null;
  onRectChange: (rect: CropRect | null) => void;
  /** Receives the viewer API once available so the parent can wire keyboard
   * shortcuts (0 = fit, 1 = 100%) and other commands. */
  onViewerReady?: (api: { fit: () => void; zoom100: () => void }) => void;
}

export function CropTool({
  imageUrl,
  sourceWidth,
  sourceHeight,
  rect,
  aspectRatio,
  onRectChange,
  onViewerReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [fitDims, setFitDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const baseScale = Math.min(r.width / sourceWidth, r.height / sourceHeight);
      if (baseScale > 0 && Number.isFinite(baseScale)) {
        setFitDims({ w: sourceWidth * baseScale, h: sourceHeight * baseScale });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sourceWidth, sourceHeight]);

  const viewer: ViewerApi = useViewer(containerRef, fitRef);
  const baseFitScale = sourceWidth > 0 ? fitDims.w / sourceWidth : 0;
  const effectiveScale = baseFitScale * viewer.state.scale;
  const showPixelGrid = effectiveScale >= PIXEL_GRID_THRESHOLD;

  useEffect(() => {
    if (!onViewerReady) return;
    onViewerReady({
      fit: viewer.fit,
      zoom100: () => viewer.zoom100(sourceWidth, sourceHeight),
    });
  }, [onViewerReady, sourceWidth, sourceHeight, viewer.fit, viewer.zoom100]);

  function clientToSrc(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const t = point.matrixTransform(ctm.inverse());
    return { x: t.x, y: t.y };
  }

  function commit(next: CropRect | null) {
    if (!next) {
      onRectChange(null);
      return;
    }
    onRectChange(clampRect(normalizeRect(next), sourceWidth, sourceHeight));
  }

  function onPointerDownBackground(e: PointerEvent) {
    if (viewer.beginPan(e)) return;
    const p = clientToSrc(e.clientX, e.clientY);
    if (!p) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'create',
      startSrcX: p.x,
      startSrcY: p.y,
      startRect: { x: p.x, y: p.y, width: 0, height: 0 },
      pointerId: e.pointerId,
    };
    onRectChange({ x: p.x, y: p.y, width: 0, height: 0 });
  }

  function onPointerDownRect(e: PointerEvent) {
    if (!rect) return;
    if (viewer.spaceHeld) return; // let the background handler run a pan
    e.stopPropagation();
    const p = clientToSrc(e.clientX, e.clientY);
    if (!p) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'move',
      startSrcX: p.x,
      startSrcY: p.y,
      startRect: { ...rect },
      pointerId: e.pointerId,
    };
  }

  function onPointerDownHandle(handle: HandleId, e: PointerEvent) {
    if (!rect) return;
    if (viewer.spaceHeld) return;
    e.stopPropagation();
    const p = clientToSrc(e.clientX, e.clientY);
    if (!p) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: 'resize',
      handle,
      startSrcX: p.x,
      startSrcY: p.y,
      startRect: { ...rect },
      pointerId: e.pointerId,
    };
  }

  function onPointerMove(e: PointerEvent) {
    if (viewer.movePan(e)) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const p = clientToSrc(e.clientX, e.clientY);
    if (!p) return;
    const dx = p.x - drag.startSrcX;
    const dy = p.y - drag.startSrcY;

    let next: CropRect;
    if (drag.mode === 'create') {
      const ratio = aspectRatio ?? (e.shiftKey ? 1 : null);
      if (ratio != null && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
        next = constrainCreate({ x: drag.startRect.x, y: drag.startRect.y }, dx, dy, ratio);
      } else {
        next = { x: drag.startRect.x, y: drag.startRect.y, width: dx, height: dy };
      }
    } else if (drag.mode === 'move') {
      next = {
        x: drag.startRect.x + dx,
        y: drag.startRect.y + dy,
        width: drag.startRect.width,
        height: drag.startRect.height,
      };
    } else {
      next = applyResize(drag.startRect, drag.handle!, dx, dy, {
        aspectRatio,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      });
    }
    commit(next);
  }

  function onPointerUp(e: PointerEvent) {
    if (viewer.endPan(e)) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (drag.mode === 'create' && rect && (rect.width < 1 || rect.height < 1)) {
      onRectChange(null);
    }
  }

  // Sizes in source-pixel units that work out to a fixed screen size.
  const handleSizeSrc = effectiveScale > 0 ? HANDLE_SCREEN_PX / effectiveScale : 0;
  const showEdgeHandles = aspectRatio == null;
  // Cursor on the container reflects the viewer mode.
  const containerCursor = viewer.spaceHeld ? 'grab' : 'default';

  return (
    <div
      ref={containerRef}
      class="relative w-full h-full bg-surface rounded-xl overflow-hidden flex items-center justify-center"
      style={`cursor: ${containerCursor}`}
    >
      <div
        ref={fitRef}
        style={`width: ${fitDims.w}px; height: ${fitDims.h}px; position: relative;`}
      >
        <div
          style={`position: absolute; inset: 0; transform: translate(${viewer.state.tx}px, ${viewer.state.ty}px) scale(${viewer.state.scale}); transform-origin: 0 0;`}
        >
          <img
            src={imageUrl}
            alt=""
            class="block w-full h-full pointer-events-none select-none"
            draggable={false}
          />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${sourceWidth} ${sourceHeight}`}
            preserveAspectRatio="none"
            class="absolute inset-0 w-full h-full touch-none"
            onPointerDown={onPointerDownBackground}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <defs>
              {showPixelGrid && (
                <pattern id="cropPxGrid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path
                    d="M 1 0 L 0 0 0 1"
                    stroke="rgba(255,255,255,0.18)"
                    stroke-width={1 / effectiveScale}
                    fill="none"
                  />
                </pattern>
              )}
              <mask id="cropHole">
                <rect x={0} y={0} width={sourceWidth} height={sourceHeight} fill="white" />
                {rect && rect.width > 0 && rect.height > 0 && (
                  <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="black" />
                )}
              </mask>
            </defs>

            {showPixelGrid && (
              <rect
                x={0}
                y={0}
                width={sourceWidth}
                height={sourceHeight}
                fill="url(#cropPxGrid)"
                pointer-events="none"
              />
            )}

            <rect
              x={0}
              y={0}
              width={sourceWidth}
              height={sourceHeight}
              fill="rgba(0,0,0,0.55)"
              mask="url(#cropHole)"
              style={`cursor: ${viewer.spaceHeld ? 'grab' : 'crosshair'}`}
            />

            {rect && rect.width > 0 && rect.height > 0 && (
              <>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="rgba(255,255,255,0.001)"
                  stroke="white"
                  stroke-width={showPixelGrid ? 1 : STROKE_SCREEN_PX}
                  vector-effect={showPixelGrid ? undefined : 'non-scaling-stroke'}
                  style={`cursor: ${viewer.spaceHeld ? 'grab' : 'move'}`}
                  onPointerDown={onPointerDownRect}
                />
                {CORNER_HANDLES.map((h) => {
                  const pos = handlePos(h, rect);
                  return (
                    <rect
                      key={h}
                      x={pos.x - handleSizeSrc / 2}
                      y={pos.y - handleSizeSrc / 2}
                      width={handleSizeSrc}
                      height={handleSizeSrc}
                      fill="white"
                      stroke="rgba(0,0,0,0.6)"
                      stroke-width={STROKE_SCREEN_PX / 2}
                      vector-effect="non-scaling-stroke"
                      style={`cursor: ${viewer.spaceHeld ? 'grab' : HANDLE_CURSOR[h]}`}
                      onPointerDown={(e) => onPointerDownHandle(h, e)}
                    />
                  );
                })}
                {showEdgeHandles && EDGE_HANDLES.map((h) => {
                  const pos = handlePos(h, rect);
                  return (
                    <rect
                      key={h}
                      x={pos.x - handleSizeSrc / 2}
                      y={pos.y - handleSizeSrc / 2}
                      width={handleSizeSrc}
                      height={handleSizeSrc}
                      fill="white"
                      stroke="rgba(0,0,0,0.6)"
                      stroke-width={STROKE_SCREEN_PX / 2}
                      vector-effect="non-scaling-stroke"
                      style={`cursor: ${viewer.spaceHeld ? 'grab' : HANDLE_CURSOR[h]}`}
                      onPointerDown={(e) => onPointerDownHandle(h, e)}
                    />
                  );
                })}
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Zoom indicator + fit / 100% controls (top-right). stopPropagation
          so a click here doesn't start a crop drag on the SVG behind. */}
      <div
        class="absolute top-3 right-3 flex items-center gap-1 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div class="px-2 py-1 bg-black/60 text-white rounded tabular-nums pointer-events-none">
          {Math.round(effectiveScale * 100)}% · {Math.round(sourceWidth)}×{Math.round(sourceHeight)}
        </div>
        <button
          onClick={viewer.fit}
          disabled={viewer.state.scale === 1 && viewer.state.tx === 0 && viewer.state.ty === 0}
          title="Fit to screen (0)"
          class="px-2 py-1 bg-black/60 hover:bg-black/80 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Fit
        </button>
        <button
          onClick={() => viewer.zoom100(sourceWidth, sourceHeight)}
          disabled={Math.abs(effectiveScale - 1) < 0.001}
          title="Zoom 1:1 (1)"
          class="px-2 py-1 bg-black/60 hover:bg-black/80 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          100%
        </button>
      </div>
    </div>
  );
}

function handlePos(h: HandleId, r: CropRect): { x: number; y: number } {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const left = r.x;
  const top = r.y;
  const right = r.x + r.width;
  const bottom = r.y + r.height;
  switch (h) {
    case 'nw': return { x: left, y: top };
    case 'n': return { x: cx, y: top };
    case 'ne': return { x: right, y: top };
    case 'e': return { x: right, y: cy };
    case 'se': return { x: right, y: bottom };
    case 's': return { x: cx, y: bottom };
    case 'sw': return { x: left, y: bottom };
    case 'w': return { x: left, y: cy };
  }
}
