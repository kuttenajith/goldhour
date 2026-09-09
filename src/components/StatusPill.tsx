import { STATUS_LABEL } from '../lib/format.ts'
import { clsx } from '../lib/clsx.ts'
import type { LeadStatus } from '../lib/types.ts'

const tone: Record<LeadStatus, string> = {
  new: 'border-gold/40 text-gold-soft',
  quoted: 'border-cream/30 text-cream',
  follow_up: 'border-amber-300/40 text-amber-200',
  advance_pending: 'border-orange-300/40 text-orange-200',
  booked: 'border-emerald-400/40 text-emerald-200',
  completed: 'border-stone-400/30 text-mute',
  lost: 'border-rose-400/30 text-rose-200',
}

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] tracking-wide uppercase',
        tone[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
