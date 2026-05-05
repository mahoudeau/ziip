import { useEffect, useRef, useState } from 'preact/hooks';
import type { CropRect } from '../lib/crop';
import { clampRect, normalizeRect } from '../lib/crop';

const HANDLE_SCREEN_PX = 12;
const STROKE_SCREEN_PX = 1.5;

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: ReadonlyArray<HandleId> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

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
  onRectChange: (rect: CropRect | null) => void;
}

export function CropTool({ imageUrl, sourceWidth, sourceHeight, rect, onRectChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(r.width / sourceWidth, r.height / sourceHeight);
      if (s > 0 && Number.isFinite(s)) setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sourceWidth, sourceHeight]);

  function clientToSrc(clientX: number, clientY: number): { x: number; y: number } | null {
    const el = containerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const renderedW = sourceWidth * scale;
    const renderedH = sourceHeight * scale;
    const offsetX = (r.width - renderedW) / 2;
    const offsetY = (r.height - renderedH) / 2;
    return { x: (clientX - r.left - offsetX) / scale, y: (clientY - r.top - offsetY) / scale };
  }

  function commit(next: CropRect | null) {
    if (!next) {
      onRectChange(null);
      return;
    }
    onRectChange(clampRect(normalizeRect(next), sourceWidth, sourceHeight));
  }

  function onPointerDownBackground(e: PointerEvent) {
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
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const p = clientToSrc(e.clientX, e.clientY);
    if (!p) return;
    const dx = p.x - drag.startSrcX;
    const dy = p.y - drag.startSrcY;

    let next: CropRect;
    if (drag.mode === 'create') {
      next = { x: drag.startRect.x, y: drag.startRect.y, width: dx, height: dy };
    } else if (drag.mode === 'move') {
      next = {
        x: drag.startRect.x + dx,
        y: drag.startRect.y + dy,
        width: drag.startRect.width,
        height: drag.startRect.height,
      };
    } else {
      next = applyResize(drag.startRect, drag.handle!, dx, dy);
    }
    commit(next);
  }

  function onPointerUp(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (drag.mode === 'create' && rect && (rect.width < 1 || rect.height < 1)) {
      onRectChange(null);
    }
  }

  const handleSizeSrc = HANDLE_SCREEN_PX / scale;
  const strokeSrc = STROKE_SCREEN_PX / scale;

  return (
    <div ref={containerRef} class="relative w-full bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]">
      <img
        src={imageUrl}
        alt=""
        class="max-w-full max-h-full pointer-events-none select-none"
        draggable={false}
      />
      <svg
        viewBox={`0 0 ${sourceWidth} ${sourceHeight}`}
        preserveAspectRatio="xMidYMid meet"
        class="absolute inset-0 w-full h-full touch-none"
        onPointerDown={onPointerDownBackground}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <mask id="cropHole">
            <rect x={0} y={0} width={sourceWidth} height={sourceHeight} fill="white" />
            {rect && rect.width > 0 && rect.height > 0 && (
              <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="black" />
            )}
          </mask>
        </defs>

        <rect
          x={0}
          y={0}
          width={sourceWidth}
          height={sourceHeight}
          fill="rgba(0,0,0,0.55)"
          mask="url(#cropHole)"
          style="cursor: crosshair"
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
              stroke-width={strokeSrc}
              style="cursor: move"
              onPointerDown={onPointerDownRect}
            />
            {HANDLES.map((h) => {
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
                  stroke-width={strokeSrc / 2}
                  style={`cursor: ${HANDLE_CURSOR[h]}`}
                  onPointerDown={(e) => onPointerDownHandle(h, e)}
                />
              );
            })}
          </>
        )}
      </svg>
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

function applyResize(start: CropRect, handle: HandleId, dx: number, dy: number): CropRect {
  let { x, y, width, height } = start;
  const right = x + width;
  const bottom = y + height;
  if (handle.includes('w')) {
    x = start.x + dx;
    width = right - x;
  }
  if (handle.includes('e')) {
    width = start.width + dx;
  }
  if (handle.includes('n')) {
    y = start.y + dy;
    height = bottom - y;
  }
  if (handle.includes('s')) {
    height = start.height + dy;
  }
  return { x, y, width, height };
}
