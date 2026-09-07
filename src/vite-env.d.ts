/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_IMAGE_VERSION: string
  readonly VITE_SITE_URL: string
  readonly VITE_AUTHOR_NAME: string
  readonly VITE_TWITTER_SITE?: string
  readonly VITE_TWITTER_CREATOR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
