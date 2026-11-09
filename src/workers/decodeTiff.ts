import UTIF from 'utif2';

type TiffPage = ReturnType<typeof UTIF.decode>[number];

export interface DecodedTiff {
  imageData: ImageData;
  /** Set when the file holds more pages than the one we imported. */
  notice?: string;
}

/** Compression schemes utif2 decodes for ordinary images. Anything else only
 * logs a warning and leaves a zero-filled buffer, which reads as solid black. */
const COMPRESSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 32773, 32809, 32946, 34676]);

function tag(page: TiffPage, name: string): number | undefined {
  return (page[name] as number[] | undefined)?.[0];
}

/**
 * Validate the header and walk the page chain before utif2 sees the file. Its
 * own walk is an unguarded `while (true)`, so a next-page pointer aiming back
 * at an earlier page would hang the worker. A bad pointer after a valid page is
 * cut (we own this buffer), so the pages before it still import.
 */
function sanitizePageChain(buffer: ArrayBuffer): void {
  const corrupt = new Error('This TIFF is corrupt.');
  if (buffer.byteLength < 8) throw corrupt;
  const view = new DataView(buffer);
  const order = view.getUint16(0);
  if (order !== 0x4949 && order !== 0x4d4d) throw corrupt;
  const le = order === 0x4949;
  const version = view.getUint16(2, le);
  if (version === 43) throw new Error('BigTIFF files are not supported.');
  if (version !== 42) throw corrupt;

  const seen = new Set<number>();
  let linkAt = 4;
  for (;;) {
    const offset = view.getUint32(linkAt, le);
    if (offset === 0) return;
    const entries = offset + 2 <= buffer.byteLength ? view.getUint16(offset, le) : -1;
    const nextLink = offset + 2 + entries * 12;
    if (entries < 0 || nextLink + 4 > buffer.byteLength || seen.has(offset)) {
      if (seen.size === 0) throw corrupt;
      view.setUint32(linkAt, 0, le);
      return;
    }
    seen.add(offset);
    linkAt = nextLink;
  }
}

function hasPixels(p: TiffPage): boolean {
  return p.t256 != null && (p.t273 != null || p.t324 != null);
}

/** NewSubfileType bit 0 flags a reduced-resolution copy, like a thumbnail. */
function isReduced(p: TiffPage): boolean {
  return ((tag(p, 't254') ?? 0) & 1) === 1;
}

function largest(pages: TiffPage[]): TiffPage | undefined {
  const area = (p: TiffPage) => (tag(p, 't256') ?? 0) * (tag(p, 't257') ?? 0);
  return pages.reduce<TiffPage | undefined>((a, b) => (a && area(a) >= area(b) ? a : b), undefined);
}

/** The largest full-resolution image of the first real page, looking inside
 * SubIFDs too: some files keep a preview at the top level and the full image
 * underneath it. Also counts the real pages. */
function pickFirstPage(tops: TiffPage[]): { page?: TiffPage; pageCount: number } {
  const groups = tops.map((top) =>
    [top, ...((top.subIFD as unknown as TiffPage[] | undefined) ?? [])].filter(hasPixels),
  );
  const full = groups.map((g) => g.filter((p) => !isReduced(p))).filter((g) => g.length > 0);
  return { page: largest(full[0] ?? groups.flat()), pageCount: full.length };
}

/** Whether `UTIF.toRGBA8` has a working branch for this layout. The ones it
 * lacks come back as all zeros (or misaligned), not as an error. */
function canConvert(photometric: number, bits: number, samples: number, format: number): boolean {
  const float = format === 3;
  if (format !== 1 && !float) return false;
  if (float && bits !== 32) return false;
  if (bits === 32 && !float) return false;
  switch (photometric) {
    case 0:
      return samples === 1 && [1, 4, 8, 16].includes(bits);
    case 1:
      return bits === 8 || (samples === 1 && [1, 2, 16, 32].includes(bits));
    case 2:
      if (bits === 8) return samples === 1 || samples >= 3;
      return (bits === 16 || bits === 32) && (samples === 3 || samples === 4);
    case 3:
      return [1, 2, 4, 8].includes(bits);
    case 5:
      return bits === 8 && samples >= 4;
    case 32845:
      return true;
    default:
      return false;
  }
}

