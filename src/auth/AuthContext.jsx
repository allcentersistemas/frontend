import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as systemApi from '../api/systemApi'
import { AbilityProvider } from '../access/AbilityContext'
import {
  configureSystemExtraHeaders,
  configureTokenRefresh,
  getStoredTokens,
  refreshSessionRequest,
  setStoredTokens,
  subscribeTokens,
} from '../api/http'
import { isAccessTokenExpired } from './jwtUtils'
import { clearAuthTokens, loadAuthTokens, saveAuthTokens } from './tokenStorage'
import { defaultDashboardPath } from '../access/permissions'
import { dashboardForRoles } from './roles'

/** Si el usuario está inactivo más de este tiempo, no renovamos token (se cerrará sesión al caducar). */
const IDLE_BEFORE_NO_REFRESH_MS = 15 * 60 * 1000
/** Renovar access token cuando falten estos segundos o menos para caducar. */
const REFRESH_SKEW_SECONDS = 90
const REFRESH_POLL_MS = 30_000

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null)
  const [ready, setReady] = useState(false)

  const refreshSession = useCallback(async () => {
    const t = getStoredTokens()
    if (!t?.refreshToken) return null
    try {
      return await refreshSessionRequest({ refreshToken: t.refreshToken })
    } catch {
      return null
    }
  }, [])

  const logout = useCallback(async () => {
    const t = getStoredTokens()
    if (t?.refreshToken) {
      try {
        await systemApi.logout({ refreshToken: t.refreshToken })
      } catch {
        /* ignore */
      }
    }
    setStoredTokens(null)
    clearAuthTokens()
    setEmployee(null)
  }, [])

  useEffect(() => {
    configureTokenRefresh(refreshSession)
  }, [refreshSession])

  useEffect(() => {
    const p = loadAuthTokens()
    if (p) {
      setStoredTokens({ accessToken: p.accessToken, refreshToken: p.refreshToken })
    } else {
      setStoredTokens(null)
    }

    let cancelled = false
    ;(async () => {
      if (!p) {
        if (!cancelled) setReady(true)
        return
      }
      if (isAccessTokenExpired(p.accessToken) && p.refreshToken) {
        const refreshed = await refreshSession()
        if (refreshed) {
          const next = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          }
          setStoredTokens(next)
          saveAuthTokens(next)
        }
      }
      try {
        const me = await systemApi.fetchMe()
        if (!cancelled) setEmployee(me)
      } catch {
        const refreshed = await refreshSession()
        if (refreshed) {
          const next = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          }
          setStoredTokens(next)
          saveAuthTokens(next)
          try {
            const me = await systemApi.fetchMe()
            if (!cancelled) setEmployee(me)
          } catch {
            setStoredTokens(null)
            saveAuthTokens(null)
            if (!cancelled) setEmployee(null)
          }
        } else {
          setStoredTokens(null)
          saveAuthTokens(null)
          if (!cancelled) setEmployee(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [refreshSession])

  useEffect(() => {
    return subscribeTokens((t) => {
      if (t) saveAuthTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken })
      else saveAuthTokens(null)
    })
  }, [])

  useEffect(() => {
    configureSystemExtraHeaders(() => {
      if (!employee) return {}
      const h = {}
      if (employee.id) {
        h['X-Actor-Employee-Id'] = String(employee.id)
      }
      const email = employee.email && String(employee.email).trim()
      if (email) {
        h['X-Actor-Email'] = email
        h['X-User-Email'] = email
      }
      return h
    })
  }, [employee])

  /** Renovación proactiva mientras la pestaña está activa; cierre si caducó sin uso. */
  useEffect(() => {
    if (!employee) return undefined

    let lastActivity = Date.now()
    const markActive = () => {
      lastActivity = Date.now()
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    for (const ev of events) {
      window.addEventListener(ev, markActive, { passive: true })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') markActive()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const tick = async () => {
      const t = getStoredTokens()
      if (!t?.refreshToken) return

      const visible = document.visibilityState === 'visible'
      const activeRecently = Date.now() - lastActivity < IDLE_BEFORE_NO_REFRESH_MS
      const shouldRefreshEarly =
        t.accessToken && isAccessTokenExpired(t.accessToken, REFRESH_SKEW_SECONDS)
      const accessDead = t.accessToken && isAccessTokenExpired(t.accessToken, 0)

      if (shouldRefreshEarly && visible && activeRecently) {
        const refreshed = await refreshSession()
        if (refreshed) {
          setStoredTokens({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          })
        } else {
          await logout()
        }
      } else if (accessDead && (!visible || !activeRecently)) {
        await logout()
      }
    }

    const id = window.setInterval(() => void tick(), REFRESH_POLL_MS)
    void tick()

    return () => {
      clearInterval(id)
      for (const ev of events) {
        window.removeEventListener(ev, markActive)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [employee, refreshSession, logout])

  const allowedDashboard = useMemo(
    () => (employee ? dashboardForRoles(employee.roles.map((r) => r.name)) : null),
    [employee],
  )

  const login = useCallback(async (username, password) => {
    const session = await systemApi.login({ username, password })
    setStoredTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    })
    saveAuthTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    })
    setEmployee(session.employee)
    const dash = dashboardForRoles(session.employee.roles.map((r) => r.name))
    if (!dash) {
      await systemApi.logout({ refreshToken: session.refreshToken })
      setStoredTokens(null)
      saveAuthTokens(null)
      setEmployee(null)
      throw new Error(
        'Tu cuenta no tiene un rol permitido (Master, Administración, Admin producción, Despacho o Producción). Contacta al administrador.',
      )
    }
    return defaultDashboardPath(dash, session.employee)
  }, [])

  const reloadMe = useCallback(async () => {
    const me = await systemApi.fetchMe()
    setEmployee(me)
  }, [])

  const value = useMemo(
    () => ({
      employee,
      ready,
      login,
      logout,
      reloadMe,
      allowedDashboard,
    }),
    [employee, ready, login, logout, reloadMe, allowedDashboard],
  )

  return (
    <AuthContext.Provider value={value}>
      <AbilityProvider employee={employee}>{children}</AbilityProvider>
    </AuthContext.Provider>
  )
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
