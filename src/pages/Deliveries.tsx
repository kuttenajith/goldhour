import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader.tsx'
import { day } from '../lib/format.ts'
import { useStudio } from '../lib/store.ts'
import type { Lead } from '../lib/types.ts'

const STATUS: Record<Lead['deliveryStatus'], string> = {
  pending: 'Not sent',
  gallery_sent: 'Gallery sent',
  album_delivered: 'Album delivered',
}

export function Deliveries() {
  const { leads } = useStudio()
  const jobs = leads.filter((l) => l.status === 'booked' || l.status === 'accepted' || l.status === 'completed')
  const due = jobs.filter((l) => l.galleryDueOn || l.albumDueOn || l.deliveryStatus !== 'pending')

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Studio"
        title="Deliveries"
        hint="Gallery and album dates for booked couples. The same post-wedding tray Light Blue and Pixieset keep next to the booking."
      />
      {due.length === 0 ? <p className="text-sm text-mute">No gallery or album dates yet. Open a booked couple and set them on the job file.</p> : null}
      <ul className="space-y-2">
        {jobs.map((lead) => (
          <li key={lead.id}>
            <Link
              to={`/studio/leads/${lead.id}`}
              className="gh-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-4"
            >
              <span>
                <span className="font-medium">{lead.coupleName}</span>
                <span className="mt-1 block text-sm text-mute">
                  Gallery {lead.galleryDueOn ? day(lead.galleryDueOn) : '—'} · Album {lead.albumDueOn ? day(lead.albumDueOn) : '—'}
                </span>
              </span>
              <span className="text-sm text-gold-soft">{STATUS[lead.deliveryStatus]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
