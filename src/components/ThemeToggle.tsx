import { Moon, Sun } from 'lucide-react'
import { useTheme, toggleTheme } from '../lib/theme.ts'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useTheme()
  const midnight = theme === 'midnight'
  return (
    <button
      type="button"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-gold-soft hover:border-gold/50 hover:text-cream"
      onClick={toggleTheme}
      aria-label={midnight ? 'Switch to daylight' : 'Switch to midnight'}
      title={midnight ? 'Midnight' : 'Daylight'}
    >
      {midnight ? <Moon size={compact ? 15 : 16} /> : <Sun size={compact ? 15 : 16} />}
    </button>
  )
}
