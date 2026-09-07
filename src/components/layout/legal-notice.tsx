import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

export function LegalNotice() {
  const { t } = useTranslation()
  return (
    <aside
      id="legal-notice"
      className="flex gap-3 rounded-xl border border-primary/20 bg-accent/50 px-4 py-3 text-sm"
    >
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="font-medium text-foreground">{t("legal.title")}</p>
        <p className="mt-1 text-muted-foreground">{t("legal.body")}</p>
      </div>
    </aside>
  )
}
