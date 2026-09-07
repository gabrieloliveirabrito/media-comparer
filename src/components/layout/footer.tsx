import { useTranslation } from "react-i18next"
import { getAuthorName, getImageVersion } from "@/lib/version"

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const version = getImageVersion()
  const name = getAuthorName()

  return (
    <footer id="app-footer" className="mt-auto border-t border-border/70 bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p id="app-footer-credits">{t("footer.developedBy", { name, year })}</p>
        <p id="app-footer-version" className="font-mono text-xs">
          {t("footer.version", { version })}
        </p>
      </div>
    </footer>
  )
}
