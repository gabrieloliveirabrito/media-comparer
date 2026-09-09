<p align="center">
  <img src="public/favicon.svg" alt="Media Comparer" width="80" height="80" />
</p>

<h1 align="center">Media Comparer</h1>

<p align="center">
  <strong>Compare images, videos, and audio locally in your browser.</strong><br />
  No uploads. No server. Your files never leave your device.
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.pt.md">Português (BR)</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.5-0f766e?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-private-6b7280?style=flat-square" />
  <img alt="stack" src="https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20TypeScript-2563eb?style=flat-square" />
  <img alt="pnpm" src="https://img.shields.io/badge/package%20manager-pnpm-f69220?style=flat-square" />
</p>

<p align="center">
  <img src="public/og.jpg" alt="Media Comparer — Open Graph preview" width="720" />
</p>

---

## For users

**Media Comparer** is a web tool for **side-by-side** media comparison. Spot what changes across files: size, resolution, codec, bitrate, camera EXIF, and more.

### How it works

1. Pick the **Images**, **Videos**, or **Audio** tab
2. Drop files (or click to browse)
3. Review each item’s metadata and fields that **differ**

### Why use it

| | |
| --- | --- |
| **Privacy** | Nothing is sent to a server. Reading happens only in your browser. |
| **Clear diffs** | Differing fields highlighted with per-file color badges. |
| **Rich media** | Images (PNG, JPG, WebP, AVIF…), video (MP4, WebM, MKV…), and audio (MP3, FLAC, WAV…). |
| **Offline-ready** | Works as a PWA; the FFmpeg core is self-hosted. |

> **Privacy notice:** files stay in browser memory (`File` / `objectURL`). There is no upload, cloud storage, or media sync.

### Screenshots

<p align="center">
  <img src="docs/screenshots/01-workspace.png" alt="Empty workspace with dropzone" width="720" />
  <br />
  <em>Empty workspace — pick Images, Videos, or Audio and drop files locally</em>
</p>

<p align="center">
  <img src="docs/screenshots/02-compare-images.png" alt="Side-by-side image comparison" width="720" />
  <br />
  <em>Side-by-side comparison with differing fields highlighted</em>
</p>

<p align="center">
  <img src="docs/screenshots/03-compare-dark.png" alt="Comparison in dark theme" width="720" />
  <br />
  <em>Same comparison in dark theme</em>
</p>

---

## Technical overview

**Client-only** SPA (no backend). Metadata extraction and comparison run entirely on the client.

| Layer | Technology |
| --- | --- |
| UI | React 19, Tailwind CSS 4, Radix UI, Dice UI patterns |
| Build | Vite 6, TypeScript |
| Images / EXIF | [exifr](https://github.com/MikeKovarik/exifr) |
| Video / audio | [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) (`@ffmpeg/core` self-hosted under `/ffmpeg`) |
| i18n | i18next (`en` first) |
| Offline | vite-plugin-pwa (app + FFmpeg precache) |
| Deploy | Multi-stage Docker → static nginx (port 80), Coolify / GHCR |

### Architecture (brief)

- **Dropzone + tabs** keep comparisons scoped by media kind.
- **Extraction engine** (`src/features/compare/engine`) normalizes shared fields (resolution, codecs, duration, etc.).
- **Diff** flags divergent fields and explains them via toast/dialog.
- **Compare mutex:** one analysis at a time, with a progress dialog.
- **Tour** on first visit (`localStorage`).
- Light / dark / system theme in the navbar.

### Main layout

```
src/
  app/                 # providers (theme, i18n, etc.)
  components/
    compare/           # dropzone, grid, cards, workspace
    layout/            # navbar, footer, legal notice
    ui/                # Radix / shadcn-style primitives
  features/compare/    # store, types, metadata engine
  i18n/                # locales
  lib/                 # version, utils, storage
public/
  favicon.svg
  og.jpg               # Open Graph 1200×630
  pwa-*.png
  ffmpeg/              # WASM core (copied on postinstall)
```

---

## Requirements

- **Node.js** 22+ (recommended; matches Docker/CI)
- **pnpm** (via Corepack or a global install)
- A modern browser with WebAssembly (for video/audio)

---

## Install and run

```bash
# 1. Clone
git clone https://github.com/gabrieloliveirabrito/media-comparer.git
cd media-comparer

# 2. Environment
cp .env.example .env

# 3. Dependencies (also copies ffmpeg-core into public/ffmpeg)
pnpm install

# 4. Dev server
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Useful scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Copy FFmpeg + start Vite in development |
| `pnpm build` | Typecheck + production build to `dist/` |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm lint` | ESLint |
| `pnpm ffmpeg:copy` | Copy `@ffmpeg/core` into `public/ffmpeg` |

### Production build

```bash
pnpm build
pnpm preview
```

---

## Environment variables

Copy `.env.example` → `.env`. Variables prefixed with `VITE_` are embedded in the bundle.

| Variable | Purpose |
| --- | --- |
| `VITE_APP_VERSION` | Version shown in the app (currently **0.1.5**) |
| `VITE_IMAGE_VERSION` | Image/build version (footer) |
| `VITE_SITE_URL` | Absolute origin for OG/Twitter; empty → `__SITE_ORIGIN__` placeholder rewritten by nginx from the request Host |
| `VITE_AUTHOR_NAME` | Author in the footer |
| `VITE_TWITTER_SITE` / `VITE_TWITTER_CREATOR` | Optional Twitter meta handles |
| `STRIP_SOURCE_MAPS` | Docker builds: strip `*.map` from the final image |
| `DOCKER_IMAGE` | Image name (e.g. `ghcr.io/.../media-comparer`) |

Do not commit `.env` secrets. Keep only `.env.example` in the repo.

---

## Docker

Static nginx image serving Vite’s `dist/`, Coolify-ready on **port 80**.

### Local build

```bash
docker build \
  --build-arg VITE_APP_VERSION=0.1.5 \
  --build-arg VITE_IMAGE_VERSION=0.1.5 \
  --build-arg STRIP_SOURCE_MAPS=true \
  -t media-comparer .
```

### Compose

```bash
docker compose up --build
```

The app is at `http://localhost:8080` (`8080:80` mapping).

### Release (CI)

GitHub Actions → **Actions → Release Docker Image** (`workflow_dispatch`):

1. Semver bump in `package.json`
2. Branch `release/X.Y.Z` + tag `vX.Y.Z`
3. Push image to GHCR

---

## Social assets and icons

| File | Role |
| --- | --- |
| `public/favicon.svg` | Favicon |
| `public/apple-touch-icon.png` | iOS / PWA icon |
| `public/pwa-192.png` / `pwa-512.png` | PWA icons |
| `public/og.jpg` | Open Graph / Twitter (`1200×630`) |

OG/Twitter tags in `index.html` use `__SITE_ORIGIN__` (or an absolute URL when `VITE_SITE_URL` is set at build time).

---

## License

Private / hobby repository — no open-source license published in this README. Contact the author for use beyond personal development.
