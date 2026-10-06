import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { DEMO_PIN, seedState } from '../src/lib/seed.ts'
import type { StudioProfile } from '../src/lib/types.ts'
import {
  ADMIN_EMAIL,
  APP_URL,
  AUTH_MAX_FAILS,
  AUTH_MAX_IP,
  AUTH_WINDOW_MS,
  DEMO_EMAIL,
  SESSION_DAYS,
  isAdminEmail,
} from './constants.ts'
import {
  errorId,
  hashPassword,
  hashToken,
  jwtSecret,
  newId,
  randomToken,
  razorpaySignature,
  safeEqual,
  verifyPassword,
  webhookSignature,
} from './crypto.ts'
import { emptyStudio, getStore, type AuditRow, type UserRow } from './db.ts'
import { mailUser } from './mail.ts'
import { hqNotices, studioNotices } from './notices.ts'
import { mailNewHqNotices } from './noticeMail.ts'
import {
  notifyCheckout,
  notifyDemoOpened,
  notifyLeadChanges,
  notifyLogin,
  notifyPaid,
  notifyPlanApproved,
  notifyPlanRequest,
  notifySimple,
  notifyStudioSignup,
  notifyTrialWelcome,
} from './notify.ts'
import { indiaMobile, otpHash, sendPhoneOtp, TF_PREFIX, verify2Factor } from './otp.ts'
import { pendingPlanRequest } from './planRequests.ts'
import { PLANS, addDays, billingStatus, todayIso, trialEnd, type PaidPlanId } from './plans.ts'
import { emailOk, passwordOk, studioPayloadTooLarge, validateLeads, validateQuotations, validateStudioProfile } from './validate.ts'

type Jwt = { sub: string; sid?: string; demo?: boolean }

async function readJson<T>(c: Context) {
  try {
    return await c.req.json<T>()
  } catch {
    return {} as T
  }
}

function clientIp(c: Context) {
  return (c.req.header('x-forwarded-for') || '').split(',')[0].trim() || c.req.header('x-real-ip') || 'unknown'
}

function userAgent(c: Context) {
  return (c.req.header('user-agent') || '').slice(0, 180)
}

const app = new Hono().basePath('/api')

app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-Frame-Options', 'DENY')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (c.req.url.startsWith('https')) {
    c.header('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }
  await next()
})

function cookieOpts(url: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: url.startsWith('https'),
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  }
}

async function audit(opts: { action: string; userId?: string | null; studioId?: string | null; detail?: string; ip?: string }) {
  try {
    await getStore().insertAudit({
      id: newId(),
      studioId: opts.studioId ?? null,
      userId: opts.userId ?? null,
      action: opts.action,
      detail: (opts.detail || '').slice(0, 400),
      ip: opts.ip || '',
      createdAt: new Date().toISOString(),
    })
  } catch {
    /* never block the desk */
  }
}

async function setSession(c: Context, userId: string, demo = false) {
  const secret = jwtSecret()
  if (!secret) throw new Error('CONFIG')
  const sid = newId()
  const now = new Date()
  const expires = new Date(now.getTime() + 60 * 60 * 24 * SESSION_DAYS * 1000)
  await getStore().revokeUserSessions(userId)
  await getStore().createSession({
    id: sid,
    userId,
    expiresAt: expires.toISOString(),
    revokedAt: null,
    createdAt: now.toISOString(),
    ip: clientIp(c),
    userAgent: userAgent(c),
  })
  const token = await sign(
    { sub: userId, sid, demo, exp: Math.floor(expires.getTime() / 1000) },
    secret,
    'HS256',
  )
  setCookie(c, 'goldhour_session', token, cookieOpts(c.req.url))
  return sid
}

async function actorFrom(c: Context) {
  const token = getCookie(c, 'goldhour_session')
  const secret = jwtSecret()
  if (!token || !secret) return null
  try {
    const payload = (await verify(token, secret, 'HS256')) as Jwt
    if (!payload.sub) return null
    if (payload.sid) {
      const session = await getStore().getSession(payload.sid)
      if (!session || session.userId !== payload.sub || session.revokedAt) return null
      if (new Date(session.expiresAt).getTime() < Date.now()) return null
    }
    const db = getStore()
    const user = await db.findUserById(payload.sub)
    const studio = await db.getStudio(payload.sub)
    if (!user || !studio) return null
    return { user, studio, sessionId: payload.sid || '', demo: Boolean(payload.demo) }
  } catch {
    return null
  }
}

