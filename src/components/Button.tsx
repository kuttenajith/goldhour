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
        'gh-btn inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-center text-sm leading-tight tracking-wide sm:px-5',
        tone === 'gold' && 'bg-gold text-ink hover:bg-gold-soft hover:shadow-[0_12px_28px_rgba(201,162,39,0.32)]',
        tone === 'ghost' &&
          'border border-gold/35 bg-transparent text-gold-soft hover:border-gold hover:bg-gold/10 hover:text-cream',
        tone === 'cream' && 'bg-cream text-ink hover:bg-gold-soft hover:shadow-[0_12px_28px_rgba(244,234,216,0.2)]',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}
