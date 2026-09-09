import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { day, money } from '../lib/format.ts'
import { downloadQuotation } from '../lib/pdf.ts'
import { useStudio } from '../lib/store.ts'

export function Quotations() {
  const { studio, leads, quotations } = useStudio()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Letterhead</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Quotations</h1>
      </div>
      <div className="grid gap-4">
        {quotations.map((q) => {
          const lead = leads.find((l) => l.id === q.leadId)
          if (!lead) return null
          return (
            <article
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-ink-2 p-6"
            >
              <div>
                <Link to={`/studio/leads/${lead.id}`} className="font-display text-3xl hover:text-gold-soft">
                  {lead.coupleName}
                </Link>
                <p className="mt-1 text-sm text-mute">
                  {q.packageName} · {day(q.createdOn)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-gold-soft">{money(q.amount)}</p>
                <Button
                  tone="ghost"
                  onClick={() => downloadQuotation(studio, lead, q)}
                >
                  <Download size={16} /> PDF
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
