import { Link } from 'react-router-dom'
import { paidOf } from '../lib/booking.ts'
import { money, paid } from '../lib/format.ts'
import { resetDemo, useStudio } from '../lib/store.ts'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'

export function Payments() {
  const { leads, isDemo } = useStudio()
  const rows = leads.filter((l) => l.packageAmount > 0)

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Ledger"
        title="Payments"
        actions={
          isDemo ? (
            <Button tone="ghost" onClick={resetDemo}>
              Reset demo data
            </Button>
          ) : null
        }
      />

      <div className="grid gap-2 md:hidden">
        {rows.map((l) => (
          <Link key={l.id} to={`/studio/leads/${l.id}`} className="rounded-2xl border border-line bg-ink-2 p-4">
            <p className="font-medium">{l.coupleName}</p>
            <p className="mt-2 tabular-nums text-gold-soft">{money(l.packageAmount)}</p>
            <p className="mt-1 text-sm tabular-nums text-mute">
              Advance {money(paidOf(l, 'advance'))} · Before {money(paidOf(l, 'before_wedding'))} · Final{' '}
              {money(paidOf(l, 'final_delivery'))}
            </p>
            <p className="mt-2 text-sm">Outstanding {money(Math.max(0, l.packageAmount - paid(l)))}</p>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="w-full min-w-[720px] text-left text-sm tabular-nums">
          <thead className="bg-ink-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
            <tr>
              <th className="px-4 py-2.5 font-medium">Couple</th>
              <th className="px-4 py-2.5 font-medium">Total</th>
              <th className="px-4 py-2.5 font-medium">Advance</th>
              <th className="px-4 py-2.5 font-medium">Before wedding</th>
              <th className="px-4 py-2.5 font-medium">Final delivery</th>
              <th className="px-4 py-2.5 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-line hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link to={`/studio/leads/${l.id}`} className="font-medium hover:text-gold-soft">
                    {l.coupleName}
                  </Link>
                </td>
                <td className="px-4 py-3">{money(l.packageAmount)}</td>
                <td className="px-4 py-3 text-gold-soft">{money(paidOf(l, 'advance'))}</td>
                <td className="px-4 py-3">{money(paidOf(l, 'before_wedding'))}</td>
                <td className="px-4 py-3">{money(paidOf(l, 'final_delivery'))}</td>
                <td className="px-4 py-3">{money(Math.max(0, l.packageAmount - paid(l)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
