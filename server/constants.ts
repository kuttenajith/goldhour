export const ADMIN_EMAIL = 'ajithkutten1998@gmail.com'
export const DEMO_EMAIL = 'demo@goldhour.app'
export const SESSION_DAYS = 7
export const AUTH_WINDOW_MS = 15 * 60 * 1000
export const AUTH_MAX_FAILS = 5
export const AUTH_MAX_IP = 30
export const STUDIO_MAX_BYTES = 1_200_000
export const APP_URL = process.env.APP_URL || 'https://goldhour-chi.vercel.app'

export function isAdminEmail(email: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL
}
