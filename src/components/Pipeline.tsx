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
    <ol className="grid grid-cols-4 gap-1 sm:gap-2">
      {PIPELINE.map((step, i) => (
        <li
          key={step}
          className={clsx(
            'rounded-2xl border px-2 py-3 text-center sm:px-3',
            i <= idx ? 'border-gold/50 bg-gold/10 text-gold-soft' : 'border-line text-mute',
          )}
        >
          <span className="block text-[10px] uppercase tracking-[0.16em] sm:text-[11px]">
            {i + 1}
          </span>
          <span className="mt-1 block text-xs sm:text-sm">{STATUS_LABEL[step]}</span>
        </li>
      ))}
    </ol>
  )
}