async function snapshot(userId: string) {
  const db = getStore()
  const user = await db.findUserById(userId)
  const studio = await db.getStudio(userId)
  const sub = await db.getSub(userId)
  if (!user || !studio || !sub) return null
  const billing = billingStatus(sub)
  const admin = isAdminEmail(user.email) || user.role === 'hq'
  return {
    email: user.email,
    isAdmin: admin,
    role: admin ? 'hq' : 'owner',
    emailVerified: Boolean(user.emailVerifiedAt) || admin || user.email === DEMO_EMAIL,
    isDemo: user.email === DEMO_EMAIL,
    onboarded: studio.onboarded,
    studioId: studio.id,
    studio: {
      name: studio.name,
      owner: studio.owner,
      city: studio.city,
      phone: studio.phone,
      tagline: studio.tagline,
    } satisfies StudioProfile,
    leads: studio.leads,
    quotations: studio.quotations,
    billing: {
      plan: admin ? 'hq' : billing.plan,
      status: admin ? 'active' : billing.status,
      trialEndsOn: billing.trialEndsOn,
      periodEndsOn: billing.periodEndsOn,
      active: admin || billing.active,
      requestedPlan: admin ? null : sub.requestedPlan || null,
    },
  }
}

async function claimAdmin(password: string) {
  if (!passwordOk(password)) throw new Error('ADMIN_PASSWORD')
  const db = getStore()
  const user: UserRow = {
    id: newId(),
    email: ADMIN_EMAIL,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    emailVerifiedAt: new Date().toISOString(),
    role: 'hq',
  }
  await db.insertUser(user)
  await db.upsertStudio({
    ...emptyStudio(user.id, {
      name: 'GoldHour HQ',
      owner: 'Ajith',
      city: 'Madurai',
      tagline: 'Operator desk',
    }),
    onboarded: true,
  })
  await db.upsertSub({
    userId: user.id,
    plan: 'hq',
    status: 'active',
    trialEndsOn: '2099-12-31',
    periodEndsOn: '2099-12-31',
    razorpayPaymentId: null,
    requestedPlan: null,
  })
  return user
}

async function ensureHq(userId: string) {
  const db = getStore()
  const studio = await db.getStudio(userId)
  if (!studio) {
    await db.upsertStudio({
      ...emptyStudio(userId, {
        name: 'GoldHour HQ',
        owner: 'Ajith',
        city: 'Madurai',
        tagline: 'Operator desk',
      }),
      onboarded: true,
    })
  }
  const sub = await db.getSub(userId)
  await db.upsertSub({
    userId,
    plan: 'hq',
    status: 'active',
    trialEndsOn: '2099-12-31',
    periodEndsOn: '2099-12-31',
    razorpayPaymentId: sub?.razorpayPaymentId ?? null,
    requestedPlan: null,
  })
}

