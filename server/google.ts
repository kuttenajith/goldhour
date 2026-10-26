export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
}

export function googleRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, '')}/api/auth/google-callback`
}

export function googleAuthUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    redirect_uri: googleRedirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export type GoogleProfile = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  givenName: string
}

export async function googleProfileFromCode(code: string, origin: string): Promise<GoogleProfile | null> {
  const body = new URLSearchParams({
    code,
    client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    client_secret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirect_uri: googleRedirectUri(origin),
    grant_type: 'authorization_code',
  })
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!tokenRes.ok) return null
  const token = (await tokenRes.json()) as { access_token?: string }
  if (!token.access_token) return null
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  if (!infoRes.ok) return null
  const info = (await infoRes.json()) as {
    sub?: string
    email?: string
    email_verified?: boolean | string
    name?: string
    given_name?: string
  }
  const email = (info.email || '').trim().toLowerCase()
  const sub = (info.sub || '').trim()
  if (!email || !sub) return null
  const verified = info.email_verified === true || info.email_verified === 'true'
  return {
    sub,
    email,
    emailVerified: verified,
    name: (info.name || '').trim(),
    givenName: (info.given_name || '').trim(),
  }
}
