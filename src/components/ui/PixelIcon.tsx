import type { VNode } from 'preact';

/**
 * Low-def pixel art authored as an ASCII grid. `rows` are strings of equal
 * length (ragged is tolerated — short rows pad transparent); each character is
 * looked up in `colors`. '.' and ' ' are always transparent.
 */
export interface PixelArt {
  colors: Record<string, string>;
  rows: string[];
}

interface Props {
  art: PixelArt;
  class?: string;
}

const TRANSPARENT = new Set(['.', ' ', '']);

/** Render pixel art to a crisp, vector `<rect>` grid SVG. Consecutive same-
 * colour cells in a row are merged into one rect to keep the node count low;
 * `shape-rendering="crispEdges"` keeps it blocky and seam-free at any size. */
export function PixelIcon({ art, class: className }: Props) {
  const h = art.rows.length;
  const w = art.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const rects: VNode[] = [];

  for (let y = 0; y < h; y++) {
    const row = art.rows[y] ?? '';
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      const fill = TRANSPARENT.has(ch) ? undefined : art.colors[ch];
      if (!fill) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      rects.push(<rect key={`${x},${y}`} x={x} y={y} width={run} height={1} fill={fill} />);
      x += run;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shape-rendering="crispEdges"
      class={className}
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}
