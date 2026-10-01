import type { ReactNode } from 'react'
import { clsx } from '../lib/clsx.ts'

export function Button({
  children,
  tone = 'gold',
  className,
  type = 'button',
  onClick,
  disabled,
}: {
  children: ReactNode
  tone?: 'gold' | 'ghost' | 'cream'
  className?: string
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm tracking-wide transition',
        tone === 'gold' &&
          'bg-gold text-ink hover:bg-gold-soft',
        tone === 'ghost' &&
          'border border-gold/35 bg-transparent text-gold-soft hover:border-gold hover:text-cream',
        tone === 'cream' && 'bg-cream text-ink hover:bg-gold-soft',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}
