export type CodecId = 'mozjpeg' | 'webp' | 'avif' | 'jxl' | 'oxipng';

export type OptionDef =
  | {
      kind: 'range';
      key: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      hint?: string;
    }
  | {
      kind: 'checkbox';
      key: string;
      label: string;
      hint?: string;
    }
  | {
      kind: 'select';
      key: string;
      label: string;
      choices: ReadonlyArray<{ label: string; value: string | number }>;
      hint?: string;
    };

export interface CodecMeta {
  id: CodecId;
  name: string;
  outputExt: string;
  outputMime: string;
  defaults: Record<string, unknown>;
  options: ReadonlyArray<OptionDef>;
}

export interface EncodeJob {
  id: number;
  codec: CodecId;
  options: Record<string, unknown>;
  imageData: ImageData;
}

export type EncodeResult =
  | { id: number; ok: true; buffer: ArrayBuffer; msElapsed: number }
  | { id: number; ok: false; error: string };
