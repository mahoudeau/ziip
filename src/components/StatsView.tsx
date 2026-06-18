import { useState } from 'preact/hooks';
import { stats, clearStats } from '../state/stats';
import { presets } from '../state/presets';
import { CODECS, CODEC_IDS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { formatBytes, formatDeltaPct } from '../lib/format';
import { pickComparison, formatMultiple } from '../lib/compare';
import { iconForId } from '../lib/refIcons';

type SortKey = 'name' | 'codec' | 'useCount' | 'bytesSaved' | 'avgPct' | 'lastUsed';

/** Distinct hue per codec, shared by the donut and the bars. */
const FORMAT_COLORS: Record<CodecId, string> = {
  mozjpeg: '#f59e0b',
  webp: '#10b981',
  avif: '#6c5ce7',
  jxl: '#0ea5e9',
  oxipng: '#f43f5e',
};

export function StatsView({ asPage = false }: { asPage?: boolean } = {}) {
  const s = stats.value;
  const ps = presets.value;
  const [sortKey, setSortKey] = useState<SortKey>('useCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Rolled once per dashboard mount so the card and the strip agree, and a
  // fresh reference appears each time you open the dashboard.
  const shown = useState(() => pickComparison(Math.max(0, s.totalBytesSaved)))[0];
  const shownIcon = shown ? iconForId(shown.id) : undefined;
  const mostUsedPreset = [...ps].sort((a, b) => b.useCount - a.useCount)[0];
  const mostUsedFormat = CODEC_IDS.map((id) => ({ id, ...s.byFormat[id] }))
    .sort((a, b) => b.count - a.count)
    .find((f) => f.count > 0);

  const formatEntries = CODEC_IDS
    .map((id) => ({
      id,
      label: CODECS[id].name,
      ext: CODECS[id].outputExt,
      count: s.byFormat[id].count,
      bytesIn: s.byFormat[id].bytesIn,
      bytesOut: s.byFormat[id].bytesOut,
      saved: s.byFormat[id].bytesIn - s.byFormat[id].bytesOut,
    }))
    .filter((e) => e.count > 0);
  const maxCount = formatEntries.reduce((m, e) => Math.max(m, e.count), 0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortedPresets = [...ps].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sortKey) {
      case 'name':
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
        break;
      case 'codec':
        av = a.codec;
        bv = b.codec;
        break;
      case 'useCount':
        av = a.useCount;
        bv = b.useCount;
        break;
      case 'bytesSaved':
        av = a.bytesSaved;
        bv = b.bytesSaved;
        break;
      case 'avgPct':
        av = a.useCount > 0 && a.bytesIn > 0 ? (a.bytesIn - a.bytesOut) / a.bytesIn : 0;
        bv = b.useCount > 0 && b.bytesIn > 0 ? (b.bytesIn - b.bytesOut) / b.bytesIn : 0;
        break;
      case 'lastUsed':
        av = a.updatedAt;
        bv = b.updatedAt;
        break;
    }
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cards = (
    <>
      <Card label="Compressions" value={String(s.totalCompressions)} />
      <Card
        label="Bytes saved"
        value={formatBytes(Math.max(0, s.totalBytesSaved))}
        sub={s.totalCompressions > 0 ? `≈ ${formatBytes(Math.max(0, s.totalBytesSaved) / s.totalCompressions)} per image` : undefined}
      />
      <Card
        label="Total processed"
        value={formatBytes(s.totalBytesIn)}
        sub={`→ ${formatBytes(s.totalBytesOut)}`}
      />
      <Card
        label="Most-used"
        value={mostUsedPreset ? mostUsedPreset.name : mostUsedFormat ? CODECS[mostUsedFormat.id].name : '—'}
        sub={mostUsedPreset ? `${mostUsedPreset.useCount}× preset` : mostUsedFormat ? `${mostUsedFormat.count}× format` : undefined}
      />
    </>
  );

  return (
    <div class="px-6 lg:px-8 pb-6 max-w-7xl mx-auto">
      <header class="flex items-center justify-between mb-5">
        {asPage ? (
          <h1 class="text-2xl font-display font-semibold tracking-tight">Dashboard</h1>
        ) : (
          <h2 class="text-2xl font-display font-semibold tracking-tight">Dashboard</h2>
        )}
        {s.totalCompressions > 0 &&
          (confirmingClear ? (
            <div class="flex items-center gap-2">
              <button
                autofocus
                class="px-3 py-1.5 text-xs rounded bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
                onClick={() => {
                  clearStats();
                  setConfirmingClear(false);
                }}
              >
                Confirm reset
              </button>
              <button
                class="px-3 py-1.5 text-xs text-faint hover:text-ink transition-colors"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              class="px-3 py-1.5 text-xs text-faint hover:text-red-600 transition-colors"
              onClick={() => setConfirmingClear(true)}
            >
              Reset stats…
            </button>
          ))}
      </header>

      {s.totalCompressions === 0 ? (
        <div class="bg-surface rounded-2xl p-12 text-center shadow-sm">
          <p class="text-ink font-medium mb-2">No compressions yet</p>
          <p class="text-sm text-faint">Drop and compress some images to see your stats here.</p>
        </div>
      ) : (
        <div class="space-y-5">
          {/* Full-width brand hero with the 2×2 stat cards nested on the right */}
          {shown ? (
            <section class="relative rounded-2xl p-6 shadow-sm text-white bg-gradient-to-br from-brand to-brand-strong">
              {/* Header floats top-left on desktop (out of flow) so it doesn't
                  shift the vertical centering of the content below it. */}
              <h3 class="text-xs font-semibold uppercase tracking-wide text-white/70 mb-4 lg:mb-0 lg:absolute lg:top-6 lg:left-6">
                In real-world terms
              </h3>
              <div class="grid lg:grid-cols-2 gap-6 items-center">
                {/* Hero content — vertically centered, ignoring the title */}
                <div class="flex items-center gap-5">
                  {/* Icon display case: mapped icon when present, emoji fallback otherwise. */}
                  <div
                    class="shrink-0 grid place-items-center w-20 h-20 rounded-2xl bg-white ring-1 ring-black/5 shadow-lg text-5xl leading-none overflow-hidden"
                    aria-hidden="true"
                  >
                    {shownIcon ? <img src={shownIcon} alt="" class="w-14 h-14 object-contain" /> : shown.icon}
                  </div>
                  <div class="min-w-0">
                    <p class="text-6xl font-display font-bold tabular-nums leading-none">
                      {formatMultiple(shown.multiple)}×
                    </p>
                    <p class="mt-2.5">
                      <span class="font-semibold">{shown.label}</span>
                      <span class="text-white/70"> of data saved</span>
                    </p>
                  </div>
                </div>
                {/* 2×2 stat cards nested on the right */}
                <div class="grid grid-cols-2 gap-3">{cards}</div>
              </div>
            </section>
          ) : (
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards}</div>
          )}

          {/* Format breakdown: donut + bars */}
          <section class="bg-surface rounded-2xl p-5 shadow-sm">
            <h3 class="text-sm font-semibold mb-4 text-muted">Format breakdown</h3>
            <div class="flex flex-col sm:flex-row items-center gap-6">
              <div class="relative shrink-0">
                <FormatDonut entries={formatEntries} />
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-2xl font-bold tabular-nums leading-none">{s.totalCompressions}</span>
                  <span class="text-[10px] uppercase tracking-wide text-faint mt-0.5">files</span>
                </div>
              </div>
              <div class="flex-1 w-full space-y-2.5">
                {formatEntries.map((e) => (
                  <div key={e.id} class="flex items-center gap-3">
                    <span class="w-24 shrink-0 leading-tight">
                      <span class="font-bold uppercase text-xs" style={`color:${FORMAT_COLORS[e.id]}`}>{e.ext}</span>
                      <span class="block text-[10px] text-faint">{e.label}</span>
                    </span>
                    <div class="flex-1 bg-bg rounded-full h-3 overflow-hidden">
                      <div
                        class="h-full rounded-full"
                        style={`width:${(e.count / maxCount) * 100}%;background:${FORMAT_COLORS[e.id]}`}
                      />
                    </div>
                    <span class="w-32 shrink-0 text-right text-xs text-muted tabular-nums">
                      {e.count} · {e.saved >= 0 ? `saved ${formatBytes(e.saved)}` : `grew ${formatBytes(-e.saved)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Per-preset table */}
          {ps.length > 0 && (
            <section class="bg-surface rounded-2xl p-5 shadow-sm">
              <h3 class="text-sm font-semibold mb-4 text-muted">Presets</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                      <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onClick={() => toggleSort('name')} />
                      <Th label="Format" sortKey="codec" current={sortKey} dir={sortDir} onClick={() => toggleSort('codec')} />
                      <Th label="Uses" sortKey="useCount" current={sortKey} dir={sortDir} onClick={() => toggleSort('useCount')} align="right" />
                      <Th label="Saved" sortKey="bytesSaved" current={sortKey} dir={sortDir} onClick={() => toggleSort('bytesSaved')} align="right" />
                      <Th label="Avg %" sortKey="avgPct" current={sortKey} dir={sortDir} onClick={() => toggleSort('avgPct')} align="right" />
                      <Th label="Updated" sortKey="lastUsed" current={sortKey} dir={sortDir} onClick={() => toggleSort('lastUsed')} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPresets.map((p) => {
                      const m = CODECS[p.codec];
                      return (
                        <tr key={p.id} class="border-b border-border/50 last:border-b-0">
                          <td class="py-2 pr-3">
                            {p.isDefault && <span class="text-amber-600 mr-1.5" title="Default for new images">★</span>}
                            <span class="font-medium">{p.name}</span>
                          </td>
                          <td class="py-2 pr-3 text-muted">{m.name}</td>
                          <td class="py-2 pr-3 text-right tabular-nums">{p.useCount}</td>
                          <td class="py-2 pr-3 text-right tabular-nums">
                            {p.useCount > 0 ? formatBytes(Math.max(0, p.bytesSaved)) : '—'}
                          </td>
                          <td class="py-2 pr-3 text-right tabular-nums text-muted">
                            {p.useCount > 0 && p.bytesIn > 0 ? formatDeltaPct(p.bytesIn, p.bytesOut) : '—'}
                          </td>
                          <td class="py-2 text-right text-xs text-faint">
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function FormatDonut({
  entries,
}: {
  entries: ReadonlyArray<{ id: CodecId; count: number }>;
}) {
  const total = entries.reduce((sum, e) => sum + e.count, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" class="w-32 h-32 -rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#ece8df" stroke-width="16" />
      {entries.map((e) => {
        const len = (e.count / total) * c;
        const seg = (
          <circle
            key={e.id}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={FORMAT_COLORS[e.id]}
            stroke-width="16"
            stroke-dasharray={`${len} ${c - len}`}
            stroke-dashoffset={-offset}
          />
        );
        offset += len;
        return seg;
      })}
    </svg>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div class="bg-surface rounded-2xl p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-faint font-medium">{label}</p>
      <p class="text-2xl font-bold tracking-tight mt-1 truncate text-ink" title={value}>{value}</p>
      {sub && <p class="text-xs text-muted mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Th({
  label,
  sortKey,
  current,
  dir,
  onClick,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  const active = current === sortKey;
  return (
    <th class={`py-2 pr-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={onClick}
        class={`inline-flex items-center gap-1 hover:text-ink transition-colors ${active ? 'text-ink' : ''}`}
      >
        {label}
        {active && <span class="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}
