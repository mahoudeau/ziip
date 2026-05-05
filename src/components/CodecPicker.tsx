import { CODEC_IDS, CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';

interface Props {
  value: CodecId;
  onChange: (codec: CodecId) => void;
}

export function CodecPicker({ value, onChange }: Props) {
  return (
    <div class="grid grid-cols-5 gap-1 bg-zinc-800 rounded-lg p-1">
      {CODEC_IDS.map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          class={`px-2 py-2 text-xs font-medium rounded transition-colors ${
            value === id
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50'
          }`}
        >
          {CODECS[id].name}
        </button>
      ))}
    </div>
  );
}
