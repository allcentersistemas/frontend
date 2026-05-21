import { Link } from 'react-router-dom'
import logo from '../assets/allcenter1.png'
import { ThemeToggle } from './ThemeToggle'

/**
 * Contenedor visual compartido para login (y páginas públicas similares).
 */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/40 px-4 dark:from-[#0f0f0f] dark:via-[#1a1a1a] dark:to-[#111827]">
      <div
        className="pointer-events-none absolute top-0 left-0 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl dark:bg-yellow-400/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle size="sm" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-amber-400/15 bg-white/80 p-10 shadow-2xl shadow-amber-500/10 backdrop-blur-2xl dark:border-yellow-400/10 dark:bg-white/5 dark:shadow-yellow-500/10">
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-6 flex h-44 w-44 items-center justify-center rounded-full border border-amber-400/25 bg-gradient-to-br from-amber-200 to-amber-500/20 shadow-2xl shadow-amber-500/20 dark:border-yellow-400/20 dark:from-yellow-300 dark:to-amber-500/10 dark:shadow-yellow-500/20">
              <img src={logo} alt="AllCenter" className="w-36 object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-4xl font-bold tracking-wide text-slate-900 dark:text-white">{title}</h1>
            {subtitle ? (
              <p className="mt-3 text-center text-sm text-slate-600 dark:text-yellow-100/80">{subtitle}</p>
            ) : null}
          </div>

          {children}

          {footer ? (
            <div className="mt-8 text-center text-xs text-slate-500 dark:text-yellow-200/50">{footer}</div>
          ) : (
            <div className="mt-8 text-center text-xs text-slate-500 dark:text-yellow-200/50">
              © {new Date().getFullYear()} All Center
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AuthField({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-amber-900/80 dark:text-yellow-100">{label}</label>
      <div className="relative">
        {Icon ? (
          <Icon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-amber-500 dark:text-yellow-400" />
        ) : null}
        {children}
      </div>
    </div>
  )
}

export const authInputClass =
  'w-full rounded-xl border border-amber-400/20 bg-white/80 py-3 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 dark:border-yellow-400/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-yellow-400 dark:focus:ring-yellow-400/10'

export function AuthSubmitButton({ loading, children, loadingLabel = 'Entrando...' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 py-3 font-semibold text-black shadow-lg shadow-yellow-500/30 transition-all duration-300 hover:scale-[1.02] hover:from-yellow-300 hover:to-amber-400 disabled:opacity-70"
    >
      {children ?? (loading ? loadingLabel : 'Ingresar')}
    </button>
  )
}

export function AuthLink({ to, children }) {
  return (
    <Link
      to={to}
      className="block text-center text-sm font-medium text-amber-700 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-600 dark:text-amber-300/90 dark:hover:text-amber-200"
    >
      {children}
    </Link>
  )
}
