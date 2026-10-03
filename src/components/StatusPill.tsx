import { STATUS_LABEL } from '../lib/format.ts'
import { clsx } from '../lib/clsx.ts'
import type { LeadStatus } from '../lib/types.ts'

const tone: Record<LeadStatus, string> = {
  new: 'bg-gold/10 text-gold-soft',
  quoted: 'bg-cream/10 text-cream',
  follow_up: 'bg-amber-300/10 text-amber-200',
  no_response: 'bg-orange-300/10 text-orange-200',
  accepted: 'bg-sky-300/10 text-sky-200',
  booked: 'bg-emerald-400/10 text-emerald-200',
  completed: 'bg-stone-400/10 text-mute',
  lost: 'bg-rose-400/10 text-rose-200',
}

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center rounded-md px-2 py-1 text-[11px] font-medium leading-none tracking-wide',
        tone[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
