import { useState } from 'preact/hooks';
import { stats, clearStats } from '../state/stats';
import { presets } from '../state/presets';
import { CODECS, CODEC_IDS } from '../codecs/registry';
import { formatBytes, formatDeltaPct } from '../lib/format';
import { formatComparison } from '../lib/compare';

interface Props {
  onClose: () => void;
}

type SortKey = 'name' | 'codec' | 'useCount' | 'bytesSaved' | 'avgPct' | 'lastUsed';

export function StatsView({ onClose }: Props) {
  const s = stats.value;
  const ps = presets.value;
  const [sortKey, setSortKey] = useState<SortKey>('useCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const realWorld = formatComparison(Math.max(0, s.totalBytesSaved));
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

  return (
    <div class="px-6 lg:px-8 pt-2 pb-6 max-w-7xl mx-auto">
      <header class="flex items-center justify-between mb-6">
        <button
          class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          onClick={onClose}
        >
          ← Back
        </button>
        {s.totalCompressions > 0 && (
          confirmingClear ? (
            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 text-xs rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                onClick={() => {
                  clearStats();
                  setConfirmingClear(false);
                }}
              >
                Confirm reset
              </button>
              <button
                class="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              class="px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
              onClick={() => setConfirmingClear(true)}
            >
              Reset stats…
            </button>
          )
        )}
      </header>

      <h1 class="text-2xl font-bold tracking-tight mb-6">Stats</h1>

      {s.totalCompressions === 0 ? (
        <div class="bg-zinc-900 rounded-xl p-12 text-center">
          <p class="text-zinc-300 font-medium mb-2">No compressions yet</p>
          <p class="text-sm text-zinc-500">Drop some images and compress them to populate the dashboard.</p>
        </div>
      ) : (
        <div class="space-y-6">
          {/* Top cards */}
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card label="Compressions" value={String(s.totalCompressions)} />
            <Card
              label="Bytes saved"
              value={formatBytes(Math.max(0, s.totalBytesSaved))}
              sub={realWorld ?? undefined}
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
          </div>

          {/* Format breakdown chart */}
          <section class="bg-zinc-900 rounded-xl p-5">
            <h2 class="text-sm font-semibold mb-4 text-zinc-300">Format breakdown</h2>
            <div class="space-y-2">
              {formatEntries.map((e) => (
                <div key={e.id} class="flex items-center gap-3">
                  <span class="w-20 text-xs text-zinc-400">
                    <span class="font-bold uppercase text-zinc-200">{e.ext}</span>
                    <span class="block text-[10px] opacity-70">{e.label}</span>
                  </span>
                  <div class="flex-1 bg-zinc-950 rounded h-5 relative overflow-hidden">
                    <div
                      class="bg-zinc-100 h-full"
                      style={`width: ${(e.count / maxCount) * 100}%`}
                    />
                    <span class="absolute inset-0 flex items-center px-2 text-[10px] font-medium tabular-nums text-zinc-500 mix-blend-difference">
                      {e.count} · saved {formatBytes(Math.max(0, e.saved))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Per-preset table */}
          {ps.length > 0 && (
            <section class="bg-zinc-900 rounded-xl p-5">
              <h2 class="text-sm font-semibold mb-4 text-zinc-300">Presets</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
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
                        <tr key={p.id} class="border-b border-zinc-800/50 last:border-b-0">
                          <td class="py-2 pr-3">
                            {p.isDefault && <span class="text-amber-300 mr-1.5" title="Default for new images">★</span>}
                            <span class="font-medium">{p.name}</span>
                          </td>
                          <td class="py-2 pr-3 text-zinc-400">{m.name}</td>
                          <td class="py-2 pr-3 text-right tabular-nums">{p.useCount}</td>
                          <td class="py-2 pr-3 text-right tabular-nums">
                            {p.useCount > 0 ? formatBytes(Math.max(0, p.bytesSaved)) : '—'}
                          </td>
                          <td class="py-2 pr-3 text-right tabular-nums text-zinc-400">
                            {p.useCount > 0 && p.bytesIn > 0
                              ? formatDeltaPct(p.bytesIn, p.bytesOut)
                              : '—'}
                          </td>
                          <td class="py-2 text-right text-xs text-zinc-500">
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

          {/* Real-world strip */}
          {realWorld && (
            <section class="bg-zinc-900 rounded-xl p-5">
              <h2 class="text-sm font-semibold mb-2 text-zinc-300">In real-world terms</h2>
              <p class="text-zinc-300">
                You've saved{' '}
                <span class="text-2xl font-bold text-amber-300 tabular-nums">{realWorld}</span>
                {' '}of data.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div class="bg-zinc-900 rounded-xl p-4">
      <p class="text-xs uppercase tracking-wide text-zinc-500 font-medium">{label}</p>
      <p class="text-2xl font-bold tracking-tight mt-1 truncate" title={value}>{value}</p>
      {sub && <p class="text-xs text-zinc-400 mt-1 truncate">{sub}</p>}
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
        class={`inline-flex items-center gap-1 hover:text-zinc-200 transition-colors ${active ? 'text-zinc-200' : ''}`}
      >
        {label}
        {active && <span class="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}
