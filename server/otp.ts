import { hashToken, randomToken } from './crypto.ts'

export function indiaMobile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return ''
}

export function newOtpCode() {
  const n = Number.parseInt(randomToken().slice(0, 8), 16) % 900000
  return String(100000 + n)
}

export function otpHash(phone: string, code: string) {
  return hashToken(`${phone}:${code}`)
}

async function postJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.text().catch(() => '')
  if (!res.ok) console.error('goldhour-otp-http', res.status, url, body.slice(0, 180))
  return { ok: res.ok, body }
}

async function via2Factor(phone: string, code: string) {
  const key = process.env.TWOFACTOR_API_KEY || ''
  if (!key) return false
  const { ok, body } = await postJson(
    `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/91${phone}/${encodeURIComponent(code)}/GoldHour`,
    { method: 'GET' },
  )
  return ok && !body.toLowerCase().includes('error')
}

async function viaFast2Sms(phone: string, message: string) {
  const key = process.env.FAST2SMS_API_KEY || ''
  if (!key) return false
  const { ok, body } = await postJson('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ route: 'q', message, language: 'english', numbers: phone }),
  })
  return ok && !body.toLowerCase().includes('"return":false')
}

async function viaTextbelt(phone: string, message: string) {
  const key = process.env.TEXTBELT_KEY || 'textbelt'
  const { ok, body } = await postJson('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: `+91${phone}`, message, key }),
  })
  return ok && body.includes('"success":true')
}

export async function sendOtpSms(phone: string, code: string) {
  const mobile = indiaMobile(phone)
  if (!mobile) return false
  const message = `GoldHour code ${code}. Valid 10 minutes. Do not share.`
  const twofactor = await via2Factor(mobile, code).catch(() => false)
  if (twofactor) {
    console.info('goldhour-otp-sms', { twofactor: true })
    return true
  }
  const fast2sms = await viaFast2Sms(mobile, message).catch(() => false)
  if (fast2sms) {
    console.info('goldhour-otp-sms', { fast2sms: true })
    return true
  }
  const textbelt = await viaTextbelt(mobile, message).catch(() => false)
  console.info('goldhour-otp-sms', { twofactor: false, fast2sms: false, textbelt })
  return textbelt
}
