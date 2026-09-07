export type MediaKind = "images" | "videos" | "audio"

export type NormalizedField = {
  key: string
  labelKey: string
  value: string | number | null
  displayValue: string
  diffTagIds: string[]
}

export type MediaItem = {
  id: string
  kind: MediaKind
  file: File
  objectUrl: string
  tagColor: string
  tagLabel: string
  fields: NormalizedField[]
  status: "pending" | "ready" | "error"
  error?: string
}

export const TAG_COLORS = [
  "#0f766e",
  "#d97706",
  "#2563eb",
  "#db2777",
  "#7c3aed",
  "#059669",
  "#ea580c",
  "#0891b2",
] as const

export const ACCEPT_BY_KIND: Record<
  MediaKind,
  { accept: string; extensions: string[] }
> = {
  images: {
    accept:
      "image/*,.png,.jpg,.jpeg,.webp,.gif,.avif,.bmp,.svg,.tif,.tiff",
    extensions: [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".avif",
      ".bmp",
      ".svg",
      ".tif",
      ".tiff",
    ],
  },
  videos: {
    accept: "video/*,.mp4,.webm,.mkv,.mov,.avi,.m4v,.ogv",
    extensions: [".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v", ".ogv"],
  },
  audio: {
    accept: "audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac,.opus,.wma",
    extensions: [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".opus", ".wma"],
  },
}

export function getExtension(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

export function isAllowedForKind(file: File, kind: MediaKind): boolean {
  const ext = getExtension(file.name)
  const { extensions } = ACCEPT_BY_KIND[kind]
  if (ext && extensions.includes(ext)) return true
  if (kind === "images" && file.type.startsWith("image/")) return true
  if (kind === "videos" && file.type.startsWith("video/")) return true
  if (kind === "audio" && file.type.startsWith("audio/")) return true
  return false
}

export function colorForIndex(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length]
}
