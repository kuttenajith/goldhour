import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { LeadForm } from '../components/LeadForm.tsx'
import { Modal } from '../components/Modal.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { fieldClass } from '../components/Field.tsx'
import { day, money, SERVICE_LABEL, SOURCE_LABEL } from '../lib/format.ts'
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
      return [l.coupleName, l.city, l.phone, l.notes].join(' ').toLowerCase().includes(needle)
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
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Pipeline</p>
          <h1 className="mt-2 font-display text-5xl">Leads</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New lead
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          className={fieldClass + ' pl-9'}
          placeholder="Search couples, city, phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-[11px] uppercase tracking-[0.18em] text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="hidden px-4 py-3 font-normal md:table-cell">Phone</th>
              <th className="px-4 py-3 font-normal">Event</th>
              <th className="hidden px-4 py-3 font-normal sm:table-cell">Budget</th>
              <th className="hidden px-4 py-3 font-normal lg:table-cell">Service</th>
              <th className="hidden px-4 py-3 font-normal lg:table-cell">Source</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-line hover:bg-white/3">
                <td className="px-4 py-4">
                  <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                    {l.coupleName}
                  </Link>
                  <p className="text-xs text-mute md:hidden">{l.phone}</p>
                </td>
                <td className="hidden px-4 py-4 text-mute md:table-cell">{l.phone}</td>
                <td className="px-4 py-4">{day(l.eventDate)}</td>
                <td className="hidden px-4 py-4 sm:table-cell">{money(l.budget || l.packageAmount)}</td>
                <td className="hidden px-4 py-4 text-mute lg:table-cell">{SERVICE_LABEL[l.service]}</td>
                <td className="hidden px-4 py-4 text-mute lg:table-cell">{SOURCE_LABEL[l.source]}</td>
                <td className="px-4 py-4">
                  <StatusPill status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title="New lead" onClose={() => setOpen(false)}>
          <LeadForm onSave={save} onCancel={() => setOpen(false)} />
        </Modal>
      ) : null}
    </div>
  )
}
