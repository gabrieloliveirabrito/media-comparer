export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || "0.1.0"
}

export function getImageVersion(): string {
  return (
    import.meta.env.VITE_IMAGE_VERSION ||
    `${import.meta.env.VITE_APP_VERSION || "0.1.0"}-dev`
  )
}

export function getAuthorName(): string {
  return import.meta.env.VITE_AUTHOR_NAME || "Anonymous"
}

export function getSiteUrl(): string {
  const raw = (import.meta.env.VITE_SITE_URL || "http://localhost").trim()
  return raw.replace(/\/+$/, "") || "http://localhost"
}
