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

function looksLikeVoice(body: string) {
  return /voice|ivr|\bcall\b|autogen/i.test(body)
}

function smsTemplate() {
  const raw = (process.env.TWOFACTOR_SMS_TEMPLATE || 'OTP1').trim() || 'OTP1'
  if (/autogen|voice|ivr|call/i.test(raw)) return 'OTP1'
  return raw
}

function twoFactorSmsOk(body: string, httpOk: boolean) {
  const json = parseJson(body)
  const status = String(json?.Status || '')
  const details = String(json?.Details || body)
  if (!httpOk || status.toLowerCase() !== 'success') {
    console.error('goldhour-otp-2factor', status, details.slice(0, 160))
    return false
  }
  if (looksLikeVoice(details) || looksLikeVoice(body)) {
    console.error('goldhour-otp-voice-rejected', details.slice(0, 160))
    return false
  }
  return true
}

/** SMS text only. Never AUTOGEN / VOICE — those place a phone call. Never send without a DLT template. */
async function via2FactorSms(key: string, phone: string, code: string) {
  const template = smsTemplate()
  const keyPart = encodeURIComponent(key)
  const otp = encodeURIComponent(code)
  const tpl = encodeURIComponent(template)
  const numbers = [phone, `91${phone}`]
  for (const number of numbers) {
    const n = encodeURIComponent(number)
    const url = `https://2factor.in/API/V1/${keyPart}/SMS/${n}/${otp}/${tpl}`
    if (/autogen|voice|ivr/i.test(url)) continue
    for (const method of ['POST', 'GET'] as const) {
      const { ok, body } = await postJson(url, { method })
      if (twoFactorSmsOk(body, ok)) return true
    }
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
  if (opts.twoFactorKey) return { ok: false, reason: '2factor' }
  return { ok: false, reason: 'no-provider' }
}
