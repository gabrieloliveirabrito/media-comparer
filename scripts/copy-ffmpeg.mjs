import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const destDir = join(root, "public", "ffmpeg")

function resolveCoreEsmDir() {
  const direct = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm")
  if (existsSync(join(direct, "ffmpeg-core.wasm"))) return direct

  try {
    const require = createRequire(import.meta.url)
    const entry = require.resolve("@ffmpeg/core")
    const dir = dirname(entry)
    if (existsSync(join(dir, "ffmpeg-core.wasm"))) return dir
  } catch {
    // continue
  }

  const pnpm = join(root, "node_modules", ".pnpm")
  if (existsSync(pnpm)) {
    for (const name of readdirSync(pnpm)) {
      if (!name.startsWith("@ffmpeg+core@")) continue
      const esm = join(pnpm, name, "node_modules", "@ffmpeg", "core", "dist", "esm")
      if (existsSync(join(esm, "ffmpeg-core.wasm"))) return esm
    }
  }

  throw new Error("Could not locate @ffmpeg/core dist/esm. Run pnpm install.")
}

const srcDir = resolveCoreEsmDir()
mkdirSync(destDir, { recursive: true })

for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  const from = join(srcDir, file)
  if (!existsSync(from)) throw new Error(`Missing ${from}`)
  cpSync(from, join(destDir, file))
  console.log(`Copied ${file} -> public/ffmpeg/`)
}
