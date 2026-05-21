import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getStoredTheme, setStoredTheme } from './themeStorage'

const ThemeContext = createContext(null)

/** @param {'light' | 'dark' | 'system'} mode */
function resolveIsDark(mode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDocumentTheme(isDark) {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getStoredTheme)
  const [isDark, setIsDark] = useState(() => resolveIsDark(getStoredTheme()))

  useEffect(() => {
    applyDocumentTheme(isDark)
  }, [isDark])

  useEffect(() => {
    setIsDark(resolveIsDark(mode))
    if (mode !== 'system') return undefined

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setIsDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const setMode = (next) => {
    setStoredTheme(next)
    setModeState(next)
  }

  const value = useMemo(() => ({ mode, setMode, isDark }), [mode, isDark])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
