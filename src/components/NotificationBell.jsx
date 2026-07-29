import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useEmployeeNotifications } from '../notifications/EmployeeNotificationProvider'
import { formatRelativeTimeEs } from '../utils/appDateTime'
import { cn } from '../lib/cn'

function isQuoteRequest(notification) {
  const type = notification?.type
  return type === 'PROYECTO_COTIZACION' || type === 'proyecto-cotizacion'
}

/**
 * @param {{ role: string, align?: 'left' | 'right', panelPlacement?: 'bottom' | 'top', className?: string }} props
 */
export function NotificationBell({ role, align = 'right', panelPlacement = 'bottom', className }) {
  const {
    enabled,
    unreadCount,
    notifications,
    refreshNotifications,
    markRead,
    markAllRead,
  } = useEmployeeNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const rootRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open || !enabled) return undefined
    let cancelled = false
    setLoading(true)
    void refreshNotifications().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, enabled, refreshNotifications])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (!enabled) return null

  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  async function onSelectNotification(notification) {
    if (!notification?.read && notification?.id != null) {
      await markRead(notification.id)
    }
    setOpen(false)
    if (isQuoteRequest(notification) && role) {
      navigate(`/dashboard/${role}/proyecto-optimizacion?tab=todos`)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition',
          'hover:border-amber-400/40 hover:bg-amber-50 hover:text-slate-900',
          'dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-depth',
          'dark:hover:border-amber-400/25 dark:hover:bg-amber-400/5 dark:hover:text-white',
          open && 'border-amber-400/50 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10',
        )}
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber-500 px-1 py-0.5 text-[0.65rem] font-bold leading-none text-slate-950"
            aria-hidden
          >
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Panel de notificaciones"
          className={cn(
            'absolute z-50 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-xl',
            'dark:border-white/[0.1] dark:bg-slate-950/95 dark:shadow-depth',
            align === 'right' ? 'right-0' : 'left-0',
            panelPlacement === 'top' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]',
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-white/[0.08]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Notificaciones</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-amber-700 transition hover:text-amber-600 dark:text-amber-200/90 dark:hover:text-amber-100"
                onClick={() => void markAllRead()}
              >
                Marcar todas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Cargando…</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                No hay notificaciones recientes
              </p>
            ) : (
              <ul role="list" className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {notifications.map((item) => {
                  const title = item.title?.trim() || 'Notificación'
                  const body = item.body?.trim() || ''
                  const relative = formatRelativeTimeEs(item.createdAt, now)
                  const unread = item.read !== true
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition',
                          unread
                            ? 'bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-400/10 dark:hover:bg-amber-400/15'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                        )}
                        onClick={() => void onSelectNotification(item)}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              'text-sm text-slate-900 dark:text-slate-100',
                              unread ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            {title}
                          </span>
                          {unread ? (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"
                              aria-label="Sin leer"
                            />
                          ) : null}
                        </span>
                        {body && body !== title ? (
                          <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                            {body}
                          </span>
                        ) : null}
                        {relative ? (
                          <span className="text-[0.7rem] text-slate-500 dark:text-slate-500">
                            {relative}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
