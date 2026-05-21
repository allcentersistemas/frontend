const STORAGE_KEY = 'allcenter-theme'

/** @returns {'light' | 'dark' | 'system'} */
export function getStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* ignore */
  }
  return 'system'
}

/** @param {'light' | 'dark' | 'system'} mode */
export function setStoredTheme(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
