import exifr from "exifr"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { formatBytes, formatDuration } from "@/lib/utils"
import type { MediaKind, NormalizedField } from "@/features/compare/model/types"
import { getExtension } from "@/features/compare/model/types"

let ffmpegSingleton: FFmpeg | null = null
let ffmpegLoading: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton
  if (ffmpegLoading) return ffmpegLoading

  ffmpegLoading = (async () => {
    const ffmpeg = new FFmpeg()
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "")
    const root = `${base}/ffmpeg`
    await ffmpeg.load({
      coreURL: await toBlobURL(`${root}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${root}/ffmpeg-core.wasm`, "application/wasm"),
    })
    ffmpegSingleton = ffmpeg
    return ffmpeg
  })()

  return ffmpegLoading
}

function field(
  key: string,
  labelKey: string,
  value: string | number | null,
  displayValue?: string,
): NormalizedField {
  const display =
    displayValue ??
    (value === null || value === undefined || value === "" ? "—" : String(value))
  return { key, labelKey, value: value ?? null, displayValue: display, diffTagIds: [] }
}

function extLabel(file: File): string {
  return getExtension(file.name).replace(".", "").toUpperCase() || "—"
}

async function readPngBitDepth(file: File): Promise<number | null> {
  if (!file.type.includes("png") && getExtension(file.name) !== ".png") return null
  try {
    const buf = await file.slice(0, 32).arrayBuffer()
    const view = new DataView(buf)
    // PNG signature + IHDR: bit depth at byte 24
    if (view.byteLength < 25) return null
    if (view.getUint32(0) !== 0x89504e47) return null
    return view.getUint8(24)
  } catch {
    return null
  }
}

async function probeHtmlVideo(file: File): Promise<{
  width: number | null
  height: number | null
  duration: number | null
}> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true
    const result = await new Promise<{ width: number | null; height: number | null; duration: number | null }>(
      (resolve) => {
        const timer = window.setTimeout(() => {
          resolve({ width: null, height: null, duration: null })
        }, 8000)
        video.onloadedmetadata = () => {
          window.clearTimeout(timer)
          resolve({
            width: video.videoWidth || null,
            height: video.videoHeight || null,
            duration: Number.isFinite(video.duration) ? video.duration : null,
          })
        }
        video.onerror = () => {
          window.clearTimeout(timer)
          resolve({ width: null, height: null, duration: null })
        }
        video.src = url
      },
    )
    video.removeAttribute("src")
    video.load()
    return result
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function extractImageFields(file: File): Promise<NormalizedField[]> {
  const fields: NormalizedField[] = [
    field("fileName", "fields.fileName", file.name),
    field("fileSize", "fields.fileSize", file.size, formatBytes(file.size)),
    field("mimeType", "fields.mimeType", file.type || "—"),
    field("extension", "fields.extension", getExtension(file.name) || "—"),
  ]

  let width: number | null = null
  let height: number | null = null

  try {
    const bitmap = await createImageBitmap(file)
    width = bitmap.width
    height = bitmap.height
    bitmap.close()
  } catch {
    // ignore
  }

  // exifr.parse returns undefined when the file has no EXIF/meta block
  let exif: Record<string, unknown> = {}
  try {
    const parsed = await exifr.parse(file, {
      pick: [
        "ImageWidth",
        "ImageHeight",
        "ColorSpace",
        "BitsPerSample",
        "Compression",
        "Make",
        "Model",
        "Orientation",
      ],
    })
    if (parsed && typeof parsed === "object") {
      exif = parsed as Record<string, unknown>
    }
  } catch {
    // ignore
  }

  width = width ?? (typeof exif.ImageWidth === "number" ? exif.ImageWidth : null)
  height = height ?? (typeof exif.ImageHeight === "number" ? exif.ImageHeight : null)

  const pngBits = await readPngBitDepth(file)
  const bitsRaw = exif.BitsPerSample
  const bitDepth =
    Array.isArray(bitsRaw)
      ? (bitsRaw as number[]).join(",")
      : bitsRaw != null
        ? String(bitsRaw)
        : pngBits != null
          ? String(pngBits)
          : null

  const colorSpace =
    exif.ColorSpace != null
      ? String(exif.ColorSpace)
      : file.type === "image/png"
        ? "sRGB/PNG"
        : file.type === "image/webp"
          ? "WebP"
          : file.type === "image/jpeg" || file.type === "image/jpg"
            ? "JPEG"
            : null

  fields.push(
    field("width", "fields.width", width, width != null ? `${width}px` : "—"),
    field("height", "fields.height", height, height != null ? `${height}px` : "—"),
    field("resolution", "fields.resolution", width && height ? `${width}x${height}` : null),
    field(
      "aspectRatio",
      "fields.aspectRatio",
      width && height ? Number((width / height).toFixed(3)) : null,
    ),
    field("colorSpace", "fields.colorSpace", colorSpace),
    field("bitDepth", "fields.bitDepth", bitDepth),
    field(
      "compression",
      "fields.compression",
      exif.Compression != null ? String(exif.Compression) : extLabel(file),
    ),
    field("make", "fields.make", exif.Make != null ? String(exif.Make) : null),
    field("model", "fields.model", exif.Model != null ? String(exif.Model) : null),
    field(
      "orientation",
      "fields.orientation",
      exif.Orientation != null ? String(exif.Orientation) : null,
    ),
  )

  return fields
}

