import type { ReactNode } from 'react'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-mute">{label}</span>
      {children}
    </label>
  )
}

export const fieldClass =
  'w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-base text-cream outline-none transition placeholder:text-mute/70 focus:border-gold/60'
