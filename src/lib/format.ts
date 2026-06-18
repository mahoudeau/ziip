const BYTE_UNITS = ['KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** Human-readable byte size. Rolls up through the unit ladder so the number
 * always stays under 1024 (largest shown is "1023.99 PB"), keeping it compact. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < BYTE_UNITS.length - 1) {
    value /= 1024;
    i++;
  }
  // KB to 1 decimal, MB and up to 2.
  return `${value.toFixed(i === 0 ? 1 : 2)} ${BYTE_UNITS[i]!}`;
}

export function formatDeltaPct(bytesIn: number, bytesOut: number): string {
  if (bytesIn === 0) return '—';
  const pct = ((bytesOut - bytesIn) / bytesIn) * 100;
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}
