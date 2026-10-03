import { PIPELINE } from '../lib/booking.ts'
import { STATUS_LABEL } from '../lib/format.ts'
import { clsx } from '../lib/clsx.ts'
import type { LeadStatus } from '../lib/types.ts'

export function Pipeline({ status }: { status: LeadStatus }) {
  const current: LeadStatus =
    status === 'completed'
      ? 'booked'
      : status === 'follow_up' || status === 'no_response'
        ? 'quoted'
        : status === 'lost'
          ? 'new'
          : status
  const idx = Math.max(0, PIPELINE.indexOf(current))

  return (
    <ol className="flex overflow-hidden rounded-xl border border-line">
      {PIPELINE.map((step, i) => (
        <li
          key={step}
          className={clsx(
            'relative flex-1 px-2 py-2 text-center text-[11px] font-medium sm:text-xs',
            i <= idx ? 'bg-gold/15 text-gold-soft' : 'bg-ink-2 text-mute',
            i < PIPELINE.length - 1 && 'border-r border-line',
          )}
        >
          {STATUS_LABEL[step]}
        </li>
      ))}
    </ol>
  )
}
