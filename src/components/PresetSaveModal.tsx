import { useRef, useState } from 'preact/hooks';
import type { CodecId } from '../codecs/types';
import { CODECS } from '../codecs/registry';
import { createPreset, findPresetByName, overwritePreset } from '../state/presets';
import { Modal } from './ui/Modal';

interface Props {
  codec: CodecId;
  options: Record<string, unknown>;
  onClose: () => void;
}

export function PresetSaveModal({ codec, options, onClose }: Props) {
  const [name, setName] = useState('');
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = CODECS[codec];

  function trySave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = findPresetByName(trimmed);
    if (existing && !confirmingOverwrite) {
      setConfirmingOverwrite(true);
      return;
    }
    if (existing) {
      overwritePreset(existing.id, codec, options);
    } else {
      createPreset(trimmed, codec, options);
    }
    onClose();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      trySave();
    }
  }

  return (
    <Modal title="Save preset" onClose={onClose}>
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-zinc-400 mb-1">Name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onInput={(e) => {
              setName((e.currentTarget as HTMLInputElement).value);
              if (confirmingOverwrite) setConfirmingOverwrite(false);
            }}
            onKeyDown={onKeyDown}
            placeholder="Web JPEG q80"
            class="w-full bg-zinc-800 text-zinc-100 text-sm rounded px-3 py-2 border border-zinc-700"
            autofocus
          />
        </div>

        <div class="text-xs text-zinc-400 bg-zinc-950 rounded p-3 border border-zinc-800">
          <div class="font-medium text-zinc-300 mb-1">Saving:</div>
          <div>
            <span class="text-zinc-500">Format:</span> {meta.name} (.{meta.outputExt})
          </div>
          {meta.options.map((opt) => {
            const val = options[opt.key];
            if (val === undefined) return null;
            const display =
              opt.kind === 'select'
                ? opt.choices.find((c) => c.value === val)?.label ?? String(val)
                : opt.kind === 'checkbox'
                ? val ? 'on' : 'off'
                : String(val);
            return (
              <div key={opt.key}>
                <span class="text-zinc-500">{opt.label}:</span> {display}
              </div>
            );
          })}
        </div>

        {confirmingOverwrite && (
          <p class="text-sm text-amber-300">
            A preset with this name already exists. Click Save again to overwrite.
          </p>
        )}

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            class="px-4 py-2 text-sm rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={trySave}
            disabled={!name.trim()}
            class="px-4 py-2 text-sm rounded bg-zinc-100 text-zinc-900 font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {confirmingOverwrite ? 'Overwrite' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
