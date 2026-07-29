import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { systemEventStream } from '../api/http'
import * as systemApi from '../api/systemApi'
import { useAppAbility } from '../access/useAppAbility'
import { FEATURE } from '../access/permissionCatalog'
import { useAuth } from '../auth/AuthContext'
import { normalizeRoleName } from '../auth/roles'
import { dispatchProyectoCotizacionNotification } from './proyectoCotizacionEvents'
import { NotificationToastStack } from '../components/NotificationToastStack.jsx'

const EmployeeNotificationContext = createContext(null)

const RECONNECT_MS = 5_000
const TOAST_TTL_MS = 12_000
const POLL_UNREAD_MS = 20_000

const NOTIFICATION_ROLES = new Set([
  'MASTER',
  'SISTEMAS',
  'ADMIN',
  'ADMINISTRADOR',
  'GERENCIA',
  'ADMIN_PRODUCCION',
  'VENTAS',
  'ADMIN_VENTAS',
])

function employeeHasNotificationRole(employee) {
  return (employee?.roles ?? []).some((role) =>
    NOTIFICATION_ROLES.has(normalizeRoleName(role?.name)),
  )
}

function canReceiveNotifications(ability, employee) {
  if (!employee) return false
  if (employeeHasNotificationRole(employee)) return true
  if (!ability) return false
  if (ability.can('manage', 'all')) return true
  return (
    ability.can('view', FEATURE.PROJECT_LIST) || ability.can('view', FEATURE.GESTION_PROYECTOS)
  )
}

function normalizeNotificationList(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.items)) return res.items
  return []
}

export function EmployeeNotificationProvider({ children }) {
  const { employee } = useAuth()
  const ability = useAppAbility()
  const enabled = canReceiveNotifications(ability, employee)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const reconnectTimer = useRef(null)
  const streamAbort = useRef(null)
  const listLoadedRef = useRef(false)

  const refreshUnread = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await systemApi.fetchNotificationUnreadCount()
      setUnreadCount(typeof res?.unreadCount === 'number' ? res.unreadCount : 0)
    } catch {
      /* ignore */
    }
  }, [enabled])

  const refreshNotifications = useCallback(async () => {
    if (!enabled) return []
    const res = await systemApi.fetchNotifications()
    const list = normalizeNotificationList(res)
    setNotifications(list)
    listLoadedRef.current = true
    return list
  }, [enabled])

  const pushToast = useCallback((message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_TTL_MS)
  }, [])

  const handleLivePayload = useCallback(
    (data) => {
      if (!data || typeof data !== 'object') return
      const body =
        typeof data.body === 'string' && data.body.trim()
          ? data.body.trim()
          : typeof data.title === 'string'
            ? data.title
            : 'Nueva notificación'
      pushToast(body)
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount)
      } else {
        void refreshUnread()
      }
      if (listLoadedRef.current) {
        void refreshNotifications().catch(() => {})
      }
      dispatchProyectoCotizacionNotification(data)
    },
    [pushToast, refreshUnread, refreshNotifications],
  )

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0)
      setNotifications([])
      setToasts([])
      listLoadedRef.current = false
      return undefined
    }
    void refreshUnread()
    return undefined
  }, [enabled, refreshUnread, employee?.id])

  // Polling de respaldo si SSE falla o queda bufferizado detrás del proxy
  useEffect(() => {
    if (!enabled) return undefined
    const tick = () => {
      if (document.visibilityState === 'hidden') return
      void refreshUnread()
    }
    const timer = window.setInterval(tick, POLL_UNREAD_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshUnread()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, refreshUnread, employee?.id])

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false

    const connect = async () => {
      if (cancelled) return
      streamAbort.current?.abort()
      const controller = new AbortController()
      streamAbort.current = controller
      void refreshUnread()
      if (listLoadedRef.current) {
        void refreshNotifications().catch(() => {})
      }
      try {
        await systemEventStream('/api/notifications/stream', {
          signal: controller.signal,
          onEvent: ({ event, data }) => {
            if (event === 'proyecto-cotizacion') {
              handleLivePayload(data)
            }
          },
        })
      } catch (err) {
        if (controller.signal.aborted || cancelled) return
        reconnectTimer.current = window.setTimeout(connect, RECONNECT_MS)
      }
    }

    void connect()

    return () => {
      cancelled = true
      streamAbort.current?.abort()
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }
  }, [enabled, employee?.id, handleLivePayload, refreshUnread, refreshNotifications])

  const markRead = useCallback(async (id) => {
    if (id == null) return
    try {
      const res = await systemApi.markNotificationRead(id)
      setUnreadCount((prev) =>
        typeof res?.unreadCount === 'number' ? res.unreadCount : Math.max(0, prev - 1),
      )
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    } catch {
      /* ignore */
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      const res = await systemApi.markAllNotificationsRead()
      setUnreadCount(typeof res?.unreadCount === 'number' ? res.unreadCount : 0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      unreadCount,
      notifications,
      refreshUnread,
      refreshNotifications,
      markRead,
      markAllRead,
      enabled,
    }),
    [unreadCount, notifications, refreshUnread, refreshNotifications, markRead, markAllRead, enabled],
  )

  return (
    <EmployeeNotificationContext.Provider value={value}>
      {children}
      {enabled ? <NotificationToastStack toasts={toasts} /> : null}
    </EmployeeNotificationContext.Provider>
  )
}

export function useEmployeeNotifications() {
  const ctx = useContext(EmployeeNotificationContext)
  if (!ctx) {
    return {
      unreadCount: 0,
      notifications: [],
      refreshUnread: async () => {},
      refreshNotifications: async () => [],
      markRead: async () => {},
      markAllRead: async () => {},
      enabled: false,
    }
  }
  return ctx
}
