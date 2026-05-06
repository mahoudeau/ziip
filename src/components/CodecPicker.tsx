import { CODEC_IDS, CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';

interface Props {
  /** Active codec — highlighted when `showingPresets` is false. */
  value: CodecId;
  /** When true, the "Presets" tab is highlighted instead of any codec. */
  showingPresets: boolean;
  onSelectCodec: (codec: CodecId) => void;
  onSelectPresets: () => void;
}

export function CodecPicker({ value, showingPresets, onSelectCodec, onSelectPresets }: Props) {
  return (
    <div class="grid grid-cols-6 gap-1 bg-zinc-800 rounded-lg p-1">
      {CODEC_IDS.map((id) => {
        const meta = CODECS[id];
        const active = !showingPresets && value === id;
        return (
          <button
            key={id}
            onClick={() => onSelectCodec(id)}
            class={`px-1 py-2 rounded transition-colors flex flex-col items-center leading-tight ${
              active
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50'
            }`}
          >
            <span class="text-sm font-bold uppercase">{meta.outputExt}</span>
            <span class={`text-[10px] mt-0.5 whitespace-nowrap ${active ? 'text-zinc-500' : 'opacity-70'}`}>
              {meta.name}
            </span>
          </button>
        );
      })}
      <button
        key="presets"
        onClick={onSelectPresets}
        class={`px-1 py-2 rounded transition-colors flex flex-col items-center leading-tight ${
          showingPresets
            ? 'bg-zinc-100 text-zinc-900'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50'
        }`}
      >
        <span class="text-sm font-bold uppercase">Saved</span>
        <span class={`text-[10px] mt-0.5 whitespace-nowrap ${showingPresets ? 'text-zinc-500' : 'opacity-70'}`}>
          Presets
        </span>
      </button>
    </div>
  );
}
