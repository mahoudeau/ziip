import type { Route } from '../state/route';

interface PageMeta {
  title: string;
  description: string;
  /** Dashboard shows private, per-device data — keep it out of search indexes. */
  noindex?: boolean;
}

/** Per-route title + description. Mirrors the static defaults in index.html
 * (which social crawlers read); this runs client-side for the browser tab and
 * for Googlebot, which executes JS. */
const ROUTE_META: Record<Route, PageMeta> = {
  home: {
    title: 'Ziip: private image compressor and HEIC to JPG converter',
    description:
      'Compress and convert images in your browser, including iPhone HEIC photos to JPG, WebP and AVIF. Images never leave your device. No uploads, no tracking.',
  },
  dashboard: {
    title: 'Dashboard · Ziip',
    description:
      'Your local compression stats: total saved, formats used and presets. Computed on your device and never shared.',
    noindex: true,
  },
  privacy: {
    title: 'Privacy · Ziip',
    description:
      'Ziip is private by design. Images are compressed entirely on your device. Nothing is uploaded, and there is no server to upload to.',
  },
  about: {
    title: 'About · Ziip',
    description:
      'Ziip is a fast, private image compressor in your browser. Convert iPhone HEIC/HEIF photos to JPG, plus WebP, AVIF, JPEG XL and PNG, with no uploads or tracking.',
  },
};

function setMetaContent(name: string, content: string): void {
  const el = document.head.querySelector(`meta[name="${name}"]`);
  if (el) el.setAttribute('content', content);
}

/** Update document title, description, and robots directive for the route. */
export function applyRouteMeta(route: Route): void {
  const meta = ROUTE_META[route];
  document.title = meta.title;
  setMetaContent('description', meta.description);
  setMetaContent('robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
}
