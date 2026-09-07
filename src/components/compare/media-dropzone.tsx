import * as React from "react"
import { Trash2, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useCompare } from "@/features/compare/store/compare-context"
import { ACCEPT_BY_KIND, isAllowedForKind } from "@/features/compare/model/types"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function MediaDropzone() {
  const { t } = useTranslation()
  const { kind, addFiles, clearItems, items, busy } = useCompare()
  const { toast } = useToast()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  const hint =
    kind === "images"
      ? t("dropzone.hintImages")
      : kind === "videos"
        ? t("dropzone.hintVideos")
        : t("dropzone.hintAudio")

  const handleFiles = async (list: FileList | File[]) => {
    if (busy) {
      toast({
        title: t("toast.warningTitle"),
        description: t("dropzone.busy"),
        variant: "warning",
      })
      return
    }
    const files = Array.from(list)
    const rejected = files.filter((f) => !isAllowedForKind(f, kind))
    if (rejected.length) {
      toast({
        title: t("toast.errorTitle"),
        description: t("dropzone.rejectType"),
        variant: "destructive",
      })
    }
    const accepted = files.filter((f) => isAllowedForKind(f, kind))
    if (accepted.length) await addFiles(accepted)
  }

  return (
    <div id="media-dropzone-wrap" className="space-y-3">
      <div
        id="media-dropzone"
        role="button"
        tabIndex={0}
        data-dragging={dragging || undefined}
        data-disabled={busy || undefined}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/60 px-6 py-10 text-center transition-colors",
          dragging && "border-primary bg-accent/40",
          busy && "pointer-events-none opacity-60",
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
      >
        <Upload className="h-8 w-8 text-primary" aria-hidden />
        <p className="font-medium">{t("dropzone.title")}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
        <input
          id="media-file-input"
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={ACCEPT_BY_KIND[kind].accept}
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          id="media-clear-files"
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || items.length === 0}
          onClick={() => clearItems()}
        >
          <Trash2 className="h-4 w-4" />
          {t("dropzone.clear")}
        </Button>
      </div>
    </div>
  )
}