/** Read the layout the same way `toRGBA8` will and reject what it can't handle. */
function readLayout(page: TiffPage): { photometric: number; samples: number } {
  const depths = (page.t258 as number[] | undefined) ?? [1];
  const bits = depths[0] ?? 1;
  const photometric = tag(page, 't262') ?? (bits === 1 ? 0 : 2);
  const samples = tag(page, 't277') ?? depths.length;
  const format = tag(page, 't339') ?? 1;
  const predictor = tag(page, 't317') ?? 1;
  const uniform = depths.every((d) => d === bits);
  // utif2 applies predictor 2 per byte, which only works up to 16 bits.
  const predictable = predictor === 1 || (predictor === 2 && bits <= 16);
  if (!uniform || !predictable || !canConvert(photometric, bits, samples, format)) {
    throw new Error(`Unsupported TIFF format (${bits}-bit, color mode ${photometric}).`);
  }
  return { photometric, samples };
}

/** `toRGBA8` reads `window.UDOC` on its CMYK path, and workers have no `window`.
 * The alias lives only for this synchronous call so it can't change how the
 * Emscripten codecs in this worker detect their environment. */
function toRgba(page: TiffPage): Uint8Array {
  const scope = globalThis as { window?: unknown };
  const aliased = scope.window === undefined;
  if (aliased) scope.window = globalThis;
  try {
    return UTIF.toRGBA8(page);
  } finally {
    if (aliased) delete scope.window;
  }
}

/** `toRGBA8` copies any extra channel straight into alpha. ExtraSamples says
 * what it really is: 2 is straight alpha, 1 is premultiplied, and anything else
 * (a mask, a spot color) isn't transparency at all. */
function fixExtraChannel(rgba: Uint8Array, page: TiffPage, photometric: number, samples: number): void {
  const colorChannels = photometric === 5 ? 4 : 3;
  if ((photometric !== 2 && photometric !== 5) || samples <= colorChannels) return;
  const kind = tag(page, 't338') ?? 0;
  if (kind === 2) return;
  for (let i = 0; i < rgba.length; i += 4) {
    if (kind !== 1) {
      rgba[i + 3] = 255;
      continue;
    }
    const alpha = rgba[i + 3]!;
    if (alpha === 0 || alpha === 255) continue;
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round((rgba[i + c]! * 255) / alpha));
  }
}

function iccProfile(page: TiffPage): Uint8Array | undefined {
  const raw = page.t34675 as ArrayLike<number> | undefined;
  return raw && raw.length >= 132 ? Uint8Array.from(raw) : undefined;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function isRgbProfile(icc: Uint8Array): boolean {
  return ascii(icc, 16, 4) === 'RGB ';
}

/** True when the profile's description names sRGB, so its pixels are already
 * what we want. The description is ASCII or UTF-16, hence dropping the NULs. */
function isSrgbProfile(icc: Uint8Array): boolean {
  const view = new DataView(icc.buffer, icc.byteOffset, icc.byteLength);
  const count = view.getUint32(128);
  for (let i = 0; i < count && 132 + (i + 1) * 12 <= icc.length; i++) {
    const entry = 132 + i * 12;
    if (ascii(icc, entry, 4) !== 'desc') continue;
    const text = ascii(icc, view.getUint32(entry + 4), Math.min(view.getUint32(entry + 8), 512));
    return /srgb/i.test(text.replaceAll('\0', ''));
  }
  return false;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  let crc = ~0;
  for (let i = 4; i < 8 + data.length; i++) crc = CRC_TABLE[(crc ^ chunk[i]!) & 255]! ^ (crc >>> 8);
  view.setUint32(8 + data.length, ~crc >>> 0);
  return chunk;
}

/** A zlib stream of stored (uncompressed) blocks: this PNG only lives long
 * enough to be decoded, so spending time deflating it would be wasted. */
function zlibStored(data: Uint8Array): Uint8Array {
  const BLOCK = 65535;
  const blocks = Math.max(1, Math.ceil(data.length / BLOCK));
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let at = 2;
  for (let b = 0; b < blocks; b++) {
    const start = b * BLOCK;
    const size = Math.min(BLOCK, data.length - start);
    out[at] = b === blocks - 1 ? 1 : 0;
    out[at + 1] = size & 255;
    out[at + 2] = size >>> 8;
    out[at + 3] = ~size & 255;
    out[at + 4] = (~size >>> 8) & 255;
    out.set(data.subarray(start, start + size), at + 5);
    at += 5 + size;
  }
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < data.length; ) {
    // 5552 is the most bytes that can be summed before s2 could overflow.
    const end = Math.min(i + 5552, data.length);
    for (; i < end; i++) {
      s1 += data[i]!;
      s2 += s1;
    }
    s1 %= 65521;
    s2 %= 65521;
  }
  new DataView(out.buffer).setUint32(at, ((s2 << 16) | s1) >>> 0);
  return out;
}