function parseFFmpegProbe(log: string): Record<string, string> {
  const out: Record<string, string> = {}

  const durationMatch = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (durationMatch) {
    const h = Number(durationMatch[1])
    const m = Number(durationMatch[2])
    const s = Number(durationMatch[3])
    out.duration = String(h * 3600 + m * 60 + s)
  }

  const bitrateMatch = log.match(/bitrate:\s*([\d.]+)\s*kb\/s/i)
  if (bitrateMatch) out.bitrate = `${bitrateMatch[1]} kb/s`

  const inputMatch = log.match(/Input #\d+,\s*([^,\n]+)/i)
  if (inputMatch) out.container = inputMatch[1].trim()

  // Allow stream ids like #0:0[0x1](und): Video: ...
  const videoLine = log.match(/Stream #\d+:\d+[^\n]*?Video:\s*([^\n]+)/i)
  if (videoLine) {
    const rest = videoLine[1]
    const codec = rest.match(/^([A-Za-z0-9_+\-.]+)/)
    if (codec) out.videoCodec = codec[1]
    const dims = rest.match(/(\d{2,5})x(\d{2,5})/)
    if (dims) {
      out.width = dims[1]
      out.height = dims[2]
    }
    const fps = rest.match(/([\d.]+)\s*fps/i) || rest.match(/([\d.]+)\s*tbr/i)
    if (fps) out.frameRate = fps[1]
    const pix = rest.match(/,\s*([a-z0-9]+)\s*(?:\(|,)/i)
    if (pix && !/^\d/.test(pix[1])) out.pixelFormat = pix[1]
  }

  const audioLine = log.match(/Stream #\d+:\d+[^\n]*?Audio:\s*([^\n]+)/i)
  if (audioLine) {
    const rest = audioLine[1]
    const codec = rest.match(/^([A-Za-z0-9_+\-.]+)/)
    if (codec) out.audioCodec = codec[1]
    const hz = rest.match(/([\d.]+)\s*Hz/i)
    if (hz) out.sampleRate = `${hz[1]} Hz`
    const channels =
      rest.match(/\b(mono|stereo|[\d.]+\s*channels?)\b/i) ||
      rest.match(/,\s*(\d)\s*channels?\b/i)
    if (channels) out.channels = channels[1].trim()
  }

  return out
}

async function extractAvFields(file: File, kind: MediaKind): Promise<NormalizedField[]> {
  const fields: NormalizedField[] = [
    field("fileName", "fields.fileName", file.name),
    field("fileSize", "fields.fileSize", file.size, formatBytes(file.size)),
    field("mimeType", "fields.mimeType", file.type || "—"),
    field("extension", "fields.extension", getExtension(file.name) || "—"),
  ]

  const logs: string[] = []
  const ffmpeg = await getFFmpeg()
  const inputName = `input_${crypto.randomUUID()}${getExtension(file.name) || ".bin"}`
  const onLog = ({ message }: { message: string }) => {
    if (message) logs.push(message)
  }
  ffmpeg.on("log", onLog)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    try {
      await ffmpeg.exec(["-hide_banner", "-i", inputName])
    } catch {
      // probe-only exits non-zero
    }
  } finally {
    try {
      await ffmpeg.deleteFile(inputName)
    } catch {
      // ignore
    }
  }

  const parsed = parseFFmpegProbe(logs.join("\n"))
  let duration = parsed.duration ? Number(parsed.duration) : null
  let w = parsed.width ? Number(parsed.width) : null
  let h = parsed.height ? Number(parsed.height) : null

  if (kind === "videos" && (w == null || h == null || duration == null)) {
    const html = await probeHtmlVideo(file)
    w = w ?? html.width
    h = h ?? html.height
    duration = duration ?? html.duration
  }

  fields.push(
    field(
      "container",
      "fields.container",
      parsed.container ?? (getExtension(file.name).replace(".", "") || null),
    ),
  )

  if (kind === "videos") {
    fields.push(
      field("videoCodec", "fields.videoCodec", parsed.videoCodec ?? null),
      field("audioCodec", "fields.audioCodec", parsed.audioCodec ?? null),
      field("width", "fields.width", w, w != null ? `${w}px` : "—"),
      field("height", "fields.height", h, h != null ? `${h}px` : "—"),
      field("resolution", "fields.resolution", w && h ? `${w}x${h}` : null),
      field("pixelFormat", "fields.pixelFormat", parsed.pixelFormat ?? null),
      field(
        "frameRate",
        "fields.frameRate",
        parsed.frameRate ? `${parsed.frameRate} fps` : null,
      ),
      field(
        "duration",
        "fields.duration",
        duration,
        duration != null ? formatDuration(duration) : "—",
      ),
      field("bitrate", "fields.bitrate", parsed.bitrate ?? null),
    )
  } else {
    fields.push(
      field("audioCodec", "fields.audioCodec", parsed.audioCodec ?? null),
      field("sampleRate", "fields.sampleRate", parsed.sampleRate ?? null),
      field("channels", "fields.channels", parsed.channels ?? null),
      field(
        "duration",
        "fields.duration",
        duration,
        duration != null ? formatDuration(duration) : "—",
      ),
      field("bitrate", "fields.bitrate", parsed.bitrate ?? null),
    )
  }

  return fields
}

export async function extractMetadata(file: File, kind: MediaKind): Promise<NormalizedField[]> {
  if (kind === "images") return extractImageFields(file)
  return extractAvFields(file, kind)
}

export function applyDiffs(
  items: { id: string; fields: NormalizedField[] }[],
): { id: string; fields: NormalizedField[] }[] {
  if (items.length < 2) {
    return items.map((item) => ({
      ...item,
      fields: item.fields.map((f) => ({ ...f, diffTagIds: [] })),
    }))
  }

  const keys = new Set(items.flatMap((i) => i.fields.map((f) => f.key)))

  return items.map((item) => {
    const fields = [...keys].map((key) => {
      const own = item.fields.find((f) => f.key === key) ?? field(key, `fields.${key}`, null)
      const others = items.filter((o) => o.id !== item.id)
      const diffTagIds = others
        .filter((o) => {
          const of = o.fields.find((f) => f.key === key)
          return String(of?.value ?? "") !== String(own.value ?? "")
        })
        .map((o) => o.id)
      return { ...own, diffTagIds }
    })
    return { id: item.id, fields }
  })
}
