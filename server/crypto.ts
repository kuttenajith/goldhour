import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from 'node:crypto'

export function newId() {
  return crypto.randomUUID()
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const next = scryptSync(password, salt, 32)
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return timingSafeEqual(prev, next)
}

export function jwtSecret() {
  return process.env.JWT_SECRET || (process.env.VERCEL ? '' : 'goldhour-dev-secret')
}

export function razorpaySignature(orderId: string, paymentId: string, secret: string) {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

export function webhookSignature(raw: string, secret: string) {
  return createHmac('sha256', secret).update(raw).digest('hex')
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function randomToken() {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function errorId() {
  return `GH-${randomBytes(3).toString('hex').toUpperCase()}`
}
