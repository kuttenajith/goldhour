import type { ReactNode } from 'react'
import { clsx } from '../lib/clsx.ts'

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string
  children: ReactNode
  error?: string
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-mute">{label}</span>
      {children}
      {error ? <span className="block text-sm text-orange-200">{error}</span> : null}
      {!error && hint ? <span className="block text-sm text-mute">{hint}</span> : null}
    </label>
  )
}

export const fieldClass =
  'w-full min-w-0 rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-base text-cream outline-none transition placeholder:text-mute/70 focus:border-gold/60'

export function fieldBox(error?: string) {
  return clsx(fieldClass, error && 'border-orange-300/70 focus:border-orange-200')
}
