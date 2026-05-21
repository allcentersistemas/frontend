import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTheme } from '../theme/ThemeProvider'

const MODES = [
  { id: 'light', label: 'Claro', Icon: Sun },
  { id: 'system', label: 'Automático', Icon: Monitor },
  { id: 'dark', label: 'Oscuro', Icon: Moon },
]

export function ThemeToggle({ className, size = 'md' }) {
  const { mode, setMode } = useTheme()
  const compact = size === 'sm'

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className={cn(
        'inline-flex rounded-xl border p-0.5',
        'border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md',
        'dark:border-white/10 dark:bg-slate-900/50',
        className,
      )}
    >
      {MODES.map(({ id, label, Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setMode(id)}
            className={cn(
              'inline-flex items-center justify-center rounded-lg transition',
              compact ? 'h-8 w-8' : 'h-9 w-9 gap-1.5 px-2.5',
              active
                ? 'bg-gradient-to-r from-amber-300/90 to-amber-500/80 text-slate-950 shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200',
            )}
          >
            <Icon className={compact ? 'h-4 w-4' : 'h-4 w-4'} aria-hidden />
            {!compact ? (
              <span className="hidden text-xs font-medium sm:inline">{label}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
