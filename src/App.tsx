import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { LegalNotice } from "@/components/layout/legal-notice"
import { BackToTop } from "@/components/layout/back-to-top"
import { CompareWorkspace } from "@/components/compare/compare-workspace"
import { CompareProgressDialog } from "@/components/compare/compare-progress-dialog"
import { FirstVisitTour } from "@/components/tour/first-visit-tour"

export default function App() {
  return (
    <div id="app-root" className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="app-main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <LegalNotice />
        <CompareWorkspace />
      </main>
      <Footer />
      <CompareProgressDialog />
      <FirstVisitTour />
      <BackToTop />
    </div>
  )
}