async function billingAwareAudit(studioId?: string) {
  const db = getStore()
  const [recent, billing] = await Promise.all([
    db.listAudit({ studioId, limit: studioId ? 80 : 300 }),
    db.listAudit({ studioId, limit: 400, actionPrefix: 'billing.' }),
  ])
  const seen = new Set<string>()
  const out: AuditRow[] = []
  for (const row of [...billing, ...recent]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

async function lockedOut(email: string, ip: string) {
  const since = new Date(Date.now() - AUTH_WINDOW_MS).toISOString()
  const counts = await getStore().countRecentFailures(email, ip, since)
  return counts.email >= AUTH_MAX_FAILS || counts.ip >= AUTH_MAX_IP
}

app.get('/health', (c) => c.json({ ok: true }))

let ready = false

app.use('*', async (c, next) => {
  if (!ready) {
    await getStore().migrate()
    await getStore().ensureDemo()
    ready = true
  }
  await next()
})

app.onError((err, c) => {
  const id = errorId()
  console.error(id, err)
  if (err instanceof Error && err.message === 'CONFIG') {
    return c.json({ error: 'The desk is not configured yet.', errorId: id }, 500)
  }
  return c.json({ error: 'Something went wrong. Try again.', errorId: id }, 500)
})

app.post('/auth/otp-send', async (c) => {
  const body = await readJson<{ phone?: string }>(c)
  const mobile = indiaMobile(body.phone || '')
  if (!mobile) return c.json({ error: 'Enter a 10-digit Indian mobile number.' }, 400)
  const db = getStore()
  const existing = await db.getPhoneOtp(mobile)
  const gapMs = 8_000
  const elapsed = existing ? Date.now() - new Date(existing.sentAt).getTime() : gapMs
  if (existing && !existing.verifiedAt && elapsed < gapMs) {
    const wait = Math.max(1, Math.ceil((gapMs - elapsed) / 1000))
    return c.json({ error: `Wait ${wait} second${wait === 1 ? '' : 's'}, then tap Send OTP again.` }, 429)
  }
  const twoFactorKey = (process.env.TWOFACTOR_API_KEY || '').trim() || (await db.getSetting('twofactor_api_key')) || ''
  const fast2smsKey = (process.env.FAST2SMS_API_KEY || '').trim()
  const sent = await sendPhoneOtp({ phone: mobile, twoFactorKey, fast2smsKey })
  if (!sent.ok) {
    return c.json({ error: 'Could not send SMS to this number. Check the number and tap Send OTP again.' }, 502)
  }
  const now = new Date()
  const codeHash = 'sessionId' in sent ? `${TF_PREFIX}${sent.sessionId}` : otpHash(mobile, sent.code)
  await db.putPhoneOtp({
    phone: mobile,
    codeHash,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    verifiedAt: null,
    sentAt: now.toISOString(),
    tries: 0,
  })
  return c.json({ ok: true, sms: true })
})

app.post('/auth/otp-verify', async (c) => {
  const body = await readJson<{ phone?: string; code?: string }>(c)
  const mobile = indiaMobile(body.phone || '')
  const code = (body.code || '').replace(/\D/g, '').slice(0, 6)
  if (!mobile || code.length !== 6) return c.json({ error: 'Enter the 6-digit code.' }, 400)
  const db = getStore()
  const row = await db.getPhoneOtp(mobile)
  if (!row) return c.json({ error: 'Send the code first.' }, 400)
  if (row.tries >= 5) return c.json({ error: 'Too many tries. Send a new code.' }, 429)
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return c.json({ error: 'That code expired. Send a new one.' }, 400)
  }
  const match = row.codeHash.startsWith(TF_PREFIX)
    ? await verify2Factor(
        (process.env.TWOFACTOR_API_KEY || '').trim() || (await db.getSetting('twofactor_api_key')) || '',
        row.codeHash.slice(TF_PREFIX.length),
        code,
      )
    : row.codeHash === otpHash(mobile, code)
  await db.putPhoneOtp({
    ...row,
    tries: row.tries + 1,
    verifiedAt: match ? new Date().toISOString() : row.verifiedAt,
  })
  if (!match) return c.json({ error: 'That code is not right.' }, 400)
  return c.json({ ok: true })
})

app.post('/auth/register', async (c) => {
  const ip = clientIp(c)
  if (await lockedOut('signup', ip)) {
    return c.json({ error: 'Too many attempts. Wait 15 minutes.' }, 429)
  }
  const body = await readJson<{
    email?: string
    password?: string
    studioName?: string
    owner?: string
    city?: string
    phone?: string
  }>(c)
  const email = body.email?.trim().toLowerCase() || ''
  const password = body.password || ''
  const studioName = (body.studioName || '').trim()
  const owner = (body.owner || '').trim()
  const city = (body.city || '').trim()
  const phone = (body.phone || '').trim()
  if (!emailOk(email) || !passwordOk(password) || studioName.length < 2) {
    return c.json({ error: 'Email, studio name, and an 8+ character password are required.' }, 400)
  }
  if (!isAdminEmail(email) && (owner.length < 2 || city.length < 2 || phone.replace(/\D/g, '').length < 10)) {
    return c.json({ error: 'Owner, city, and a 10-digit phone are required.' }, 400)
  }
  const db = getStore()
  const admin = isAdminEmail(email)
  if (!admin) {
    const mobile = indiaMobile(phone)
    const otp = mobile ? await db.getPhoneOtp(mobile) : null
    const verified = Boolean(otp?.verifiedAt && new Date(otp.verifiedAt).getTime() > Date.now() - 30 * 60 * 1000)
    if (!verified) {
      return c.json({ error: 'Confirm the mobile number with the OTP first.' }, 400)
    }
  }
  await db.recordAuthAttempt(email, ip, true)
  const user: UserRow = {
    id: newId(),
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    emailVerifiedAt: admin ? new Date().toISOString() : null,
    role: admin ? 'hq' : 'owner',
  }
  try {
    await db.insertUser(user)
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      return c.json({ error: 'That email already has a studio.' }, 409)
    }
    throw err
  }
  const studio = admin
    ? {
        ...emptyStudio(user.id, {
          name: 'GoldHour HQ',
          owner: 'Ajith',
          city: (body.city || 'Madurai').trim().slice(0, 60),
          phone: (body.phone || '').trim().slice(0, 20),
          tagline: 'Operator desk',
        }),
        onboarded: true,
      }
    : emptyStudio(user.id, {
        name: studioName.slice(0, 80),
        owner: (body.owner || studioName).trim().slice(0, 80),
        city: (body.city || '').trim().slice(0, 60),
        phone: (body.phone || '').trim().slice(0, 20),
      })
  await db.upsertStudio(studio)
  await db.upsertSub({
    userId: user.id,
    plan: admin ? 'hq' : 'trial',
    status: admin ? 'active' : 'trialing',
    trialEndsOn: admin ? '2099-12-31' : trialEnd(),
    periodEndsOn: admin ? '2099-12-31' : null,
    razorpayPaymentId: null,
    requestedPlan: null,
  })
  if (!admin) {
    const profile = {
      name: studio.name,
      owner: studio.owner,
      city: studio.city,
      phone: studio.phone,
      tagline: studio.tagline,
    }
    await notifyStudioSignup(profile, email)
    const token = randomToken()
    await db.createToken({
      id: newId(),
      userId: user.id,
      kind: 'verify_email',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      usedAt: null,
    })
    await notifyTrialWelcome({
      email,
      studio: profile,
      trialEndsOn: trialEnd(),
      verifyUrl: `${APP_URL}/api/auth/verify?token=${token}`,
    })
  }
  await audit({ action: 'register', userId: user.id, studioId: studio.id, ip })
  await setSession(c, user.id)
  return c.json(await snapshot(user.id))
})

