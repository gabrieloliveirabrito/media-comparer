import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { isTourDone, markTourDone } from "@/lib/storage"

const STEPS = [
  { titleKey: "tour.welcomeTitle", bodyKey: "tour.welcomeBody", target: "app-brand" },
  { titleKey: "tour.tabsTitle", bodyKey: "tour.tabsBody", target: "media-tabs-list" },
  { titleKey: "tour.dropTitle", bodyKey: "tour.dropBody", target: "media-dropzone" },
  { titleKey: "tour.themeTitle", bodyKey: "tour.themeBody", target: "theme-toggle" },
] as const

type Rect = { top: number; left: number; width: number; height: number }

function measure(id: string): Rect | null {
  const el = document.getElementById(id)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function FirstVisitTour() {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [rect, setRect] = React.useState<Rect | null>(null)

  React.useEffect(() => {
    if (!isTourDone()) setOpen(true)
  }, [])

  const finish = () => {
    markTourDone()
    setOpen(false)
  }

  const current = STEPS[step]
  const pad = 8

  const refresh = React.useCallback(() => {
    const r = measure(current.target)
    setRect(r)
    document.getElementById(current.target)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    })
  }, [current.target])

  React.useEffect(() => {
    if (!open) return
    refresh()
    const onResize = () => refresh()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    const t1 = window.setTimeout(refresh, 50)
    const t2 = window.setTimeout(refresh, 320)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open, step, refresh])

  if (!open) return null

  const spot = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null

  const popoverStyle: React.CSSProperties = spot
    ? (() => {
        const below = spot.top + spot.height + 12
        const placeBelow = below + 220 < window.innerHeight
        return {
          top: placeBelow ? below : Math.max(12, spot.top - 12 - 200),
          left: Math.min(
            Math.max(12, spot.left),
            window.innerWidth - 320 - 12,
          ),
          width: "min(320px, calc(100vw - 24px))",
        }
      })()
    : { top: "30%", left: "50%", transform: "translateX(-50%)", width: 320 }

  return (
    <div id="app-tour" className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      {/* Full-page dim via spotlight ring; center stays clear */}
      {spot ? (
        <div
          id="tour-spotlight"
          className="pointer-events-none absolute z-[81] rounded-xl ring-2 ring-primary transition-[top,left,width,height] duration-200"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div id="tour-backdrop" className="absolute inset-0 z-[81] bg-black/60" />
      )}

      <div
        id="tour-popover"
        className="absolute z-[82] rounded-xl border bg-card p-4 text-card-foreground shadow-xl"
        style={popoverStyle}
      >
        <h2 id="tour-title" className="text-base font-semibold">
          {t(current.titleKey)}
        </h2>
        <p id="tour-description" className="mt-1 text-sm text-muted-foreground">
          {t(current.bodyKey)}
        </p>
        <p id="tour-step-counter" className="mt-3 text-xs text-muted-foreground">
          {t("tour.counter", { current: step + 1, total: STEPS.length })}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button id="tour-skip" variant="ghost" size="sm" onClick={finish}>
            {t("tour.skip")}
          </Button>
          <div className="flex gap-2">
            <Button
              id="tour-prev"
              variant="outline"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              {t("tour.prev")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button id="tour-next" size="sm" onClick={() => setStep((s) => s + 1)}>
                {t("tour.next")}
              </Button>
            ) : (
              <Button id="tour-done" size="sm" onClick={finish}>
                {t("tour.done")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
