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
import { clearAuthTokens, loadAuthTokens, saveAuthTokens } from './tokenStorage'
import { dashboardForRoles } from './roles'

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
      try {
        const me = await systemApi.fetchMe()
        if (!cancelled) setEmployee(me)
      } catch {
        setStoredTokens(null)
        saveAuthTokens(null)
        if (!cancelled) setEmployee(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

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
    return dash
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
