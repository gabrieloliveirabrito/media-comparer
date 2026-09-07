import * as React from "react"
import { CircleHelp, ChevronRight, Equal, GitCompareArrows } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { MediaItem, MediaKind, NormalizedField } from "@/features/compare/model/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MediaPlayer,
  MediaPlayerControls,
  MediaPlayerControlsOverlay,
  MediaPlayerFullscreen,
  MediaPlayerLoading,
  MediaPlayerPlay,
  MediaPlayerSeek,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from "@/components/ui/media-player"
import { useCompare } from "@/features/compare/store/compare-context"
import { cn } from "@/lib/utils"

type DiffTag = {
  id: string
  label: string
  color: string
  value: string
  fileName: string
}

type DiffDetail = {
  fieldKey: string
  fieldLabel: string
  currentLabel: string
  currentColor: string
  currentValue: string
  currentFileName: string
  others: DiffTag[]
}

const MAX_VISIBLE_DIFF_BADGES = 3

const MediaPreview = React.memo(function MediaPreview({
  id,
  kind,
  objectUrl,
  fileName,
}: {
  id: string
  kind: MediaKind
  objectUrl: string
  fileName: string
}) {
  if (kind === "images") {
    return (
      <img
        id={`media-preview-${id}`}
        src={objectUrl}
        alt={fileName}
        className="h-full w-full object-cover"
      />
    )
  }

  if (kind === "videos") {
    return (
      <MediaPlayer
        id={`media-preview-${id}`}
        className="h-full w-full rounded-none"
        withoutTooltip
      >
        <MediaPlayerVideo
          src={objectUrl}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <MediaPlayerLoading />
        <MediaPlayerControls className="gap-1 px-2 py-1.5">
          <MediaPlayerControlsOverlay />
          <MediaPlayerPlay />
          <MediaPlayerSeek withTime className="flex-1" />
          <MediaPlayerVolume className="hidden sm:flex" />
          <MediaPlayerFullscreen />
        </MediaPlayerControls>
      </MediaPlayer>
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/60 px-4">
      <audio
        id={`media-preview-${id}`}
        className="w-full"
        src={objectUrl}
        controls
        preload="metadata"
      />
    </div>
  )
})

function FieldHelp({ fieldKey }: { fieldKey: string }) {
  const { t } = useTranslation()
  const helpKey = `fieldHelp.${fieldKey}`
  const help = t(helpKey)
  if (help === helpKey) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          id={`field-help-${fieldKey}`}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t("fields.helpAria", {
            field: t(`fields.${fieldKey}`, { defaultValue: fieldKey }),
          })}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left normal-case">
        {help}
      </TooltipContent>
    </Tooltip>
  )
}

function DiffTagBadges({
  tags,
  rowId,
  onOpenDetail,
}: {
  tags: DiffTag[]
  rowId: string
  onOpenDetail: () => void
}) {
  if (tags.length === 0) return null

  const visible = tags.slice(0, MAX_VISIBLE_DIFF_BADGES)
  const hiddenCount = tags.length - visible.length

  return (
    <div
      id={`${rowId}-diff-badges`}
      className="flex max-w-full flex-wrap justify-end gap-1"
      data-slot="badge-overflow"
    >
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          id={`${rowId}-tag-${tag.id}`}
          variant="default"
          className="border-0 text-white"
          style={{ backgroundColor: tag.color }}
          title={`${tag.label}: ${tag.value}`}
        >
          {tag.label}
        </Badge>
      ))}
      {hiddenCount > 0 ? (
        <Badge
          id={`${rowId}-overflow`}
          variant="outline"
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onOpenDetail()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              onOpenDetail()
            }
          }}
        >
          +{hiddenCount}
        </Badge>
      ) : null}
    </div>
  )
}

