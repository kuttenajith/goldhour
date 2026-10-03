import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { day, money } from '../lib/format.ts'
import { downloadQuotation } from '../lib/pdf.ts'
import { useStudio } from '../lib/store.ts'

export function Quotations() {
  const { studio, leads, quotations } = useStudio()

  return (
    <div className="space-y-5">
      <PageHeader kicker="Documents" title="Quotations" hint={`${quotations.length} on file`} />
      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
            <tr>
              <th className="px-4 py-2.5 font-medium">Couple</th>
              <th className="px-4 py-2.5 font-medium">Package</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => {
              const lead = leads.find((l) => l.id === q.leadId)
              if (!lead) return null
              return (
                <tr key={q.id} className="border-t border-line hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link to={`/studio/leads/${lead.id}`} className="font-medium hover:text-gold-soft">
                      {lead.coupleName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-mute">{q.packageName}</td>
                  <td className="px-4 py-3 text-mute">{day(q.createdOn)}</td>
                  <td className="px-4 py-3 tabular-nums text-gold-soft">{money(q.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button tone="ghost" className="min-h-9 px-3 text-xs" onClick={() => downloadQuotation(studio, lead, q)}>
                      <Download size={14} /> PDF
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 md:hidden">
        {quotations.map((q) => {
          const lead = leads.find((l) => l.id === q.leadId)
          if (!lead) return null
          return (
            <article key={q.id} className="rounded-2xl border border-line bg-ink-2 p-4">
              <Link to={`/studio/leads/${lead.id}`} className="font-medium hover:text-gold-soft">
                {lead.coupleName}
              </Link>
              <p className="mt-1 text-sm text-mute">
                {q.packageName} · {day(q.createdOn)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="tabular-nums text-gold-soft">{money(q.amount)}</p>
                <Button tone="ghost" className="min-h-9 px-3 text-xs" onClick={() => downloadQuotation(studio, lead, q)}>
                  <Download size={14} /> PDF
                </Button>
              </div>
            </article>
          )
        })}
      </div>
      {quotations.length === 0 ? <p className="text-sm text-mute">No quotations yet.</p> : null}
    </div>
  )
}
