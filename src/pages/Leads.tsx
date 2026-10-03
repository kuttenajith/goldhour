import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { LeadForm } from '../components/LeadForm.tsx'
import { Modal } from '../components/Modal.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { fieldClass } from '../components/Field.tsx'
import { day, money, SOURCE_LABEL } from '../lib/format.ts'
import { upsertLead, useStudio } from '../lib/store.ts'
import type { Lead } from '../lib/types.ts'

export function Leads() {
  const { leads } = useStudio()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (!needle) return true
      return [l.coupleName, l.city, l.venue, l.phone, l.notes, l.nextAction].join(' ').toLowerCase().includes(needle)
    })
  }, [leads, q])

  function save(lead: Lead) {
    upsertLead(lead)
    setOpen(false)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Pipeline"
        title="Leads"
        hint={`${leads.length} on the desk`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New lead
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          className={fieldClass + ' pl-9'}
          placeholder="Search couple, venue, phone, next action"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid gap-2 md:hidden">
        {filtered.map((l) => (
          <Link key={l.id} to={`/studio/leads/${l.id}`} className="rounded-2xl border border-line bg-ink-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.coupleName}</p>
                <p className="mt-1 text-sm text-mute">
                  {day(l.eventDate)} · {l.venue || l.city || 'Venue pending'}
                </p>
              </div>
              <StatusPill status={l.status} />
            </div>
            <p className="mt-2 text-sm text-gold-soft">{l.nextAction || 'No next action'}</p>
            <p className="mt-1 text-sm tabular-nums text-mute">{money(l.packageAmount || l.budget)}</p>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
            <tr>
              <th className="px-4 py-2.5 font-medium">Couple</th>
              <th className="px-4 py-2.5 font-medium">Wedding</th>
              <th className="px-4 py-2.5 font-medium">Value</th>
              <th className="px-4 py-2.5 font-medium">Next</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-line hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link to={`/studio/leads/${l.id}`} className="block hover:text-gold-soft">
                    <span className="font-medium">{l.coupleName}</span>
                    <span className="mt-0.5 block text-xs text-mute">
                      {l.phone || 'No phone'} · {SOURCE_LABEL[l.source]}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-mute">
                  {day(l.eventDate)}
                  <span className="mt-0.5 block text-xs">{l.venue || l.city || '—'}</span>
                </td>
                <td className="px-4 py-3 tabular-nums">{money(l.budget || l.packageAmount)}</td>
                <td className="max-w-[220px] px-4 py-3 text-gold-soft">
                  <span className="line-clamp-2">{l.nextAction || '—'}</span>
                  {l.nextActionOn ? <span className="mt-0.5 block text-xs text-mute">{day(l.nextActionOn)}</span> : null}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? <p className="text-sm text-mute">No leads match that search.</p> : null}

      {open ? (
        <Modal title="New lead" onClose={() => setOpen(false)}>
          <LeadForm onSave={save} onCancel={() => setOpen(false)} />
        </Modal>
      ) : null}
    </div>
  )
}
