import type { AppNotice, Lead } from '../src/lib/types.ts'
import { APP_URL, DEMO_EMAIL, isAdminEmail } from './constants.ts'
import type { TenantPublic } from './db.ts'
import { getStore } from './db.ts'
import { toIso } from './iso.ts'
import { mailAdmin, noticeCardHtml } from './mail.ts'
import { hqLeadNoticeId } from './notices.ts'

function shouldMail(notice: AppNotice) {
  if (notice.sticky) return true
  if (notice.id.startsWith('hq-')) return true
  const blob = `${notice.title} ${notice.body}`.toLowerCase()
  if (blob.includes('signed in')) return false
  if (blob.includes('opened the demo')) return false
  if (blob.includes('updated the desk') && !blob.includes('enquiry')) return false
  return true
}

function asText(notice: AppNotice) {
  return `${notice.title}\n${notice.body}\n${APP_URL}${notice.href}`
}

export function hqJoinNotice(opts: {
  email: string
  name: string
  phone?: string
  city?: string
  owner?: string
  at?: string
}): AppNotice {
  const bits = [opts.email, opts.owner, opts.phone, opts.city, 'started a GoldHour desk'].filter(Boolean)
  return {
    id: `hq-new:${opts.email}`,
    title: `${opts.name} joined`,
    body: bits.join(' · '),
    href: `/admin?studio=${encodeURIComponent(opts.email)}`,
    at: toIso(opts.at, new Date().toISOString()),
    sticky: true,
  }
}

export function hqLeadItem(email: string, name: string, lead: Lead): AppNotice {
  return {
    id: hqLeadNoticeId(email, lead.id),
    title: `${name} · ${lead.status === 'new' ? 'new enquiry' : String(lead.status || 'lead').replace(/_/g, ' ')} · ${lead.coupleName}`,
    body: [
      lead.phone || 'no phone',
      lead.eventDate ? `wedding ${lead.eventDate}` : 'date pending',
      lead.venue || lead.city || 'venue pending',
      lead.createdOn ? `entered ${lead.createdOn}` : '',
      lead.notes || '',
    ]
      .filter(Boolean)
      .join(' · '),
    href: `/admin?studio=${encodeURIComponent(email)}`,
    at: toIso(lead.createdOn, new Date().toISOString()),
    sticky: lead.status === 'new',
  }
}

async function mailNotice(notice: AppNotice) {
  if (!shouldMail(notice)) return
  const store = getStore()
  const claimed = await store.claimUnmailed([notice.id])
  if (!claimed.length) return
  try {
    const ok = await mailAdmin(`[GOLDHOUR] ${notice.title}`, asText(notice), undefined, noticeCardHtml([notice]))
    if (!ok) await store.releaseMailed([notice.id])
  } catch (err) {
    console.error('goldhour-notice-mail', err)
    await store.releaseMailed([notice.id])
  }
}

/** Write the bell item first, then mail. Mail failure does not drop the notice. */
export async function pushHqNotice(notice: AppNotice) {
  if (!notice?.id) return
  await getStore().upsertHqNotice(notice)
  await mailNotice(notice)
}

/** Rebuild join + lead cards from live desks so HQ is never empty after a timeout. */
export async function syncHqInbox(tenants: TenantPublic[]) {
  const store = getStore()
  const fresh: AppNotice[] = []
  for (const t of tenants) {
    const email = t.user.email
    if (!email || email === DEMO_EMAIL || isAdminEmail(email)) continue
    const name = t.studio?.name || email
    fresh.push(
      hqJoinNotice({
        email,
        name,
        phone: t.studio?.phone,
        city: t.studio?.city,
        owner: t.studio?.owner,
        at: t.user.createdAt,
      }),
    )
    const leads = Array.isArray(t.studio?.leads) ? t.studio.leads : []
    for (const lead of leads) {
      if (!lead?.id) continue
      fresh.push(hqLeadItem(email, name, lead))
    }
  }
  await Promise.all(fresh.map((notice) => store.upsertHqNotice(notice)))
  const claimed = await store.claimUnmailed(fresh.filter((n) => n.sticky).map((n) => n.id))
  const one = fresh.find((n) => n.id === claimed[0])
  const extra = claimed.slice(1)
  if (extra.length) await store.releaseMailed(extra)
  if (one) {
    try {
      const ok = await mailAdmin(`[GOLDHOUR] ${one.title}`, asText(one), undefined, noticeCardHtml([one]))
      if (!ok) await store.releaseMailed([one.id])
    } catch (err) {
      console.error('goldhour-notice-mail', err)
      await store.releaseMailed([one.id])
    }
  }
}

/** Emails the same HQ bell items once, so a missed FormSubmit confirm still retries. */
export async function mailNewHqNotices(notices: AppNotice[]) {
  const pending = notices.filter((notice) => notice?.id && shouldMail(notice))
  if (!pending.length) return
  const store = getStore()
  const claimed = await store.claimUnmailed(pending.map((notice) => notice.id))
  if (!claimed.length) return
  const batch = pending.filter((notice) => claimed.includes(notice.id)).slice(0, 3)
  const extra = claimed.filter((id) => !batch.some((notice) => notice.id === id))
  if (extra.length) await store.releaseMailed(extra)
  const subject =
    batch.length === 1 ? `[GOLDHOUR] ${batch[0].title}` : `[GOLDHOUR] ${batch.length} HQ updates`
  const message = batch.map(asText).join('\n\n—\n\n')
  try {
    const ok = await mailAdmin(subject, message, undefined, noticeCardHtml(batch))
    if (!ok) await store.releaseMailed(batch.map((notice) => notice.id))
  } catch (err) {
    console.error('goldhour-notice-mail', err)
    await store.releaseMailed(batch.map((notice) => notice.id))
  }
}
