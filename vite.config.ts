import path from "node:path"
import type { Plugin } from "vite"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

/** Absolute site origin for canonical/OG tags (no trailing slash). */
function normalizeSiteOrigin(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "")
  return trimmed || "http://localhost"
}

/** Twitter/X @handle; empty string if unset. */
function normalizeTwitterHandle(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return ""
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

/**
 * Rewrites static SEO placeholders in index.html at transform time from
 * VITE_SITE_URL / Twitter env so og/canonical/twitter never need hand-edited URLs.
 * Public assets (e.g. /og.png) resolve against the site origin.
 */
function injectSiteMeta(options: {
  siteOrigin: string
  twitterSite: string
  twitterCreator: string
}): Plugin {
  const { siteOrigin, twitterSite, twitterCreator } = options
  const ogImage = `${siteOrigin}/og.png`
  const secureUrlMeta = siteOrigin.startsWith("https://")
    ? `<meta property="og:image:secure_url" content="${ogImage}" />`
    : ""
  const twitterSiteMeta = twitterSite
    ? `<meta name="twitter:site" content="${twitterSite}" />`
    : ""
  const twitterCreatorMeta = twitterCreator
    ? `<meta name="twitter:creator" content="${twitterCreator}" />`
    : ""

  return {
    name: "inject-site-meta",
    transformIndexHtml(html) {
      return html
        .replaceAll("__SITE_ORIGIN__", siteOrigin)
        .replaceAll("__OG_IMAGE__", ogImage)
        .replace("<!-- __OG_SECURE_URL_META__ -->", secureUrlMeta)
        .replace("<!-- __TWITTER_SITE_META__ -->", twitterSiteMeta)
        .replace("<!-- __TWITTER_CREATOR_META__ -->", twitterCreatorMeta)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const stripMaps =
    env.STRIP_SOURCE_MAPS === "true" || process.env.STRIP_SOURCE_MAPS === "true"
  const siteOrigin = normalizeSiteOrigin(
    process.env.VITE_SITE_URL || env.VITE_SITE_URL,
  )
  const twitterSite = normalizeTwitterHandle(
    process.env.VITE_TWITTER_SITE || env.VITE_TWITTER_SITE,
  )
  const twitterCreator = normalizeTwitterHandle(
    process.env.VITE_TWITTER_CREATOR || env.VITE_TWITTER_CREATOR,
  )

  return {
    plugins: [
      injectSiteMeta({ siteOrigin, twitterSite, twitterCreator }),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.svg",
          "apple-touch-icon.png",
          "og.png",
          "ffmpeg/ffmpeg-core.js",
          "ffmpeg/ffmpeg-core.wasm",
        ],
        manifest: {
          id: "/",
          name: "Media Comparer",
          short_name: "MediaComparer",
          description:
            "Compare images, videos, and audio locally in your browser — no uploads.",
          lang: "en",
          dir: "ltr",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "any",
          theme_color: "#0f766e",
          background_color: "#0b1220",
          categories: ["utilities", "photo", "productivity"],
          icons: [
            {
              src: "/pwa-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,wasm}"],
          // @ffmpeg/core wasm is ~31MB; must be precached for offline A/V compare
          maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: !stripMaps,
    },
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    preview: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  }
})