app.post('/auth/login', async (c) => {
  const body = await readJson<{ email?: string; password?: string }>(c)
  const email = body.email?.trim().toLowerCase() || ''
  const password = body.password || ''
  const ip = clientIp(c)
  const db = getStore()
  if (await lockedOut(email || 'unknown', ip)) {
    await audit({ action: 'login.lockout', detail: email, ip })
    return c.json({ error: 'Too many sign-in attempts. Wait 15 minutes.' }, 429)
  }
  let user = await db.findUserByEmail(email)
  if (isAdminEmail(email)) {
    if (!passwordOk(password)) {
      return c.json({ error: 'HQ password must be 8+ characters.' }, 400)
    }
    if (!user) {
      try {
        user = await claimAdmin(password)
      } catch (err) {
        if (err instanceof Error && err.message === 'ADMIN_PASSWORD') {
          return c.json({ error: 'Set an 8+ character password on first HQ sign-in.' }, 400)
        }
        throw err
      }
    } else if (!verifyPassword(password, user.passwordHash)) {
      await db.recordAuthAttempt(email, ip, false)
      await audit({ action: 'login.fail', userId: user.id, ip })
      return c.json({ error: 'Email or password is wrong.' }, 401)
    }
    await db.recordAuthAttempt(email, ip, true)
    await ensureHq(user.id)
    await setSession(c, user.id)
    await audit({ action: 'login.ok', userId: user.id, ip, detail: 'hq' })
    return c.json(await snapshot(user.id))
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await db.recordAuthAttempt(email || 'unknown', ip, false)
    await audit({ action: 'login.fail', userId: user?.id, ip })
    return c.json({ error: 'Email or password is wrong.' }, 401)
  }
  await db.recordAuthAttempt(email, ip, true)
  await setSession(c, user.id, email === DEMO_EMAIL)
  await audit({ action: 'login.ok', userId: user.id, ip })
  const data = await snapshot(user.id)
  await notifyLogin({
    email: user.email,
    studio: {
      name: data.studio.name,
      owner: data.studio.owner,
      city: data.studio.city,
      phone: data.studio.phone,
      tagline: data.studio.tagline,
    },
    ip,
    demo: email === DEMO_EMAIL,
  })
  return c.json(data)
})

app.post('/auth/demo', async (c) => {
  const ip = clientIp(c)
  if (await lockedOut('demo', ip)) {
    return c.json({ error: 'Too many attempts. Wait 15 minutes.' }, 429)
  }
  const body = await readJson<{ pin?: string; email?: string }>(c)
  if (body.pin?.trim() !== DEMO_PIN) {
    await getStore().recordAuthAttempt('demo', ip, false)
    return c.json({ error: 'Use PIN 2026 for the Madurai demo.' }, 401)
  }
  const visitorEmail = body.email?.trim().toLowerCase() || ''
  const demo = await getStore().ensureDemo()
  await setSession(c, demo.id, true)
  await audit({ action: 'login.demo', userId: demo.id, ip, detail: visitorEmail || 'no-email' })
  await notifyDemoOpened({ ip, visitorEmail: emailOk(visitorEmail) ? visitorEmail : undefined })
  return c.json(await snapshot(demo.id))
})

