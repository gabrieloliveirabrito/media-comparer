import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CompareProvider } from "@/features/compare/store/compare-context"
import { THEME_STORAGE_KEY } from "@/lib/storage"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" storageKey={THEME_STORAGE_KEY} enableSystem>
      <TooltipProvider delayDuration={300}>
        <Toaster>
          <CompareProvider>{children}</CompareProvider>
        </Toaster>
      </TooltipProvider>
    </ThemeProvider>
  )
}
