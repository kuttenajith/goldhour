import { ADMIN_EMAIL, APP_URL } from './constants.ts'
import { sendSmtpMail } from './smtp.ts'

const WEB3FORMS_KEY = process.env.WEB3FORMS_ACCESS_KEY || 'e7e8e974-642c-411f-83ae-999cdbcdbb6e'
const RESEND_KEY = process.env.RESEND_API_KEY || ''
const FROM = process.env.MAIL_FROM || 'GoldHour <beth.t@example.com>'

async function withBudget<T>(work: Promise<T>, ms = 10000): Promise<T | null> {
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

async function viaSmtp(to: string, subject: string, text: string, html?: string) {
  return sendSmtpMail({ to, subject, text, html })
}

async function viaResend(to: string, subject: string, text: string, html?: string) {
  if (!RESEND_KEY) return false
  const { ok, body } = await postJson('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text, html }),
  })
  if (!ok) console.error('goldhour-mail-resend', body.slice(0, 240))
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
      from_name: 'GoldHour HQ',
      name: 'GoldHour HQ',
      email: replyTo,
      replyto: replyTo,
      to: ADMIN_EMAIL,
      botcheck: false,
      kind: 'goldhour-notice',
      message: message.slice(0, 9000),
    }),
  })
  if (!ok || body.includes('"success":false')) {
    console.error('goldhour-mail-web3forms', body.slice(0, 240))
    return false
  }
  return true
}

async function viaFormsubmit(to: string, subject: string, message: string, replyTo = ADMIN_EMAIL) {
  const params = new URLSearchParams({
    _subject: subject,
    _template: 'box',
    _captcha: 'false',
    _replyto: replyTo,
    name: 'GoldHour HQ',
    email: replyTo,
    message,
  })
  const { ok, body } = await postJson(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  })
  const lower = body.toLowerCase()
  if (lower.includes('confirm') || lower.includes('activate')) {
    console.error('goldhour-mail-formsubmit-activate', to, body.slice(0, 240))
    return false
  }
  if (!ok || lower.includes('"success":false') || lower.includes('"success": false')) {
    console.error('goldhour-mail-formsubmit', to, body.slice(0, 240))
    return false
  }
  return true
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function noticeCardHtml(items: { title: string; body: string; href: string }[]) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid rgba(232,213,163,0.18)">
            <div style="font-size:20px;line-height:1.25;color:#f4ead8">${escapeHtml(item.title)}</div>
            <div style="margin-top:8px;color:#cbbfa6;font-size:15px;line-height:1.45">${escapeHtml(item.body)}</div>
            <a href="${APP_URL}${item.href}" style="display:inline-block;margin-top:12px;color:#c9a227;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none">Open in HQ</a>
          </td>
        </tr>`,
    )
    .join('')
  return `<div style="background:#0c0a09;padding:28px 24px;font-family:Georgia,'Times New Roman',serif">
    <p style="margin:0;letter-spacing:0.28em;color:#e8d5a3;font-size:11px;font-family:sans-serif">GOLDHOUR HQ</p>
    <p style="margin:10px 0 0;color:#9a8f7c;font-size:13px;font-family:sans-serif">Same update as the bell on HQ.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows}</table>
    <p style="margin:28px 0 0;color:#9a8f7c;font-size:12px;font-family:sans-serif">Desk · ${escapeHtml(APP_URL)}</p>
  </div>`
}

/** Always tries HQ Gmail. Await this — Vercel kills fire-and-forget fetch. */
export async function mailAdmin(
  subject: string,
  message: string,
  replyTo = ADMIN_EMAIL,
  html?: string,
): Promise<boolean> {
  const text = `${message}\n\nHQ: ${APP_URL}/admin\nApp: ${APP_URL}`
  const letter = html || noticeCardHtml([{ title: subject, body: message, href: '/admin' }])
  const results = await Promise.all([
    withBudget(viaSmtp(ADMIN_EMAIL, subject, text, letter)),
    withBudget(viaResend(ADMIN_EMAIL, subject, text, letter)),
    withBudget(viaFormsubmit(ADMIN_EMAIL, subject, text, replyTo)),
    withBudget(viaWeb3forms(subject, text, replyTo)),
  ])
  const ok = results.some(Boolean)
  console.info('goldhour-mail', {
    subject,
    smtp: Boolean(results[0]),
    resend: Boolean(results[1]),
    formsubmit: Boolean(results[2]),
    web3forms: Boolean(results[3]),
  })
  if (!ok) console.error('goldhour-mail-all-failed', subject)
  return ok
}

/** Photographer inbox when Resend is set; HQ always gets a copy so nothing is silent. */
export async function mailUser(to: string, subject: string, text: string) {
  const letter = `${text}\n\n— GoldHour · ${APP_URL}`
  const sent = await withBudget(viaResend(to, subject, letter))
  await mailAdmin(`[TO ${to}] ${subject}`, `Send / copy for ${to}\n\n${letter}`, to)
  if (sent) return
  await withBudget(viaFormsubmit(to, subject, letter))
}

/** One recipient only — used for OTP so the code is not copied to HQ. */
export async function mailDirect(to: string, subject: string, text: string) {
  const letter = `${text}\n\n— GoldHour · ${APP_URL}`
  if (await withBudget(viaSmtp(to, subject, letter))) return true
  if (await withBudget(viaResend(to, subject, letter))) return true
  return Boolean(await withBudget(viaFormsubmit(to, subject, letter, to)))
}
