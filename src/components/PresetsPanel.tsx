import { useEffect, useRef, useState } from 'preact/hooks';
import { CODECS } from '../codecs/registry';
import { deletePreset, presets, renamePreset, setDefaultPreset } from '../state/presets';
import { formatBytes } from '../lib/format';

interface Props {
  /** What to call when the user clicks Apply on a preset. The Editor wires
   * this to "apply to the current image"; the Queue sidebar wires it to
   * "apply to all images". */
  onApply: (presetId: string) => void;
  applyLabel: string;
  /** The preset that's currently active in this context. The panel mounts
   * with this preset pre-expanded so the user can see its details. */
  activePresetId?: string;
  /** The preset that has *already been applied* in this context. When the
   * user clicks Apply on it, the action is a re-run rather than a fresh
   * apply — we relabel and dim the button to make that clear. For Editor:
   * the current image's presetId. For Queue: the preset whose id every
   * image shares. */
  appliedPresetId?: string;
}

export function PresetsPanel({ onApply, applyLabel, activePresetId, appliedPresetId }: Props) {
  const list = presets.value;
  const [expandedId, setExpandedId] = useState<string | null>(activePresetId ?? null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (list.length === 0) {
    return (
      <div class="text-sm text-zinc-400 bg-zinc-950 rounded-lg p-4 border border-dashed border-zinc-800 text-center">
        <p class="font-medium text-zinc-300 mb-1">No presets yet</p>
        <p class="text-xs">
          Tweak settings in any of the format tabs, then click <span class="font-medium">Save current settings as preset</span> at the bottom of the panel.
        </p>
      </div>
    );
  }

  function startRename(id: string, current: string) {
    setRenamingId(id);
    setDraftName(current);
  }

  function commitRename(id: string) {
    const trimmed = draftName.trim();
    if (trimmed) renamePreset(id, trimmed);
    setRenamingId(null);
  }

  return (
    <div class="space-y-1.5">
      {list.map((preset) => {
        const meta = CODECS[preset.codec];
        const expanded = expandedId === preset.id;
        const renaming = renamingId === preset.id;
        const confirming = confirmDeleteId === preset.id;
        return (
          <div key={preset.id} class="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            <div class={`flex items-center gap-2 px-3 py-2 ${renaming ? '' : 'hover:bg-zinc-800/50 transition-colors'}`}>
              {renaming ? (
                <input
                  type="text"
                  value={draftName}
                  onInput={(e) => setDraftName((e.currentTarget as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(preset.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  class="flex-1 min-w-0 bg-zinc-800 text-zinc-100 text-sm font-medium rounded px-2 py-1 border border-zinc-700"
                  autofocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : preset.id)}
                  class="flex-1 min-w-0 text-left text-sm font-medium truncate flex items-center gap-1.5"
                >
                  {preset.isDefault && (
                    <span class="text-amber-300 flex-shrink-0" title="Default for new images" aria-label="Default">
                      ★
                    </span>
                  )}
                  <span class="truncate">{preset.name}</span>
                </button>
              )}
              <span class="text-[10px] font-medium uppercase tracking-wide rounded px-1.5 py-0.5 bg-zinc-800 text-zinc-300 flex-shrink-0">
                {meta.outputExt}
              </span>
              {!renaming && (
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : preset.id)}
                  class="text-zinc-500 hover:text-zinc-200 text-xs flex-shrink-0 px-1"
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? '▾' : '▸'}
                </button>
              )}
            </div>
            {expanded && (
              <div class="px-3 pb-3 pt-1 space-y-3 border-t border-zinc-800">
                <dl class="text-xs space-y-1 tabular-nums">
                  <Row label="Format" value={`${meta.name} (.${meta.outputExt})`} />
                  {meta.options.map((opt) => {
                    const v = preset.options[opt.key];
                    if (v === undefined) return null;
                    let display: string;
                    if (opt.kind === 'select') {
                      display = opt.choices.find((c) => c.value === v)?.label ?? String(v);
                    } else if (opt.kind === 'checkbox') {
                      display = v ? 'on' : 'off';
                    } else {
                      display = String(v);
                    }
                    return <Row key={opt.key} label={opt.label} value={display} />;
                  })}
                  {preset.useCount > 0 && (
                    <Row
                      label="Usage"
                      value={`${preset.useCount}× · saved ${formatBytes(Math.max(0, preset.bytesSaved))}`}
                    />
                  )}
                </dl>

                <label class="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!preset.isDefault}
                    onChange={(e) =>
                      setDefaultPreset((e.currentTarget as HTMLInputElement).checked ? preset.id : null)
                    }
                    class="accent-amber-300"
                  />
                  Default for newly added images
                </label>

                <div class="flex gap-2">
                  {renaming ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitRename(preset.id)}
                        disabled={!draftName.trim()}
                        class="flex-1 px-3 py-1.5 text-sm rounded bg-zinc-100 text-zinc-900 font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        class="px-3 py-1.5 text-sm rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : confirming ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          deletePreset(preset.id);
                          setConfirmDeleteId(null);
                          if (expandedId === preset.id) setExpandedId(null);
                        }}
                        class="flex-1 px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        class="px-3 py-1.5 text-sm rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onApply(preset.id)}
                        class={`flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                          appliedPresetId === preset.id
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                            : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                        }`}
                        title={appliedPresetId === preset.id ? 'Re-encode using this preset' : undefined}
                      >
                        {appliedPresetId === preset.id ? 'Rerun' : applyLabel}
                      </button>
                      <KebabMenu
                        onRename={() => startRename(preset.id, preset.name)}
                        onDelete={() => setConfirmDeleteId(preset.id)}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div class="flex justify-between gap-2">
      <dt class="text-zinc-500">{label}</dt>
      <dd class="text-zinc-300 truncate">{value}</dd>
    </div>
  );
}

function KebabMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} class="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        class="px-2 py-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          class="absolute right-0 bottom-full mb-1 z-10 min-w-[140px] bg-zinc-800 border border-zinc-700 rounded shadow-lg overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
            class="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            class="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
