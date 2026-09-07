import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-8 w-8" width={32} height={32} />
          <div>
            <p id="app-brand" className="text-base font-semibold tracking-tight">
              {t("app.name")}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">{t("app.tagline")}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="theme-toggle" variant="outline" size="icon" aria-label={t("nav.theme")}>
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" id="theme-menu">
            <DropdownMenuLabel>{t("nav.theme")}</DropdownMenuLabel>
            <DropdownMenuItem id="theme-light" className="gap-2" onClick={() => setTheme("light")}>
              <Sun className="h-4 w-4 shrink-0" />
              <span>{t("nav.themeLight")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem id="theme-dark" className="gap-2" onClick={() => setTheme("dark")}>
              <Moon className="h-4 w-4 shrink-0" />
              <span>{t("nav.themeDark")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem id="theme-system" className="gap-2" onClick={() => setTheme("system")}>
              <Monitor className="h-4 w-4 shrink-0" />
              <span>{t("nav.themeSystem")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