function DiffDetailDialog({
  detail,
  open,
  onOpenChange,
}: {
  detail: DiffDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  if (!detail) return null

  const rows = [
    {
      id: "current",
      label: detail.currentLabel,
      color: detail.currentColor,
      value: detail.currentValue,
      fileName: detail.currentFileName,
      isCurrent: true,
    },
    ...detail.others.map((tag) => ({
      id: tag.id,
      label: tag.label,
      color: tag.color,
      value: tag.value,
      fileName: tag.fileName,
      isCurrent: false,
    })),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="diff-detail-dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("diff.detailTitle", { field: detail.fieldLabel })}</DialogTitle>
          <DialogDescription>{t("diff.detailBody")}</DialogDescription>
        </DialogHeader>
        <ul id="diff-detail-list" className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {rows.map((row) => (
            <li
              key={row.id}
              id={`diff-detail-row-${row.id}`}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2",
                row.isCurrent && "bg-accent/40",
              )}
            >
              <Badge
                className="mt-0.5 border-0 text-white"
                style={{ backgroundColor: row.color }}
              >
                {row.label}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground" title={row.fileName}>
                  {row.fileName}
                </p>
                <p className="break-all text-sm font-medium">{row.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

function FieldsList({
  itemId,
  fields,
  tagById,
  onOpenFieldDetail,
  className,
}: {
  itemId: string
  fields: NormalizedField[]
  tagById: Record<string, MediaItem>
  onOpenFieldDetail: (
    fieldKey: string,
    labelKey: string,
    displayValue: string,
    diffTagIds: string[],
  ) => void
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <ul className={cn("flex flex-col gap-1 text-sm", className)}>
      {fields.map((field) => {
        const hasDiff = field.diffTagIds.length > 0
        const diffTags: DiffTag[] = field.diffTagIds.flatMap((id) => {
          const other = tagById[id]
          if (!other) return []
          const otherField = other.fields.find((f) => f.key === field.key)
          return [
            {
              id,
              label: other.tagLabel,
              color: other.tagColor,
              value: otherField?.displayValue ?? "—",
              fileName: other.file.name,
            },
          ]
        })

        const openDetail = () =>
          onOpenFieldDetail(field.key, field.labelKey, field.displayValue, field.diffTagIds)

        return (
          <li
            key={field.key}
            className={cn(
              "flex w-full items-start gap-1.5 rounded-md px-2 py-1.5",
              hasDiff && "bg-amber-500/10",
            )}
          >
            <FieldHelp fieldKey={field.key} />
            <button
              type="button"
              id={`diff-row-${itemId}-${field.key}`}
              className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md text-left hover:bg-muted/70"
              onClick={openDetail}
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {t(field.labelKey)}
              </span>
              <span className="flex min-w-0 max-w-[58%] flex-col items-end gap-1">
                <span className="break-all font-medium">{field.displayValue}</span>
                {hasDiff ? (
                  <DiffTagBadges
                    tags={diffTags}
                    rowId={`diff-row-${itemId}-${field.key}`}
                    onOpenDetail={openDetail}
                  />
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function MediaCard({ item }: { item: MediaItem }) {
  const { t } = useTranslation()
  const { items, removeItem } = useCompare()
  const [detail, setDetail] = React.useState<DiffDetail | null>(null)
  const [fieldsOpen, setFieldsOpen] = React.useState(false)

  const tagById = React.useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  )

  const diffCount = React.useMemo(
    () => item.fields.filter((field) => field.diffTagIds.length > 0).length,
    [item.fields],
  )

  const canCompare = items.length >= 2

  const openFieldDetail = React.useCallback(
    (fieldKey: string, labelKey: string, displayValue: string, diffTagIds: string[]) => {
      const others: DiffTag[] = diffTagIds.flatMap((id) => {
        const other = tagById[id]
        if (!other) return []
        const otherField = other.fields.find((f) => f.key === fieldKey)
        return [
          {
            id,
            label: other.tagLabel,
            color: other.tagColor,
            value: otherField?.displayValue ?? "—",
            fileName: other.file.name,
          },
        ]
      })

      setDetail({
        fieldKey,
        fieldLabel: t(labelKey),
        currentLabel: item.tagLabel,
        currentColor: item.tagColor,
        currentValue: displayValue,
        currentFileName: item.file.name,
        others,
      })
    },
    [item.file.name, item.tagColor, item.tagLabel, t, tagById],
  )

  const summaryLabel = !canCompare
    ? t("grid.mobileNeedsCompare")
    : diffCount > 0
      ? t("grid.mobileHasDiff", { count: diffCount })
      : t("grid.mobileNoDiff")

  return (
    <article
      id={`media-card-${item.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm md:min-h-[32rem]"
    >
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-muted">
        <MediaPreview
          id={item.id}
          kind={item.kind}
          objectUrl={item.objectUrl}
          fileName={item.file.name}
        />
        <Badge
          id={`media-tag-${item.id}`}
          variant="default"
          className="absolute left-2 top-2 border-0 text-white"
          style={{ backgroundColor: item.tagColor }}
        >
          {item.tagLabel}
        </Badge>
      </div>

      <div className="flex h-14 shrink-0 items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={item.file.name}>
            {item.file.name}
          </p>
          {item.status === "error" ? (
            <p className="truncate text-xs text-destructive">{item.error}</p>
          ) : null}
        </div>
        <Button
          id={`media-remove-${item.id}`}
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => removeItem(item.id)}
        >
          {t("grid.remove")}
        </Button>
      </div>

      {/* Mobile: compact summary → opens fields modal */}
      <div className="p-3 md:hidden">
        <button
          type="button"
          id={`media-fields-summary-${item.id}`}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors hover:bg-muted/60",
            canCompare && diffCount > 0
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border bg-card",
          )}
          onClick={() => setFieldsOpen(true)}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              canCompare && diffCount > 0
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {canCompare && diffCount > 0 ? (
              <GitCompareArrows className="size-4" />
            ) : (
              <Equal className="size-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{summaryLabel}</span>
            <span className="block text-xs text-muted-foreground">{t("grid.mobileTapHint")}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      {/* Desktop: inline fields */}
      <FieldsList
        itemId={item.id}
        fields={item.fields}
        tagById={tagById}
        onOpenFieldDetail={openFieldDetail}
        className="hidden min-h-0 flex-1 overflow-y-auto p-3 md:flex"
      />

      <Dialog open={fieldsOpen} onOpenChange={setFieldsOpen}>
        <DialogContent
          id={`media-fields-dialog-${item.id}`}
          className="flex max-h-[85dvh] flex-col gap-3 sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="pr-6">{t("grid.fieldsTitle", { name: item.file.name })}</DialogTitle>
            <DialogDescription>
              {canCompare && diffCount > 0
                ? t("grid.mobileHasDiff", { count: diffCount })
                : canCompare
                  ? t("grid.mobileNoDiff")
                  : t("grid.mobileNeedsCompare")}
            </DialogDescription>
          </DialogHeader>
          <FieldsList
            itemId={`${item.id}-modal`}
            fields={item.fields}
            tagById={tagById}
            onOpenFieldDetail={openFieldDetail}
            className="min-h-0 flex-1 overflow-y-auto"
          />
        </DialogContent>
      </Dialog>

      <DiffDetailDialog
        detail={detail}
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      />
    </article>
  )
}
