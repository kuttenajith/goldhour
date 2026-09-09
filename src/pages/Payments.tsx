import { Link } from 'react-router-dom'
import { paidOf } from '../lib/booking.ts'
import { money, paid } from '../lib/format.ts'
import { resetDemo, useStudio } from '../lib/store.ts'
import { Button } from '../components/Button.tsx'

export function Payments() {
  const { leads } = useStudio()
  const rows = leads.filter((l) => l.packageAmount > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Ledger</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Payments</h1>
        </div>
        <Button tone="ghost" onClick={resetDemo}>
          Reset demo data
        </Button>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((l) => (
          <Link key={l.id} to={`/studio/leads/${l.id}`} className="rounded-3xl border border-line bg-ink-2 p-4">
            <p className="font-display text-2xl">{l.coupleName}</p>
            <p className="mt-2 text-sm text-gold-soft">{money(l.packageAmount)}</p>
            <p className="mt-1 text-xs text-mute">
              Advance {money(paidOf(l, 'advance'))} · Before {money(paidOf(l, 'before_wedding'))} · Final{' '}
              {money(paidOf(l, 'final_delivery'))}
            </p>
            <p className="mt-2 text-sm">Outstanding {money(Math.max(0, l.packageAmount - paid(l)))}</p>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl border border-line md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-ink-2 text-[11px] uppercase tracking-[0.18em] text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Couple</th>
              <th className="px-4 py-3 font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Advance</th>
              <th className="px-4 py-3 font-normal">Before wedding</th>
              <th className="px-4 py-3 font-normal">Final delivery</th>
              <th className="px-4 py-3 font-normal">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="px-4 py-4">
                  <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                    {l.coupleName}
                  </Link>
                </td>
                <td className="px-4 py-4">{money(l.packageAmount)}</td>
                <td className="px-4 py-4 text-gold-soft">{money(paidOf(l, 'advance'))}</td>
                <td className="px-4 py-4">{money(paidOf(l, 'before_wedding'))}</td>
                <td className="px-4 py-4">{money(paidOf(l, 'final_delivery'))}</td>
                <td className="px-4 py-4">{money(Math.max(0, l.packageAmount - paid(l)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