app.post('/auth/forgot', async (c) => {
  const ip = clientIp(c)
  if (await lockedOut('forgot', ip)) {
    return c.json({ error: 'Too many attempts. Wait 15 minutes.' }, 429)
  }
  const body = await readJson<{ email?: string }>(c)
  const email = body.email?.trim().toLowerCase() || ''
  await getStore().recordAuthAttempt(email || 'forgot', ip, true)
  const generic = { ok: true, message: 'If that studio exists, we sent a reset link.' }
  if (!emailOk(email)) return c.json(generic)
  const user = await getStore().findUserByEmail(email)
  if (!user || user.email === DEMO_EMAIL) return c.json(generic)
  const token = randomToken()
  await getStore().createToken({
    id: newId(),
    userId: user.id,
    kind: 'reset_password',
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    usedAt: null,
  })
  await mailUser(
    email,
    'Reset your GoldHour password',
    `Reset link (30 minutes):\n${APP_URL}/reset?token=${token}\n\nIf you did not ask for this, ignore the mail.`,
  )
  await notifySimple({
    email,
    subject: `[GOLDHOUR] Password reset requested · ${email}`,
    detail: 'They asked for a password reset link.',
  })
  await audit({ action: 'password.forgot', userId: user.id, ip })
  return c.json(generic)
})

app.post('/auth/reset', async (c) => {
  const body = await readJson<{ token?: string; password?: string }>(c)
  const token = body.token?.trim() || ''
  const password = body.password || ''
  if (!token || !passwordOk(password)) {
    return c.json({ error: 'Need a valid reset link and an 8+ character password.' }, 400)
  }
  const row = await getStore().consumeToken('reset_password', hashToken(token))
  if (!row) return c.json({ error: 'That reset link is invalid or expired.' }, 400)
  await getStore().updatePassword(row.userId, hashPassword(password))
  await getStore().revokeUserSessions(row.userId)
  const resetUser = await getStore().findUserById(row.userId)
  await audit({ action: 'password.reset', userId: row.userId, ip: clientIp(c) })
  if (resetUser) {
    await notifySimple({
      email: resetUser.email,
      subject: `[GOLDHOUR] Password changed · ${resetUser.email}`,
      detail: 'They set a new password.',
    })
  }
  return c.json({ ok: true })
})

app.get('/auth/verify', async (c) => {
  const token = c.req.query('token')?.trim() || ''
  if (!token) return c.redirect(`${APP_URL}/login?verify=missing`)
  const row = await getStore().consumeToken('verify_email', hashToken(token))
  if (!row) return c.redirect(`${APP_URL}/login?verify=expired`)
  await getStore().markEmailVerified(row.userId)
  await audit({ action: 'email.verified', userId: row.userId, ip: clientIp(c) })
  const verified = await getStore().findUserById(row.userId)
  if (verified) {
    await notifySimple({
      email: verified.email,
      subject: `[GOLDHOUR] Email confirmed · ${verified.email}`,
      detail: 'They confirmed the studio email.',
    })
  }
  return c.redirect(`${APP_URL}/login?verify=ok`)
})

app.post('/auth/logout', async (c) => {
  const actor = await actorFrom(c)
  if (actor?.sessionId) await getStore().revokeSession(actor.sessionId)
  if (actor) await audit({ action: 'logout', userId: actor.user.id, studioId: actor.studio.id, ip: clientIp(c) })
  deleteCookie(c, 'goldhour_session', { path: '/' })
  return c.json({ ok: true })
})

app.get('/studio', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  const data = await snapshot(actor.user.id)
  if (!data) return c.json({ error: 'Studio missing' }, 404)
  return c.json(data)
})

app.put('/studio', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  const db = getStore()
  const current = actor.studio
  const body = await readJson<Record<string, unknown>>(c)
  if (studioPayloadTooLarge(body)) {
    return c.json({ error: 'That update is too large.' }, 413)
  }
  const nextLeads = body.leads !== undefined ? validateLeads(body.leads) : current.leads
  const nextQuotes = body.quotations !== undefined ? validateQuotations(body.quotations) : current.quotations
  const nextStudio = body.studio ? validateStudioProfile(body.studio) : null
  if (body.studio && !nextStudio) {
    return c.json({ error: 'Studio name is required.' }, 400)
  }
  const profile = nextStudio || {
    name: current.name,
    owner: current.owner,
    city: current.city,
    phone: current.phone,
    tagline: current.tagline,
  }
  await db.upsertStudio({
    ...current,
    ...profile,
    userId: current.userId,
    id: current.id,
    leads: nextLeads,
    quotations: nextQuotes,
    onboarded: typeof body.onboarded === 'boolean' ? body.onboarded : current.onboarded,
  })
  await notifyLeadChanges({
    email: actor.user.email,
    studio: profile,
    before: current.leads || [],
    after: nextLeads,
    quotationsBefore: current.quotations || [],
    quotationsAfter: nextQuotes,
  })
  const addedLeads = nextLeads.filter((l) => !(current.leads || []).some((p) => p.id === l.id))
  const removedLeads = (current.leads || []).filter((l) => !nextLeads.some((n) => n.id === l.id))
  await audit({
    action: 'studio.update',
    userId: actor.user.id,
    studioId: current.id,
    ip: clientIp(c),
    detail: `leads ${nextLeads.length} (+${addedLeads.length}/-${removedLeads.length}) quotes ${nextQuotes.length}`,
  })
  for (const lead of addedLeads) {
    await audit({
      action: 'lead.create',
      userId: actor.user.id,
      studioId: current.id,
      ip: clientIp(c),
      detail: `${lead.coupleName} · ${lead.phone || 'no phone'} · ${lead.eventDate || 'date pending'} · entered ${lead.createdOn || todayIso()}`,
    })
  }
  return c.json(await snapshot(actor.user.id))
})

