import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MediaDropzone } from "@/components/compare/media-dropzone"
import { MediaGrid } from "@/components/compare/media-grid"
import { useCompare } from "@/features/compare/store/compare-context"
import type { MediaKind } from "@/features/compare/model/types"

export function CompareWorkspace() {
  const { t } = useTranslation()
  const { kind, setKind } = useCompare()

  return (
    <Tabs
      id="media-tabs"
      value={kind}
      onValueChange={(v) => setKind(v as MediaKind)}
      className="w-full"
    >
      <TabsList id="media-tabs-list" className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger id="tab-images" value="images">
          {t("tabs.images")}
        </TabsTrigger>
        <TabsTrigger id="tab-videos" value="videos">
          {t("tabs.videos")}
        </TabsTrigger>
        <TabsTrigger id="tab-audio" value="audio">
          {t("tabs.audio")}
        </TabsTrigger>
      </TabsList>

      {(["images", "videos", "audio"] as MediaKind[]).map((k) => (
        <TabsContent key={k} id={`tab-panel-${k}`} value={k} className="space-y-4">
          {kind === k ? (
            <>
              <MediaDropzone />
              <MediaGrid />
            </>
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  )
}
