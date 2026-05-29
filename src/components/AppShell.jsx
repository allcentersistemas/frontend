import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { sidebarSectionsForDashboard } from '../access/navigationConfig'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { shellSubtitle } from '../auth/roles'
import { cn } from '../lib/cn'
import { ThemeToggle } from './ThemeToggle'
import logo from '../assets/allcenter1.png'
/** @typedef {{ to: string, label: string, end?: boolean }} NavItem */
/** @typedef {{ id: string, title: string | null, items: NavItem[] }} NavSection */

export function AppShell({ role }) {
  const { employee, logout } = useAuth()
  const ability = useAppAbility()
  const [menuOpen, setMenuOpen] = useState(false)
  const sections = sidebarSectionsForDashboard(role, ability, employee).filter((section) => section.items.length > 0)

  const displayName =
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
    employee?.email ||
    'Usuario'

  const subtitle = shellSubtitle(
    employee?.roles.map((r) => r.name) ?? [],
    role,
  )

  const profileHref = `/dashboard/${role}/perfil`
  const email = employee?.email?.trim() || null

  useEffect(() => {
    if (!menuOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div
      className={cn(
        'relative min-h-svh lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]',
        menuOpen && 'max-lg:overflow-hidden',
      )}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-slate-100 dark:bg-slate-950"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_60%_at_0%_-10%,rgba(251,191,36,0.18),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(245,158,11,0.1),transparent_45%),linear-gradient(180deg,rgb(248,250,252)_0%,rgb(241,245,249)_100%)] dark:bg-[radial-gradient(ellipse_90%_60%_at_0%_-10%,rgba(251,191,36,0.12),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(245,158,11,0.08),transparent_45%),linear-gradient(180deg,rgb(15,23,42)_0%,rgb(2,6,23)_100%)]"
        aria-hidden
      />

      <header className="fixed inset-x-0 top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/80 lg:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-amber-400/40 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:shadow-depth dark:hover:border-amber-400/25 dark:hover:bg-amber-400/5"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="flex h-3 w-5 flex-col justify-center gap-1" aria-hidden>
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
          </span>
          {menuOpen ? 'Cerrar' : 'Menú'}
        </button>
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">AllCenter</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/70 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(88vw,300px)] flex-col border-r border-slate-200/80 bg-white/90 px-4 py-6 shadow-xl backdrop-blur-2xl transition-transform duration-200 ease-out max-lg:pt-[4.5rem] dark:border-white/[0.08] dark:bg-slate-950/70 dark:shadow-depth lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:px-5',
          menuOpen ? 'translate-x-0' : 'max-lg:-translate-x-full',
        )}
        aria-label="Barra lateral"
      >
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br  bg-yellow-300"
            aria-hidden
          >
            {/*from-amber-300 to-amber-600 text-lg font-bold text-slate-950 shadow-glow-sm*/}
           <img
               src={logo}
               alt="Logo"
               className="
                  w-36
                  object-contain
                  drop-shadow-2xl
                "
           />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight text-slate-900 dark:text-white">AllCenter</p>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Secciones de la aplicación">
          {sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-1">
              {section.title ? (
                <p
                  className="mb-1 mt-4 px-3 text-[0.65rem] font-bold tracking-widest text-slate-500 uppercase first:mt-0"
                  id={`nav-h-${section.id}`}
                >
                  {section.title}
                </p>
              ) : null}
              <ul
                className="flex flex-col gap-0.5"
                role="list"
                {...(section.title ? { 'aria-labelledby': `nav-h-${section.id}` } : {})}
              >
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end === true}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-xl px-3 py-2.5 text-sm font-medium transition',
                          isActive
                            ? 'bg-gradient-to-r from-amber-400/25 to-amber-600/15 text-amber-900 ring-1 ring-amber-400/30 dark:from-amber-400/20 dark:to-amber-600/10 dark:text-amber-50 dark:ring-amber-400/20'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
          <div className="flex justify-center px-1">
            <ThemeToggle size="sm" className="w-full max-w-[220px] justify-center" />
          </div>
          {profileHref ? (
            <Link
              to={profileHref}
              className="mb-1 block truncate rounded-xl px-1 py-1 text-sm font-medium text-amber-700 transition hover:text-amber-600 dark:text-amber-200/90 dark:hover:text-amber-100"
              title={email ?? 'Mi perfil'}
              onClick={() => setMenuOpen(false)}
            >
              <span className="block truncate text-slate-900 dark:text-white">{displayName}</span>
              {email ? <span className="block truncate text-xs font-normal text-slate-500">{email}</span> : null}
            </Link>
          ) : (
            <div className="mb-1 px-1">
              <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{displayName}</span>
              {email ? <span className="block truncate text-xs text-slate-500">{email}</span> : null}
            </div>
          )}
          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 text-sm font-medium text-slate-600 transition hover:border-amber-400/40 hover:bg-amber-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/5 dark:hover:text-white"
            onClick={() => void logout()}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main
        id="main-content"
        className="min-w-0 pt-[3.75rem] max-lg:px-0 lg:col-start-2 lg:row-start-1 lg:pt-0"
      >
        <Outlet />
      </main>
    </div>
  )
}