/** Wrap RGBA pixels and their ICC profile in a PNG, the one container that lets
 * the browser's own color management convert them to sRGB for us. */
function rgbaToTaggedPng(rgba: Uint8Array, width: number, height: number, icc: Uint8Array): Blob {
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA

  const compressedIcc = zlibStored(icc);
  const iccChunk = new Uint8Array(5 + compressedIcc.length);
  iccChunk.set([0x69, 0x63, 0x63, 0, 0]); // the name "icc", NUL, compression 0
  iccChunk.set(compressedIcc, 5);

  const stride = width * 4;
  const scanlines = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    scanlines.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [
    signature,
    pngChunk('IHDR', header),
    pngChunk('iCCP', iccChunk),
    pngChunk('IDAT', zlibStored(scanlines)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  return new Blob(parts as BlobPart[], { type: 'image/png' });
}

/** Rotate or flip per the Orientation tag (EXIF numbering), since utif2 returns
 * the stored order and the exports carry no metadata to correct it later. */
function applyOrientation(image: ImageData, orientation: number): ImageData {
  if (orientation < 2 || orientation > 8) return image;
  const { width: w, height: h } = image;
  const swaps = orientation >= 5;
  const outW = swaps ? h : w;
  const outH = swaps ? w : h;
  const src = new Uint32Array(image.data.buffer);
  const out = new Uint32Array(outW * outH);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx = x;
      let dy = y;
      if (orientation === 2) dx = w - 1 - x;
      else if (orientation === 3) (dx = w - 1 - x), (dy = h - 1 - y);
      else if (orientation === 4) dy = h - 1 - y;
      else if (orientation === 5) (dx = y), (dy = x);
      else if (orientation === 6) (dx = h - 1 - y), (dy = x);
      else if (orientation === 7) (dx = h - 1 - y), (dy = w - 1 - x);
      else if (orientation === 8) (dx = y), (dy = w - 1 - x);
      out[dy * outW + dx] = src[y * w + x]!;
    }
  }
  return new ImageData(new Uint8ClampedArray(out.buffer), outW, outH);
}

async function decodePage(
  buffer: ArrayBuffer,
  page: TiffPage,
  pages: TiffPage[],
  decodeBlob: (blob: Blob) => Promise<ImageData>,
): Promise<ImageData> {
  if (tag(page, 't284') === 2 && (tag(page, 't277') ?? 1) > 1) {
    // utif2 reads planar data as if it were interleaved and returns garbage.
    throw new Error('Planar TIFFs are not supported.');
  }
  const compression = tag(page, 't259') ?? 1;
  if (!COMPRESSIONS.has(compression)) {
    throw new Error(`Unsupported TIFF compression (${compression}).`);
  }
  // The third argument exists in the source but is missing from the typings.
  (UTIF.decodeImage as (b: ArrayBuffer, p: TiffPage, all: TiffPage[]) => void)(buffer, page, pages);
  if (!page.data?.length) throw new Error('This TIFF has no readable image data.');

  // After decoding, because the JPEG paths rewrite YCbCr pages to RGB.
  const { photometric, samples } = readLayout(page);
  const rgba = toRgba(page);
  fixExtraChannel(rgba, page, photometric, samples);

  const icc = iccProfile(page);
  if (icc && photometric === 2 && isRgbProfile(icc) && !isSrgbProfile(icc)) {
    return decodeBlob(rgbaToTaggedPng(rgba, page.width, page.height, icc));
  }
  return new ImageData(new Uint8ClampedArray(rgba.buffer as ArrayBuffer), page.width, page.height);
}

export async function decodeTiff(
  file: File,
  decodeBlob: (blob: Blob) => Promise<ImageData>,
): Promise<DecodedTiff> {
  const buffer = await file.arrayBuffer();
  try {
    sanitizePageChain(buffer);
    const pages = UTIF.decode(buffer);
    const { page, pageCount } = pickFirstPage(pages);
    if (!page) throw new Error('No image found in this TIFF.');
    const decoded = await decodePage(buffer, page, pages, decodeBlob);
    return {
      imageData: applyOrientation(decoded, tag(page, 't274') ?? 1),
      notice: pageCount > 1 ? `First page only, this TIFF has ${pageCount}.` : undefined,
    };
  } catch (err) {
    // utif2 throws bare strings and numbers for variants it can't handle.
    throw err instanceof Error ? err : new Error(`Unsupported TIFF variant (${String(err)}).`);
  }
}
