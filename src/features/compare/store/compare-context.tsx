import * as React from "react"
import {
  applyDiffs,
  extractMetadata,
} from "@/features/compare/engine/extract"
import {
  colorForIndex,
  isAllowedForKind,
  type MediaItem,
  type MediaKind,
} from "@/features/compare/model/types"

type CompareState = {
  kind: MediaKind
  itemsByKind: Record<MediaKind, MediaItem[]>
  busy: boolean
}

type CompareContextValue = CompareState & {
  setKind: (kind: MediaKind) => void
  addFiles: (files: FileList | File[]) => Promise<void>
  removeItem: (id: string) => void
  clearItems: () => void
  items: MediaItem[]
}

const CompareContext = React.createContext<CompareContextValue | null>(null)

export function useCompare() {
  const ctx = React.useContext(CompareContext)
  if (!ctx) throw new Error("useCompare must be used within CompareProvider")
  return ctx
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [kind, setKind] = React.useState<MediaKind>("images")
  const [busy, setBusy] = React.useState(false)
  const [itemsByKind, setItemsByKind] = React.useState<Record<MediaKind, MediaItem[]>>({
    images: [],
    videos: [],
    audio: [],
  })
  const busyLock = React.useRef(false)

  const items = itemsByKind[kind]

  const recomputeDiffs = React.useCallback((list: MediaItem[]) => {
    const diffed = applyDiffs(list)
    return list.map((item) => {
      const d = diffed.find((x) => x.id === item.id)
      return d ? { ...item, fields: d.fields } : item
    })
  }, [])

  const addFiles = React.useCallback(
    async (incoming: FileList | File[]) => {
      if (busyLock.current) return
      const files = Array.from(incoming).filter((f) => isAllowedForKind(f, kind))
      if (!files.length) return

      busyLock.current = true
      setBusy(true)

      try {
        const created: MediaItem[] = []
        const baseIndex = itemsByKind[kind].length

        for (const [offset, file] of files.entries()) {
          const id = crypto.randomUUID()
          const index = baseIndex + offset
          const objectUrl = URL.createObjectURL(file)
          const item: MediaItem = {
            id,
            kind,
            file,
            objectUrl,
            tagColor: colorForIndex(index),
            tagLabel: String.fromCharCode(65 + (index % 26)),
            fields: [],
            status: "pending",
          }
          try {
            const fields = await extractMetadata(file, kind)
            item.fields = fields
            item.status = "ready"
          } catch (err) {
            item.status = "error"
            item.error = err instanceof Error ? err.message : "Failed to read file"
          }
          created.push(item)
        }

        setItemsByKind((prev) => {
          const merged = recomputeDiffs([...prev[kind], ...created])
          return { ...prev, [kind]: merged }
        })
      } finally {
        busyLock.current = false
        setBusy(false)
      }
    },
    [itemsByKind, kind, recomputeDiffs],
  )

  const removeItem = React.useCallback(
    (id: string) => {
      setItemsByKind((prev) => {
        const target = prev[kind].find((i) => i.id === id)
        if (target) URL.revokeObjectURL(target.objectUrl)
        const remaining = prev[kind].filter((i) => i.id !== id).map((item, index) => ({
          ...item,
          tagColor: colorForIndex(index),
          tagLabel: String.fromCharCode(65 + (index % 26)),
        }))
        return { ...prev, [kind]: recomputeDiffs(remaining) }
      })
    },
    [kind, recomputeDiffs],
  )

  const clearItems = React.useCallback(() => {
    setItemsByKind((prev) => {
      for (const item of prev[kind]) URL.revokeObjectURL(item.objectUrl)
      return { ...prev, [kind]: [] }
    })
  }, [kind])

  const value: CompareContextValue = {
    kind,
    setKind,
    itemsByKind,
    items,
    busy,
    addFiles,
    removeItem,
    clearItems,
  }

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}
