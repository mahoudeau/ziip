export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const ASPECT_RATIOS: ReadonlyArray<{ id: string; label: string; ratio: number | null }> = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

export function cropImageData(source: ImageData, rect: CropRect): ImageData {
  const sx = Math.max(0, Math.floor(rect.x));
  const sy = Math.max(0, Math.floor(rect.y));
  const sw = Math.max(1, Math.min(source.width - sx, Math.floor(rect.width)));
  const sh = Math.max(1, Math.min(source.height - sy, Math.floor(rect.height)));

  const dst = new ImageData(sw, sh);
  const src = source.data;
  for (let row = 0; row < sh; row++) {
    const srcStart = ((sy + row) * source.width + sx) * 4;
    const srcEnd = srcStart + sw * 4;
    const dstStart = row * sw * 4;
    dst.data.set(src.subarray(srcStart, srcEnd), dstStart);
  }
  return dst;
}

export function normalizeRect(rect: CropRect): CropRect {
  let { x, y, width, height } = rect;
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function clampRect(rect: CropRect, sourceWidth: number, sourceHeight: number): CropRect {
  const x = Math.max(0, Math.min(sourceWidth - 1, rect.x));
  const y = Math.max(0, Math.min(sourceHeight - 1, rect.y));
  return {
    x,
    y,
    width: Math.max(1, Math.min(sourceWidth - x, rect.width)),
    height: Math.max(1, Math.min(sourceHeight - y, rect.height)),
  };
}

export interface ResizeOpts {
  /** Active aspect ratio (W/H). null/undefined = free. */
  aspectRatio?: number | null;
  /** Shift held — temporarily preserve current rect ratio when free. */
  shiftKey: boolean;
  /** Alt held — resize symmetrically around the rect's center. */
  altKey: boolean;
}

export function applyResize(
  start: CropRect,
  handle: HandleId,
  dx: number,
  dy: number,
  opts: ResizeOpts,
): CropRect {
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;
  const cx = start.x + start.width / 2;
  const cy = start.y + start.height / 2;
  const isCorner = handle.length === 2;

  let targetRatio: number | null = null;
  if (opts.aspectRatio != null) {
    targetRatio = opts.aspectRatio;
  } else if (opts.shiftKey && isCorner && start.width > 0 && start.height > 0) {
    targetRatio = start.width / start.height;
  }

  let effDx = dx;
  let effDy = dy;

  // Corner with ratio constraint: project onto the dominant axis.
  if (targetRatio != null && isCorner) {
    const wSign = handle.includes('e') ? 1 : -1;
    const hSign = handle.includes('s') ? 1 : -1;
    const growW = wSign * dx;
    const growH = hSign * dy;

    if (Math.abs(growW) > Math.abs(growH * targetRatio)) {
      effDx = dx;
      effDy = hSign * (growW / targetRatio);
    } else {
      effDy = dy;
      effDx = wSign * (growH * targetRatio);
    }
  }

  let x = start.x;
  let y = start.y;
  let width = start.width;
  let height = start.height;

  if (handle.includes('w')) {
    x = start.x + effDx;
    width = startRight - x;
  } else if (handle.includes('e')) {
    width = start.width + effDx;
  }
  if (handle.includes('n')) {
    y = start.y + effDy;
    height = startBottom - y;
  } else if (handle.includes('s')) {
    height = start.height + effDy;
  }

  // Alt = double the size delta and recenter on start center.
  if (opts.altKey) {
    width = start.width + 2 * (width - start.width);
    height = start.height + 2 * (height - start.height);
    x = cx - width / 2;
    y = cy - height / 2;
  }

  return { x, y, width, height };
}

/** Apply a ratio constraint to a free-drawn rect during creation. */
export function constrainCreate(
  start: { x: number; y: number },
  dx: number,
  dy: number,
  ratio: number,
): CropRect {
  const wSign = dx >= 0 ? 1 : -1;
  const hSign = dy >= 0 ? 1 : -1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let w: number;
  let h: number;
  if (absDx > absDy * ratio) {
    w = absDx;
    h = absDx / ratio;
  } else {
    h = absDy;
    w = absDy * ratio;
  }
  return { x: start.x, y: start.y, width: w * wSign, height: h * hSign };
}
