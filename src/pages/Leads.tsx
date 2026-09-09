import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { LeadForm } from '../components/LeadForm.tsx'
import { Modal } from '../components/Modal.tsx'
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
      return [l.coupleName, l.city, l.venue, l.phone, l.notes].join(' ').toLowerCase().includes(needle)
    })
  }, [leads, q])

  function save(lead: Lead) {
    upsertLead(lead)
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Enquiry</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Leads</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New enquiry
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          className={fieldClass + ' pl-9'}
          placeholder="Search couples, venue, phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.map((l) => (
          <Link key={l.id} to={`/studio/leads/${l.id}`} className="rounded-3xl border border-line bg-ink-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl">{l.coupleName}</p>
                <p className="mt-1 text-xs text-mute">
                  {day(l.eventDate)} · {l.venue || l.city || 'Venue pending'}
                </p>
              </div>
              <StatusPill status={l.status} />
            </div>
            <p className="mt-3 text-gold-soft">{money(l.packageAmount || l.budget)}</p>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl border border-line md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink-2 text-[11px] uppercase tracking-[0.18em] text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Phone</th>
              <th className="px-4 py-3 font-normal">Wedding</th>
              <th className="px-4 py-3 font-normal">Venue</th>
              <th className="px-4 py-3 font-normal">Budget</th>
              <th className="px-4 py-3 font-normal">Source</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="px-4 py-4">
                  <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                    {l.coupleName}
                  </Link>
                </td>
                <td className="px-4 py-4 text-mute">{l.phone}</td>
                <td className="px-4 py-4">{day(l.eventDate)}</td>
                <td className="px-4 py-4 text-mute">{l.venue || l.city || '—'}</td>
                <td className="px-4 py-4">{money(l.budget || l.packageAmount)}</td>
                <td className="px-4 py-4 text-mute">{SOURCE_LABEL[l.source]}</td>
                <td className="px-4 py-4">
                  <StatusPill status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title="New enquiry" onClose={() => setOpen(false)}>
          <LeadForm onSave={save} onCancel={() => setOpen(false)} />
        </Modal>
      ) : null}
    </div>
  )
}
