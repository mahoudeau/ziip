import type { CodecId, CodecMeta } from './types';

export const CODECS: Record<CodecId, CodecMeta> = {
  mozjpeg: {
    id: 'mozjpeg',
    name: 'MozJPEG',
    outputExt: 'jpg',
    outputMime: 'image/jpeg',
    defaults: {
      quality: 75,
      progressive: true,
      chroma_subsample: 2,
      trellis_multipass: false,
    },
    options: [
      { kind: 'range', key: 'quality', label: 'Quality', min: 1, max: 100, step: 1 },
      { kind: 'checkbox', key: 'progressive', label: 'Progressive' },
      {
        kind: 'select',
        key: 'chroma_subsample',
        label: 'Chroma subsampling',
        choices: [
          { label: '4:4:4 (no subsample)', value: 1 },
          { label: '4:2:2', value: 2 },
          { label: '4:2:0 (most compression)', value: 3 },
        ],
      },
      {
        kind: 'checkbox',
        key: 'trellis_multipass',
        label: 'Trellis multipass',
        hint: 'Slower, slightly smaller files.',
      },
    ],
  },

  webp: {
    id: 'webp',
    name: 'WebP',
    outputExt: 'webp',
    outputMime: 'image/webp',
    defaults: {
      quality: 75,
      method: 4,
      lossless: 0,
      near_lossless: 100,
    },
    options: [
      { kind: 'range', key: 'quality', label: 'Quality', min: 0, max: 100, step: 1 },
      {
        kind: 'range',
        key: 'method',
        label: 'Effort',
        min: 0,
        max: 6,
        step: 1,
        hint: 'Higher = smaller file, slower encode.',
      },
      { kind: 'checkbox', key: 'lossless', label: 'Lossless' },
      {
        kind: 'range',
        key: 'near_lossless',
        label: 'Near-lossless',
        min: 0,
        max: 100,
        step: 1,
        hint: 'Only used when Lossless is on. 100 = pure lossless.',
      },
    ],
  },

  avif: {
    id: 'avif',
    name: 'AVIF',
    outputExt: 'avif',
    outputMime: 'image/avif',
    defaults: {
      cqLevel: 33,
      speed: 6,
      subsample: 1,
    },
    options: [
      {
        kind: 'range',
        key: 'cqLevel',
        label: 'Quality (cqLevel)',
        min: 0,
        max: 63,
        step: 1,
        hint: '0 = lossless, 63 = worst. Lower is better quality.',
      },
      {
        kind: 'range',
        key: 'speed',
        label: 'Speed',
        min: 0,
        max: 10,
        step: 1,
        hint: 'Higher = faster encode, lower quality at the same cqLevel.',
      },
      {
        kind: 'select',
        key: 'subsample',
        label: 'Chroma subsampling',
        choices: [
          { label: '4:0:0 (mono)', value: 0 },
          { label: '4:2:0', value: 1 },
          { label: '4:2:2', value: 2 },
          { label: '4:4:4', value: 3 },
        ],
      },
    ],
  },

  jxl: {
    id: 'jxl',
    name: 'JPEG XL',
    outputExt: 'jxl',
    outputMime: 'image/jxl',
    defaults: {
      quality: 75,
      effort: 7,
      lossless: false,
    },
    options: [
      {
        kind: 'range',
        key: 'quality',
        label: 'Quality',
        min: 0,
        max: 100,
        step: 1,
        hint: '100 = visually lossless.',
      },
      {
        kind: 'range',
        key: 'effort',
        label: 'Effort',
        min: 1,
        max: 9,
        step: 1,
        hint: 'Higher = smaller file, slower encode.',
      },
      { kind: 'checkbox', key: 'lossless', label: 'Lossless (overrides quality)' },
    ],
  },

  oxipng: {
    id: 'oxipng',
    name: 'OxiPNG',
    outputExt: 'png',
    outputMime: 'image/png',
    defaults: {
      level: 2,
      interlace: false,
    },
    options: [
      {
        kind: 'range',
        key: 'level',
        label: 'Optimization level',
        min: 0,
        max: 6,
        step: 1,
        hint: '0 = fastest, 6 = smallest. Lossless re-optimization.',
      },
      { kind: 'checkbox', key: 'interlace', label: 'Interlace' },
    ],
  },
};

export const CODEC_IDS: ReadonlyArray<CodecId> = ['mozjpeg', 'webp', 'avif', 'jxl', 'oxipng'];
