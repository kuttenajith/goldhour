import { todayIso } from './format.ts'

export function onlyPhone(raw: string) {
  const plus = raw.trim().startsWith('+')
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  return plus ? `+${digits}` : digits
}

export function phoneError(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 'Enter a mobile number'
  if (digits.length < 10) return 'Need at least 10 digits'
  if (digits.length > 12) return 'That number is too long'
  return ''
}

export function onlyMoney(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 9)
}

export function moneyError(value: string) {
  if (!value) return 'Enter an amount'
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 'Amount must be more than 0'
  return ''
}

export function onlyName(raw: string) {
  return raw.replace(/[^\p{L}\p{M} &.',-]/gu, '').slice(0, 80)
}

export function nameError(value: string) {
  if (value.trim().length < 2) return 'Enter the couple’s name'
  return ''
}

export function dateMinFor(existing?: string) {
  const today = todayIso()
  if (existing && existing < today) return existing
  return today
}

export function dateError(value: string, min = todayIso()) {
  if (!value) return 'Pick a date'
  if (value < min) return 'Past dates are not allowed'
  return ''
}

export function emailError(value: string) {
  const v = value.trim()
  if (!v) return 'Enter an email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'That email does not look right'
  return ''
}

export function passwordError(value: string) {
  if (value.length < 8) return 'Use 8 or more characters'
  return ''
}
