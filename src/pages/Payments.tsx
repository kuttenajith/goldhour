import { Link } from 'react-router-dom'
import { balance, money, paid } from '../lib/format.ts'
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
          <h1 className="mt-2 font-display text-5xl">Payments</h1>
        </div>
        <Button tone="ghost" onClick={resetDemo}>
          Reset demo data
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-[11px] uppercase tracking-[0.18em] text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Couple</th>
              <th className="px-4 py-3 font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Advance</th>
              <th className="px-4 py-3 font-normal">Balance</th>
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
                <td className="px-4 py-4 text-gold-soft">{money(paid(l))}</td>
                <td className="px-4 py-4">{money(balance(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
