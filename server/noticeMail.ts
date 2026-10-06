import type { AppNotice } from '../src/lib/types.ts'
import { APP_URL } from './constants.ts'
import { getStore } from './db.ts'
import { mailAdmin, noticeCardHtml } from './mail.ts'

function shouldMail(notice: AppNotice) {
  if (notice.sticky) return true
  if (notice.id.startsWith('hq-')) return true
  const blob = `${notice.title} ${notice.body}`.toLowerCase()
  if (blob.includes('signed in')) return false
  if (blob.includes('updated the desk')) return false
  if (blob.includes('opened the demo')) return false
  if (blob.includes('asked for')) return true
  if (blob.includes('trial')) return true
  if (blob.includes('joined')) return true
  if (blob.includes('paid')) return true
  if (blob.includes('request')) return true
  if (blob.includes('started a 14-day')) return true
  return false
}

function asText(notice: AppNotice) {
  return `${notice.title}\n${notice.body}\n${APP_URL}${notice.href}`
}

/** Emails the same HQ bell items once, so a missed FormSubmit confirm still retries. */
export async function mailNewHqNotices(notices: AppNotice[]) {
  const pending = notices.filter((notice) => notice?.id && shouldMail(notice))
  if (!pending.length) return
  const store = getStore()
  const claimed = await store.claimUnmailed(pending.map((notice) => notice.id))
  if (!claimed.length) return
  const batch = pending.filter((notice) => claimed.includes(notice.id)).slice(0, 20)
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
