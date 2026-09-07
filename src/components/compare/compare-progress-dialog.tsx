import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CircularProgress } from "@/components/ui/badge"
import { useCompare } from "@/features/compare/store/compare-context"

export function CompareProgressDialog() {
  const { t } = useTranslation()
  const { busy } = useCompare()

  return (
    <Dialog open={busy}>
      <DialogContent
        id="compare-progress-dialog"
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-sm"
      >
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <CircularProgress className="mx-auto mb-2" />
          <DialogTitle>{t("progress.title")}</DialogTitle>
          <DialogDescription>{t("progress.body")}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
