import type { CodecMeta, OptionDef } from '../codecs/types';

interface Props {
  meta: CodecMeta;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function CodecOptionsPanel({ meta, values, onChange }: Props) {
  function set(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div class="space-y-5">
      {meta.options.map((opt) => (
        <OptionControl key={opt.key} opt={opt} value={values[opt.key]} onChange={(v) => set(opt.key, v)} />
      ))}
    </div>
  );
}

function OptionControl({
  opt,
  value,
  onChange,
}: {
  opt: OptionDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (opt.kind === 'range') {
    const num = typeof value === 'number' ? value : 0;
    return (
      <div>
        <div class="flex justify-between items-baseline mb-1.5">
          <label class="text-sm font-medium">{opt.label}</label>
          <span class="text-sm tabular-nums text-zinc-300">{num}</span>
        </div>
        <input
          type="range"
          min={opt.min}
          max={opt.max}
          step={opt.step ?? 1}
          value={num}
          onInput={(e) => onChange(parseFloat((e.currentTarget as HTMLInputElement).value))}
          class="w-full accent-zinc-100"
        />
        {opt.hint && <p class="text-xs text-zinc-500 mt-1">{opt.hint}</p>}
      </div>
    );
  }

  if (opt.kind === 'checkbox') {
    return (
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
            class="accent-zinc-100"
          />
          <span class="text-sm font-medium">{opt.label}</span>
        </label>
        {opt.hint && <p class="text-xs text-zinc-500 mt-1 ml-6">{opt.hint}</p>}
      </div>
    );
  }

  // select
  return (
    <div>
      <label class="block text-sm font-medium mb-1.5">{opt.label}</label>
      <select
        value={String(value ?? '')}
        onChange={(e) => {
          const raw = (e.currentTarget as HTMLSelectElement).value;
          const choice = opt.choices.find((c) => String(c.value) === raw);
          if (choice) onChange(choice.value);
        }}
        class="w-full bg-zinc-800 text-zinc-100 text-sm rounded px-2 py-1.5 border border-zinc-700"
      >
        {opt.choices.map((c) => (
          <option key={String(c.value)} value={String(c.value)}>
            {c.label}
          </option>
        ))}
      </select>
      {opt.hint && <p class="text-xs text-zinc-500 mt-1">{opt.hint}</p>}
    </div>
  );
}
