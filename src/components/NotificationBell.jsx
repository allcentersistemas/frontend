import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useEmployeeNotifications } from '../notifications/useEmployeeNotifications'
import { formatAppDateTime, formatRelativeTimeEs } from '../utils/appDateTime'
import { cn } from '../lib/cn'

function isQuoteRequest(notification) {
  const type = notification?.type
  return type === 'PROYECTO_COTIZACION' || type === 'proyecto-cotizacion'
}

function notificationSubtitle(item) {
  const cliente = item?.payload?.cliente?.trim?.() || ''
  const body = item?.body?.trim?.() || ''
  const title = item?.title?.trim?.() || ''
  if (cliente) return `Cliente: ${cliente}`
  if (body && body !== title) return body
  return ''
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
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [panelStyle, setPanelStyle] = useState(null)
  const [wasOpen, setWasOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  if (open && !wasOpen) {
    setWasOpen(true)
    setNow(new Date())
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return undefined
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open || !enabled) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setLoading(true)
      setLoadError('')
      void refreshNotifications()
        .catch(() => {
          if (!cancelled) setLoadError('No se pudieron cargar las notificaciones.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, enabled, refreshNotifications])

  useLayoutEffect(() => {
    if (!open) return undefined

    function placePanel() {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const panelWidth = Math.min(window.innerWidth - 16, 22 * 16)
      const gap = 8
      let left =
        align === 'right' ? rect.right - panelWidth : rect.left
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8))

      const preferTop = panelPlacement === 'top'
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const spaceAbove = rect.top - gap
      const maxPanel = Math.min(window.innerHeight * 0.7, 24 * 16)
      const openUp = preferTop ? spaceAbove >= 120 || spaceAbove > spaceBelow : spaceBelow < 160 && spaceAbove > spaceBelow

      if (openUp) {
        setPanelStyle({
          position: 'fixed',
          left,
          width: panelWidth,
          bottom: window.innerHeight - rect.top + gap,
          maxHeight: Math.min(maxPanel, Math.max(120, spaceAbove)),
          zIndex: 80,
        })
      } else {
        setPanelStyle({
          position: 'fixed',
          left,
          width: panelWidth,
          top: rect.bottom + gap,
          maxHeight: Math.min(maxPanel, Math.max(120, spaceBelow)),
          zIndex: 80,
        })
      }
    }

    placePanel()
    window.addEventListener('resize', placePanel)
    window.addEventListener('scroll', placePanel, true)
    return () => {
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('scroll', placePanel, true)
    }
  }, [open, align, panelPlacement, notifications.length, loading])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onPointerDown(event) {
      const target = event.target
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
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

  const panel =
    open && panelStyle ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="Panel de notificaciones"
        style={panelStyle}
        className={cn(
          'flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-xl',
          'dark:border-white/[0.1] dark:bg-slate-950/95 dark:shadow-depth',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-white/[0.08]">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Cargando…</p>
          ) : loadError ? (
            <p className="px-3 py-6 text-center text-sm text-rose-600 dark:text-rose-300">{loadError}</p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No hay notificaciones recientes
            </p>
          ) : (
            <ul role="list" className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {notifications.map((item) => {
                const title = item.title?.trim() || 'Notificación'
                const subtitle = notificationSubtitle(item)
                const relative = formatRelativeTimeEs(item.createdAt, now)
                const absolute = formatAppDateTime(item.createdAt, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
                const timeLabel = relative || (absolute !== '—' ? absolute : '')
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
                      {subtitle ? (
                        <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                          {subtitle}
                        </span>
                      ) : null}
                      {item.payload?.proyectoNombre ? (
                        <span className="line-clamp-1 text-xs text-slate-500 dark:text-slate-500">
                          {item.payload.proyectoNombre}
                        </span>
                      ) : null}
                      {timeLabel ? (
                        <span className="text-[0.7rem] text-slate-500 dark:text-slate-500">
                          {timeLabel}
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
    ) : null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
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

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
