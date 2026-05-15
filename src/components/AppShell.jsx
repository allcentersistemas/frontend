import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { sidebarSectionsForDashboard } from '../access/navigationConfig'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { shellSubtitle } from '../auth/roles'
import { cn } from '../lib/cn'
import logo from '../assets/allcenter1.png'
/** @typedef {{ to: string, label: string, end?: boolean }} NavItem */
/** @typedef {{ id: string, title: string | null, items: NavItem[] }} NavSection */

export function AppShell({ role }) {
  const { employee, logout } = useAuth()
  const ability = useAppAbility()
  const [menuOpen, setMenuOpen] = useState(false)
  const sections = sidebarSectionsForDashboard(role, ability).filter((section) => section.items.length > 0)

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
      {/* Canvas principal */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-slate-950"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_60%_at_0%_-10%,rgba(251,191,36,0.12),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(245,158,11,0.08),transparent_45%),linear-gradient(180deg,rgb(15,23,42)_0%,rgb(2,6,23)_100%)]"
        aria-hidden
      />

      <header className="fixed inset-x-0 top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-white/[0.08] bg-slate-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white shadow-depth transition hover:border-amber-400/25 hover:bg-amber-400/5"
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
          <p className="truncate text-sm font-semibold text-white">AllCenter</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(88vw,300px)] flex-col border-r border-white/[0.08] bg-slate-950/70 px-4 py-6 shadow-depth backdrop-blur-2xl transition-transform duration-200 ease-out max-lg:pt-[4.5rem] lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:px-5',
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
            <p className="truncate font-semibold tracking-tight text-white">AllCenter</p>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Secciones de la aplicación">
          {sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-1">
              {section.title ? (
                <p
                  className="mb-1 mt-4 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500 first:mt-0"
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
                            ? 'bg-gradient-to-r from-amber-400/20 to-amber-600/10 text-amber-50 ring-1 ring-amber-400/20'
                            : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
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

        <div className="mt-auto border-t border-white/[0.08] pt-4">
          {profileHref ? (
            <Link
              to={profileHref}
              className="mb-3 block truncate rounded-xl px-1 py-1 text-sm font-medium text-amber-200/90 transition hover:text-amber-100"
              title={email ?? 'Mi perfil'}
              onClick={() => setMenuOpen(false)}
            >
              <span className="block truncate text-white">{displayName}</span>
              {email ? <span className="block truncate text-xs font-normal text-slate-500">{email}</span> : null}
            </Link>
          ) : (
            <div className="mb-3 px-1">
              <span className="block truncate text-sm font-medium text-white">{displayName}</span>
              {email ? <span className="block truncate text-xs text-slate-500">{email}</span> : null}
            </div>
          )}
          <button
            type="button"
            className="w-full rounded-xl border border-white/10 bg-transparent py-2.5 text-sm font-medium text-slate-300 transition hover:border-amber-400/30 hover:bg-amber-400/5 hover:text-white"
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
