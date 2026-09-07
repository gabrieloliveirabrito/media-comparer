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
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }
  const raw = (import.meta.env.VITE_SITE_URL || "").trim().replace(/\/+$/, "")
  return raw || "http://localhost"
}
