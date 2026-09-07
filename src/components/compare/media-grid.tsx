import { useTranslation } from "react-i18next"
import { useCompare } from "@/features/compare/store/compare-context"
import { MediaCard } from "@/components/compare/media-card"

export function MediaGrid() {
  const { t } = useTranslation()
  const { items } = useCompare()

  if (items.length === 0) {
    return (
      <p id="media-grid-empty" className="py-8 text-center text-sm text-muted-foreground">
        {t("grid.empty")}
      </p>
    )
  }

  return (
    <div
      id="media-grid"
      className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {items.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  )
}