app.get('/studio/activity', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  const rows = await getStore().listAudit({ studioId: actor.studio.id, limit: 80 })
  return c.json({
    events: rows.map((r) => ({
      id: r.id,
      action: r.action,
      detail: r.detail,
      createdAt: r.createdAt,
    })),
  })
})

app.post('/studio/reset-demo', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  if (actor.user.email !== DEMO_EMAIL) {
    return c.json({ error: "You don't have permission to perform this action." }, 403)
  }
  const seeded = seedState()
  await getStore().upsertStudio({
    ...actor.studio,
    name: seeded.studio.name,
    owner: seeded.studio.owner,
    city: seeded.studio.city,
    phone: seeded.studio.phone,
    tagline: seeded.studio.tagline,
    onboarded: false,
    leads: seeded.leads,
    quotations: seeded.quotations,
  })
  await audit({ action: 'demo.reset', userId: actor.user.id, studioId: actor.studio.id, ip: clientIp(c) })
  await notifySimple({
    email: actor.user.email,
    studio: {
      name: actor.studio.name,
      owner: actor.studio.owner,
      city: actor.studio.city,
      phone: actor.studio.phone,
      tagline: actor.studio.tagline,
    },
    subject: `[GOLDHOUR DEMO] Desk reset`,
    detail: 'They reset the Meenakshi Frames demo data.',
  })
  return c.json(await snapshot(actor.user.id))
})

app.post('/billing/checkout', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  if (actor.user.email === DEMO_EMAIL || isAdminEmail(actor.user.email)) {
    return c.json({ error: 'HQ and the demo desk stay free. Create a studio account to subscribe.' }, 400)
  }
  const body = await readJson<{ plan?: string }>(c)
  const plan = PLANS[body.plan as PaidPlanId]
  if (!plan) return c.json({ error: 'Pick Studio or Studio Pro.' }, 400)
  const db = getStore()
  const sub = await db.getSub(actor.user.id)
  if (sub) {
    await db.upsertSub({ ...sub, requestedPlan: plan.id })
  } else {
    await db.upsertSub({
      userId: actor.user.id,
      plan: 'trial',
      status: 'trialing',
      trialEndsOn: trialEnd(),
      periodEndsOn: null,
      razorpayPaymentId: null,
      requestedPlan: plan.id,
    })
  }
  await audit({
    action: 'billing.request',
    userId: actor.user.id,
    studioId: actor.studio.id,
    detail: plan.id,
    ip: clientIp(c),
  })
  try {
    await notifyPlanRequest({
      email: actor.user.email,
      studio: {
        name: actor.studio.name,
        owner: actor.studio.owner,
        city: actor.studio.city,
        phone: actor.studio.phone,
        tagline: actor.studio.tagline,
      },
      plan: plan.id,
      current: sub ? billingStatus(sub).plan : 'trial',
    })
  } catch (err) {
    console.error('goldhour-notify-request', err)
  }
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return c.json({
      requested: true,
      message: `HQ has your ${plan.name} request. They will switch your desk — you do not have to wait.`,
    })
  }
  const receipt = `gh_${newId().replace(/-/g, '').slice(0, 32)}`
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: plan.amountPaise,
      currency: 'INR',
      receipt,
      notes: { userId: actor.user.id, plan: plan.id, studio: actor.studio.name },
    }),
  })
  const json = (await res.json()) as { id?: string; error?: { description?: string } }
  if (!res.ok || !json.id) {
    return c.json({ error: 'Could not start checkout. Try again.' }, 502)
  }
  await getStore().insertOrder({
    id: newId(),
    userId: actor.user.id,
    razorpayOrderId: json.id,
    plan: plan.id,
    amount: plan.amountPaise,
    status: 'created',
    createdAt: new Date().toISOString(),
  })
  await audit({ action: 'billing.checkout', userId: actor.user.id, studioId: actor.studio.id, detail: plan.id, ip: clientIp(c) })
  await notifyCheckout(
    {
      name: actor.studio.name,
      owner: actor.studio.owner,
      city: actor.studio.city,
      phone: actor.studio.phone,
      tagline: actor.studio.tagline,
    },
    actor.user.email,
    plan.id,
  )
  return c.json({
    keyId,
    orderId: json.id,
    amount: plan.amountPaise,
    plan: plan.id,
    name: 'GoldHour',
    description: `${plan.name} · ${actor.studio.name}`,
    email: actor.user.email,
    phone: actor.studio.phone,
  })
})

