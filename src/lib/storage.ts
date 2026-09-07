export const TOUR_DONE_KEY = "media-comparer:tour-done"
export const THEME_STORAGE_KEY = "media-comparer:theme"

export function isTourDone(): boolean {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === "1"
  } catch {
    return false
  }
}

export function markTourDone(): void {
  try {
    localStorage.setItem(TOUR_DONE_KEY, "1")
  } catch {
    // ignore
  }
}
