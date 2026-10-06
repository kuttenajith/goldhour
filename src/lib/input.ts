import { addYears, todayIso } from './format.ts'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

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

export function dateHorizon(years = 8) {
  return addYears(todayIso(), years)
}

export function dateMinFor(existing?: string) {
  const today = todayIso()
  if (existing && ISO_DATE.test(existing) && existing < today) return existing
  return today
}

export function isRealIsoDate(value: string) {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const dayN = Number(match[3])
  if (year < 2018 || year > 2040) return false
  if (month < 1 || month > 12 || dayN < 1 || dayN > 31) return false
  const dt = new Date(year, month - 1, dayN)
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === dayN
}

export function acceptDateInput(raw: string, min: string, max: string) {
  if (!raw || !isRealIsoDate(raw)) return ''
  if (raw < min || raw > max) return ''
  return raw
}

export function dateError(value: string, min = todayIso(), max = dateHorizon(8)) {
  if (!value) return 'Pick a date'
  if (!isRealIsoDate(value)) return 'Pick a real date from the calendar'
  if (min && value < min) return 'Past dates are not allowed'
  if (max && value > max) return 'That date is too far ahead'
  return ''
}

export function emailError(value: string) {
  const v = value.trim()
  if (!v) return 'Enter an email'
  if (v.length > 120) return 'That email is too long'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'That email does not look right'
  return ''
}

export function passwordError(value: string) {
  if (value.length < 8) return 'Use 8 or more characters'
  if (value.length > 128) return 'That password is too long'
  return ''
}

export function requiredText(value: string, label: string) {
  if (!value.trim()) return `Enter ${label}`
  if (value.trim().length < 2) return `Enter ${label}`
  return ''
}