app.post('/billing/confirm', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return c.json({ error: 'Card checkout is not connected yet. Ask HQ to start your plan now.' }, 503)
  const body = await readJson<{
    razorpay_order_id?: string
    razorpay_payment_id?: string
    razorpay_signature?: string
  }>(c)
  const orderId = body.razorpay_order_id || ''
  const paymentId = body.razorpay_payment_id || ''
  const signature = body.razorpay_signature || ''
  const expected = razorpaySignature(orderId, paymentId, secret)
  if (!safeEqual(expected, signature)) {
    await audit({ action: 'billing.bad_signature', userId: actor.user.id, ip: clientIp(c) })
    return c.json({ error: 'Payment could not be recorded. Your data has not been changed.' }, 400)
  }
  const order = await getStore().findOrderByRazorpayId(orderId)
  if (!order || order.userId !== actor.user.id) {
    return c.json({ error: 'Order not found.' }, 404)
  }
  await getStore().markOrderPaid(orderId, paymentId)
  await notifyPaid(actor.studio, actor.user.email, order.plan, order.amount)
  await audit({
    action: 'billing.paid',
    userId: actor.user.id,
    studioId: actor.studio.id,
    detail: `${order.plan}:${order.amount}`,
    ip: clientIp(c),
  })
  return c.json(await snapshot(actor.user.id))
})

app.post('/billing/webhook', async (c) => {
  const raw = await c.req.text()
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (secret) {
    const sig = c.req.header('x-razorpay-signature') || ''
    if (!safeEqual(webhookSignature(raw, secret), sig)) {
      return c.json({ error: 'Bad webhook signature' }, 400)
    }
  }
  let event: { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } } } }
  try {
    event = JSON.parse(raw) as typeof event
  } catch {
    return c.json({ error: 'Bad payload' }, 400)
  }
  const orderId = event.payload?.payment?.entity?.order_id
  const paymentId = event.payload?.payment?.entity?.id
  if (event.event === 'payment.captured' && orderId && paymentId) {
    const order = await getStore().findOrderByRazorpayId(orderId)
    await getStore().markOrderPaid(orderId, paymentId)
    if (order) {
      const user = await getStore().findUserById(order.userId)
      const studio = await getStore().getStudio(order.userId)
      if (user && studio) {
        await notifyPaid(studio, user.email, order.plan, order.amount)
        await audit({ action: 'billing.paid', userId: user.id, studioId: studio.id, detail: `webhook:${order.plan}` })
      }
    }
  }
  return c.json({ ok: true })
})

app.get('/notices', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  const db = getStore()
  const hq = isAdminEmail(actor.user.email) || actor.user.role === 'hq'
  if (hq) {
    try {
      const [tenants, audit] = await Promise.all([db.listTenants(), billingAwareAudit()])
      const notices = hqNotices({ tenants, audit })
      try {
        await mailNewHqNotices(notices)
      } catch (err) {
        console.error('goldhour-notices-mail', err)
      }
      return c.json({ notices })
    } catch (err) {
      console.error('goldhour-notices', err)
      return c.json({ notices: [] })
    }
  }
  const sub = await db.getSub(actor.user.id)
  const audit = await billingAwareAudit(actor.studio.id)
  const billing = {
    status: sub ? billingStatus(sub).status : actor.user.email === DEMO_EMAIL ? 'active' : 'trialing',
    trialEndsOn: sub?.trialEndsOn || '',
    plan: sub ? billingStatus(sub).plan : 'trial',
  }
  const pro =
    actor.user.email === DEMO_EMAIL || billing.status === 'trialing' || billing.plan === 'studio_pro'
  return c.json({
    notices: studioNotices({
      leads: actor.studio.leads || [],
      billing,
      audit,
      pro,
    }),
  })
})

