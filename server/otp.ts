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

async function postJson(url: string, init: RequestInit = { method: 'GET' }) {
  const res = await fetch(url, init)
  const body = await res.text().catch(() => '')
  if (!res.ok) console.error('goldhour-otp-http', res.status, body.slice(0, 180))
  return { ok: res.ok, body }
}

function parseJson(body: string) {
  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return null
  }
}

function twoFactorOk(body: string, httpOk: boolean) {
  const json = parseJson(body)
  const status = String(json?.Status || '')
  if (httpOk && status.toLowerCase() === 'success') return true
  console.error('goldhour-otp-2factor', status, String(json?.Details || body).slice(0, 160))
  return false
}

/** SMS only — never AUTOGEN/VOICE, which 2Factor falls back to a phone call. */
async function via2FactorSms(key: string, phone: string, code: string) {
  const paths = [
    `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/91${phone}/${encodeURIComponent(code)}/OTP1`,
    `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/91${phone}/${encodeURIComponent(code)}`,
  ]
  for (const url of paths) {
    const { ok, body } = await postJson(url)
    if (twoFactorOk(body, ok)) return true
  }
  return false
}

async function viaFast2Sms(key: string, phone: string, message: string) {
  const { ok, body } = await postJson('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ route: 'q', message, language: 'english', numbers: phone }),
  })
  return ok && !body.toLowerCase().includes('"return":false')
}

export type OtpSendResult = { ok: true; code: string } | { ok: false; reason: string }

export async function sendPhoneOtp(opts: { phone: string; twoFactorKey: string; fast2smsKey: string }): Promise<OtpSendResult> {
  const mobile = indiaMobile(opts.phone)
  if (!mobile) return { ok: false, reason: 'bad-phone' }
  const code = newOtpCode()
  if (opts.twoFactorKey) {
    const sms = await via2FactorSms(opts.twoFactorKey, mobile, code)
    if (sms) return { ok: true, code }
    return { ok: false, reason: '2factor' }
  }
  if (opts.fast2smsKey) {
    const sent = await viaFast2Sms(
      opts.fast2smsKey,
      mobile,
      `GoldHour code ${code}. Valid 10 minutes. Do not share.`,
    )
    if (sent) return { ok: true, code }
    return { ok: false, reason: 'fast2sms' }
  }
  return { ok: false, reason: 'no-provider' }
}
