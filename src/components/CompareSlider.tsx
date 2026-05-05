import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  originalUrl: string;
  encodedUrl: string | null;
  alt: string;
}

export function CompareSlider({ originalUrl, encodedUrl, alt }: Props) {
  const [pos, setPos] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setPos(Math.max(0, Math.min(1, ratio)));
  }

  function onPointerDown(e: PointerEvent) {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  }
  function onPointerMove(e: PointerEvent) {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }
  function onPointerUp(e: PointerEvent) {
    draggingRef.current = false;
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

  // Reset to centered when the encoded image changes — gives the user a
  // natural fresh starting point after switching codecs or options.
  useEffect(() => {
    setPos(0.5);
  }, [encodedUrl]);

  const pct = (pos * 100).toFixed(2);

  return (
    <div
      ref={containerRef}
      class="relative w-full bg-zinc-900 rounded-xl overflow-hidden select-none touch-none"
      style="aspect-ratio: auto"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Compare slider — drag horizontally to reveal encoded image"
    >
      {/* Encoded image as the base layer */}
      <img
        src={encodedUrl ?? originalUrl}
        alt={alt}
        class="block w-full h-auto pointer-events-none"
        draggable={false}
      />

      {/* Original on top, clipped from the right */}
      <img
        src={originalUrl}
        alt={alt}
        class="absolute inset-0 w-full h-auto pointer-events-none"
        style={`clip-path: inset(0 ${100 - parseFloat(pct)}% 0 0)`}
        draggable={false}
      />

      {/* Divider line + handle */}
      <div
        class="absolute top-0 bottom-0 w-px bg-zinc-100 pointer-events-none"
        style={`left: ${pct}%`}
      />
      <div
        class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-100 shadow-lg pointer-events-none flex items-center justify-center"
        style={`left: ${pct}%`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" class="text-zinc-900">
          <path d="M2 7 L5 4 M2 7 L5 10 M12 7 L9 4 M12 7 L9 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
        </svg>
      </div>

      {/* Labels */}
      <div class="absolute top-3 left-3 px-2 py-0.5 text-xs bg-black/60 text-zinc-100 rounded">Original</div>
      <div class="absolute top-3 right-3 px-2 py-0.5 text-xs bg-black/60 text-zinc-100 rounded">Encoded</div>
    </div>
  );
}
