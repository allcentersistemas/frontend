import { useEffect, useMemo, useState } from 'react'
import { getStoredTheme, setStoredTheme } from './themeStorage'
import { ThemeContext } from './themeContext'

/** @param {'light' | 'dark' | 'system'} mode */
function resolveIsDark(mode, systemDark) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemDark
}

function applyDocumentTheme(isDark) {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

function readSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getStoredTheme)
  const [systemDark, setSystemDark] = useState(readSystemDark)
  const isDark = resolveIsDark(mode, systemDark)

  useEffect(() => {
    applyDocumentTheme(isDark)
  }, [isDark])

  useEffect(() => {
    if (mode !== 'system') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
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
