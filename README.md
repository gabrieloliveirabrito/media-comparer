# Media Comparer

Compare images, videos, and audio **entirely in your browser**. No uploads, no server storage.

## Stack

- Vite + React + TypeScript (SPA)
- pnpm
- Tailwind CSS + Radix UI
- ffmpeg.wasm + exifr
- PWA offline-first (self-hosted `@ffmpeg/core` under `/ffmpeg`, precached by the service worker)
- Docker / nginx → Coolify + GHCR

## Develop

```bash
cp .env.example .env
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
```

## Docker

```bash
docker build \
  --build-arg VITE_APP_VERSION=0.1.0 \
  --build-arg VITE_IMAGE_VERSION=0.1.0 \
  --build-arg STRIP_SOURCE_MAPS=true \
  -t media-comparer .
```

Release via GitHub Actions: **Actions → Release Docker Image** (`workflow_dispatch`).
