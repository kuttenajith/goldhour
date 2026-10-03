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
import { emptyStudio, getStore, type UserRow } from './db.ts'
import { mailUser } from './mail.ts'
import { notifyLeadChanges, notifyPaid, notifyStudioSignup } from './notify.ts'
import { PLANS, billingStatus, trialEnd, type PaidPlanId } from './plans.ts'
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
  })
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
  if (!emailOk(email) || !passwordOk(password) || studioName.length < 2) {
    return c.json({ error: 'Email, studio name, and an 8+ character password are required.' }, 400)
  }
  await getStore().recordAuthAttempt(email, ip, true)
  const db = getStore()
  const admin = isAdminEmail(email)
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
  })
  if (!admin) {
    notifyStudioSignup(
      {
        name: studio.name,
        owner: studio.owner,
        city: studio.city,
        phone: studio.phone,
        tagline: studio.tagline,
      },
      email,
    )
    const token = randomToken()
    await db.createToken({
      id: newId(),
      userId: user.id,
      kind: 'verify_email',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      usedAt: null,
    })
    void mailUser(
      email,
      'Confirm your GoldHour studio',
      `Confirm this studio email:\n${APP_URL}/api/auth/verify?token=${token}\n\nIf you did not create a GoldHour desk, ignore this.`,
    )
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
  return c.json(await snapshot(user.id))
})

app.post('/auth/demo', async (c) => {
  const ip = clientIp(c)
  if (await lockedOut('demo', ip)) {
    return c.json({ error: 'Too many attempts. Wait 15 minutes.' }, 429)
  }
  const body = await readJson<{ pin?: string }>(c)
  if (body.pin?.trim() !== DEMO_PIN) {
    await getStore().recordAuthAttempt('demo', ip, false)
    return c.json({ error: 'Use PIN 2026 for the Madurai demo.' }, 401)
  }
  const demo = await getStore().ensureDemo()
  await setSession(c, demo.id, true)
  await audit({ action: 'login.demo', userId: demo.id, ip })
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
  void mailUser(
    email,
    'Reset your GoldHour password',
    `Reset link (30 minutes):\n${APP_URL}/reset?token=${token}\n\nIf you did not ask for this, ignore the mail.`,
  )
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
  await audit({ action: 'password.reset', userId: row.userId, ip: clientIp(c) })
  return c.json({ ok: true })
})

app.get('/auth/verify', async (c) => {
  const token = c.req.query('token')?.trim() || ''
  if (!token) return c.redirect(`${APP_URL}/login?verify=missing`)
  const row = await getStore().consumeToken('verify_email', hashToken(token))
  if (!row) return c.redirect(`${APP_URL}/login?verify=expired`)
  await getStore().markEmailVerified(row.userId)
  await audit({ action: 'email.verified', userId: row.userId, ip: clientIp(c) })
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
  notifyLeadChanges({
    email: actor.user.email,
    studio: profile,
    before: current.leads || [],
    after: nextLeads,
    quotationsBefore: current.quotations || [],
    quotationsAfter: nextQuotes,
  })
  const added = nextLeads.filter((l) => !(current.leads || []).some((p) => p.id === l.id)).length
  const removed = (current.leads || []).filter((l) => !nextLeads.some((n) => n.id === l.id)).length
  await audit({
    action: 'studio.update',
    userId: actor.user.id,
    studioId: current.id,
    ip: clientIp(c),
    detail: `leads ${nextLeads.length} (+${added}/-${removed}) quotes ${nextQuotes.length}`,
  })
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
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return c.json(
      { error: 'Payments are not open yet. Your 14-day trial still works.' },
      503,
    )
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
  if (!secret) return c.json({ error: 'Payments are not open yet.' }, 503)
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
  notifyPaid(actor.studio, actor.user.email, order.plan, order.amount)
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
        notifyPaid(studio, user.email, order.plan, order.amount)
        await audit({ action: 'billing.paid', userId: user.id, studioId: studio.id, detail: `webhook:${order.plan}` })
      }
    }
  }
  return c.json({ ok: true })
})

app.get('/admin/overview', async (c) => {
  const actor = await actorFrom(c)
  if (!actor) return c.json({ error: 'Sign in required' }, 401)
  if (!isAdminEmail(actor.user.email) && actor.user.role !== 'hq') {
    await audit({ action: 'authz.denied', userId: actor.user.id, ip: clientIp(c), detail: 'admin.overview' })
    return c.json({ error: "You don't have permission to perform this action." }, 403)
  }
  const tenants = await getStore().listTenants()
  await audit({ action: 'admin.overview', userId: actor.user.id, ip: clientIp(c) })
  return c.json({
    isAdmin: true,
    tenants: tenants.map((row) => {
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
      return {
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
        },
      }
    }),
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

export default app
