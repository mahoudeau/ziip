# Ziip

Local, browser-only image compression. All compression runs locally in your
browser via WebAssembly — no backend, no uploads, no analytics. Files never
leave your device.

Drop in N images, pick a codec (MozJPEG, WebP, AVIF, JPEG XL, OxiPNG), tune
options, optionally crop with pixel-precise rectangles, and download
individually or as a zip. Reusable presets remember your favorite settings
and track how much space they've saved.

## Run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints (defaults to `http://localhost:5173`).

Requires Node 20+.

## Build

| Command | Output |
|---|---|
| `npm run build` | Production build, asset paths rooted at `/`. |
| `npm run build:lab` | Lab build, asset paths rooted at `/ziip/` for the `lab.mathieu.dev/ziip` deploy. |
| `npm run typecheck` | TypeScript check, no emit. |
| `npm run preview` | Serve the last `npm run build` output locally. |

## Deploy

Production (`ziip.mathieu.dev`) auto-deploys from `main` via Cloudflare
Pages — no manual step required. To host your own copy, point any static
host (Cloudflare Pages, Netlify, GitHub Pages, plain nginx) at the
`dist/` output of `npm run build`.

## License

MIT — see [LICENSE](./LICENSE).