app.get('/admin/overview', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  if (!isAdminEmail(actor.user.email) && actor.user.role !== 'hq') {
    await audit({ action: 'authz.denied', userId: actor.user.id, ip: clientIp(c), detail: 'admin.overview' })
    return c.json({ error: "You don't have permission to perform this action." }, 403)
  }
  const db = getStore()
  const [tenants, auditRows] = await Promise.all([db.listTenants(), billingAwareAudit()])
  await audit({ action: 'admin.overview', userId: actor.user.id, ip: clientIp(c) })
  const mapped = tenants.map((row) => {
    const profile = {
      name: row.studio?.name || 'Untitled studio',
      owner: row.studio?.owner || '',
      city: row.studio?.city || '',
      phone: row.studio?.phone || '',
      tagline: row.studio?.tagline || '',
    }
    const billing = row.sub
      ? billingStatus(row.sub)
      : { plan: 'trial', status: 'expired' as const, trialEndsOn: '', periodEndsOn: null, active: false }
    const admin = isAdminEmail(row.user.email)
    const leads = Array.isArray(row.studio?.leads) ? row.studio.leads : []
    const quotations = Array.isArray(row.studio?.quotations) ? row.studio.quotations : []
    const pending = admin
      ? null
      : pendingPlanRequest({
          userId: row.user.id,
          studioId: row.studio?.id,
          currentPlan: billing.plan,
          status: billing.status,
          stored: row.sub?.requestedPlan,
          audit: auditRows,
        })
    return {
      row,
      tenant: {
        email: row.user.email,
        createdAt: row.user.createdAt,
        isDemo: row.user.email === DEMO_EMAIL,
        isAdmin: admin,
        studio: profile,
        leads,
        quotations,
        billing: {
          plan: admin ? 'hq' : billing.plan,
          status: admin ? 'active' : billing.status,
          trialEndsOn: billing.trialEndsOn,
          periodEndsOn: billing.periodEndsOn,
          active: admin || billing.active,
          requestedPlan: pending?.plan || null,
          requestedAt: pending?.at || null,
        },
      },
    }
  })
  await Promise.all(
    mapped.flatMap(({ row, tenant }) => {
      if (!tenant.billing.requestedPlan || !row.sub || row.sub.requestedPlan === tenant.billing.requestedPlan) return []
      return [db.upsertSub({ ...row.sub, requestedPlan: tenant.billing.requestedPlan })]
    }),
  )
  return c.json({
    isAdmin: true,
    tenants: mapped.map((item) => item.tenant),
  })
})

app.get('/admin/audit', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  if (!isAdminEmail(actor.user.email) && actor.user.role !== 'hq') {
    return c.json({ error: "You don't have permission to perform this action." }, 403)
  }
  const rows = await getStore().listAudit({ limit: 80 })
  return c.json({
    events: rows.map((r) => ({
      id: r.id,
      action: r.action,
      detail: r.detail,
      createdAt: r.createdAt,
      userId: r.userId,
      studioId: r.studioId,
    })),
  })
})

app.post('/admin/activate-plan', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  if (!isAdminEmail(actor.user.email) && actor.user.role !== 'hq') {
    return c.json({ error: "You don't have permission to perform this action." }, 403)
  }
  const body = await readJson<{ email?: string; plan?: string }>(c)
  const plan = PLANS[body.plan as PaidPlanId]
  const email = (body.email || '').trim().toLowerCase()
  if (!plan || !email) return c.json({ error: 'Pick a studio and a plan.' }, 400)
  const db = getStore()
  const user = await db.findUserByEmail(email)
  if (!user) return c.json({ error: 'Studio not found.' }, 404)
  if (isAdminEmail(user.email) || user.email === DEMO_EMAIL) {
    return c.json({ error: 'HQ and the demo desk stay free.' }, 400)
  }
  const studio = await db.getStudio(user.id)
  const sub = await db.getSub(user.id)
  if (!studio || !sub) return c.json({ error: 'Studio not found.' }, 404)
  await db.upsertSub({
    ...sub,
    plan: plan.id,
    status: 'active',
    razorpayPaymentId: sub.razorpayPaymentId || 'hq-activate',
    periodEndsOn: addDays(todayIso(), plan.days),
    requestedPlan: null,
  })
  await notifyPlanApproved(studio, user.email, plan.id)
  await audit({
    action: 'billing.activate',
    userId: actor.user.id,
    studioId: studio.id,
    detail: `${email}:${plan.id}`,
    ip: clientIp(c),
  })
  return c.json({ ok: true })
})

export default app
