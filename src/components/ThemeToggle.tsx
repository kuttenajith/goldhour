import { useTheme, toggleTheme } from '../lib/theme.ts'

export function ThemeToggle() {
  const theme = useTheme()
  return (
    <button
      type="button"
      className="rounded-full border border-line px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-gold-soft"
      onClick={toggleTheme}
    >
      {theme === 'midnight' ? 'Midnight' : 'Daylight'}
    </button>
  )
}
