import type { ReactNode } from 'react'

export function PageHeader({
  kicker,
  title,
  hint,
  actions,
}: {
  kicker?: string
  title: string
  hint?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">{kicker}</p> : null}
        <h1 className="mt-1 font-display text-2xl leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {hint ? <p className="mt-1 max-w-xl text-sm text-mute">{hint}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
