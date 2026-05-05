export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
