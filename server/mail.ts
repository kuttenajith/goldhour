import { ADMIN_EMAIL, APP_URL } from './constants.ts'

const WEB3FORMS_KEY = process.env.WEB3FORMS_ACCESS_KEY || 'e7e8e974-642c-411f-83ae-999cdbcdbb6e'
const RESEND_KEY = process.env.RESEND_API_KEY || ''
const FROM = process.env.MAIL_FROM || 'GoldHour <goldhour@updates.goldhour.app>'

async function withBudget<T>(work: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([
    work.catch((err) => {
      console.error('goldhour-mail', err)
      return null
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

async function postJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.text().catch(() => '')
  if (!res.ok) console.error('goldhour-mail-http', res.status, url, body.slice(0, 240))
  return { ok: res.ok, body }
}

async function viaResend(to: string, subject: string, text: string) {
  if (!RESEND_KEY) return false
  const { ok } = await postJson('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  })
  return ok
}

async function viaWeb3forms(subject: string, message: string, replyTo = ADMIN_EMAIL) {
  if (!WEB3FORMS_KEY) return false
  const { ok, body } = await postJson('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject,
      from_name: 'GoldHour',
      name: 'GoldHour',
      email: replyTo,
      replyto: replyTo,
      to: ADMIN_EMAIL,
      botcheck: false,
      kind: 'goldhour',
      message: message.slice(0, 9000),
    }),
  })
  if (ok && body.includes('"success":false')) {
    console.error('goldhour-mail-web3forms', body.slice(0, 240))
    return false
  }
  return ok
}

async function viaFormsubmit(to: string, subject: string, message: string, replyTo = ADMIN_EMAIL) {
  const { ok, body } = await postJson(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: subject,
      _template: 'box',
      _captcha: 'false',
      _replyto: replyTo,
      name: 'GoldHour',
      email: replyTo,
      message,
    }),
  })
  if (!ok) console.error('goldhour-mail-formsubmit', to, body.slice(0, 240))
  return ok
}

/** Always tries HQ Gmail directly. Await this — Vercel kills fire-and-forget fetch. */
export async function mailAdmin(subject: string, message: string, replyTo = ADMIN_EMAIL) {
  const text = `${message}\n\nApp: ${APP_URL}`
  await Promise.all([
    withBudget(viaResend(ADMIN_EMAIL, subject, text)),
    withBudget(viaFormsubmit(ADMIN_EMAIL, subject, text, replyTo)),
    withBudget(viaWeb3forms(subject, text, replyTo)),
  ])
}

/** Photographer inbox when Resend is set; HQ always gets a copy so nothing is silent. */
export async function mailUser(to: string, subject: string, text: string) {
  const letter = `${text}\n\n— GoldHour · ${APP_URL}`
  const sent = await withBudget(viaResend(to, subject, letter))
  await mailAdmin(`[TO ${to}] ${subject}`, `Send / copy for ${to}\n\n${letter}`, to)
  if (sent) return
  await withBudget(viaFormsubmit(to, subject, letter))
}
