import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { DEMO_PIN, seedState } from '../src/lib/seed'
import type { Lead, Quotation, StudioProfile } from '../src/lib/types'
import { hashPassword, jwtSecret, newId, razorpaySignature, safeEqual, verifyPassword, webhookSignature } from './crypto'
import { DEMO_EMAIL, emptyStudio, getStore } from './db'
import { PLANS, billingStatus, trialEnd, type PaidPlanId } from './plans'

type Jwt = { sub: string; demo?: boolean }

async function readJson<T>(c: Context) {
  try {
    return await c.req.json<T>()
  } catch {
    return {} as T
  }
}

const app = new Hono().basePath('/api')

function cookieOpts(url: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: url.startsWith('https'),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }
}

async function setSession(c: Context, userId: string, demo = false) {
  const secret = jwtSecret()
  if (!secret) throw new Error('JWT_SECRET missing')
  const token = await sign(
    { sub: userId, demo, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    secret,
  )
  setCookie(c, 'goldhour_session', token, cookieOpts(c.req.url))
}

async function userIdFrom(c: Context) {
  const token = getCookie(c, 'goldhour_session')
  const secret = jwtSecret()
  if (!token || !secret) return null
  try {
    const payload = (await verify(token, secret)) as Jwt
    return payload.sub || null
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
  return {
    email: user.email,
    isDemo: user.email === DEMO_EMAIL,
    onboarded: studio.onboarded,
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
      plan: billing.plan,
      status: billing.status,
      trialEndsOn: billing.trialEndsOn,
      periodEndsOn: billing.periodEndsOn,
      active: billing.active,
    },
  }
}

app.use('*', async (c, next) => {
  await getStore().migrate()
  await getStore().ensureDemo()
  await next()
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Server error' }, 500)
})

app.get('/health', (c) => c.json({ ok: true }))

app.post('/auth/register', async (c) => {
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
  const studioName = body.studioName?.trim() || ''
  if (!email.includes('@') || password.length < 8 || studioName.length < 2) {
    return c.json({ error: 'Email, studio name, and an 8+ character password are required.' }, 400)
  }
  const db = getStore()
  const user = {
    id: newId(),
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }
  try {
    await db.insertUser(user)
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      return c.json({ error: 'That email already has a studio.' }, 409)
    }
    throw err
  }
  await db.upsertStudio(
    emptyStudio(user.id, {
      name: studioName,
      owner: body.owner?.trim() || studioName,
      city: body.city?.trim() || '',
      phone: body.phone?.trim() || '',
    }),
  )
  await db.upsertSub({
    userId: user.id,
    plan: 'trial',
    status: 'trialing',
    trialEndsOn: trialEnd(),
    periodEndsOn: null,
    razorpayPaymentId: null,
  })
  await setSession(c, user.id)
  return c.json(await snapshot(user.id))
})

app.post('/auth/login', async (c) => {
  const body = await readJson<{ email?: string; password?: string }>(c)
  const email = body.email?.trim().toLowerCase() || ''
  const user = await getStore().findUserByEmail(email)
  if (!user || !verifyPassword(body.password || '', user.passwordHash)) {
    return c.json({ error: 'Email or password is wrong.' }, 401)
  }
  await setSession(c, user.id, email === DEMO_EMAIL)
  return c.json(await snapshot(user.id))
})

app.post('/auth/demo', async (c) => {
  const body = await readJson<{ pin?: string }>(c)
  if (body.pin?.trim() !== DEMO_PIN) {
    return c.json({ error: 'Use PIN 2026 for the Madurai demo.' }, 401)
  }
  const demo = await getStore().ensureDemo()
  await setSession(c, demo.id, true)
  return c.json(await snapshot(demo.id))
})

app.post('/auth/logout', (c) => {
  deleteCookie(c, 'goldhour_session', { path: '/' })
  return c.json({ ok: true })
})

app.get('/studio', async (c) => {
  const userId = await userIdFrom(c)
  if (!userId) return c.json({ error: 'Sign in required' }, 401)
  const data = await snapshot(userId)
  if (!data) return c.json({ error: 'Studio missing' }, 404)
  return c.json(data)
})

app.put('/studio', async (c) => {
  const userId = await userIdFrom(c)
  if (!userId) return c.json({ error: 'Sign in required' }, 401)
  const db = getStore()
  const current = await db.getStudio(userId)
  if (!current) return c.json({ error: 'Studio missing' }, 404)
  const body = await readJson<{
    studio?: StudioProfile
    leads?: Lead[]
    quotations?: Quotation[]
    onboarded?: boolean
  }>(c)
  await db.upsertStudio({
    ...current,
    ...(body.studio
      ? {
          name: body.studio.name,
          owner: body.studio.owner,
          city: body.studio.city,
          phone: body.studio.phone,
          tagline: body.studio.tagline,
        }
      : {}),
    leads: body.leads ?? current.leads,
    quotations: body.quotations ?? current.quotations,
    onboarded: body.onboarded ?? current.onboarded,
  })
  return c.json(await snapshot(userId))
})

app.post('/studio/reset-demo', async (c) => {
  const userId = await userIdFrom(c)
  if (!userId) return c.json({ error: 'Sign in required' }, 401)
  const db = getStore()
  const user = await db.findUserById(userId)
  if (!user || user.email !== DEMO_EMAIL) {
    return c.json({ error: 'Only the demo desk can be reset.' }, 403)
  }
  const current = await db.getStudio(userId)
  const seeded = seedState()
  if (!current) return c.json({ error: 'Studio missing' }, 404)
  await db.upsertStudio({
    ...current,
    name: seeded.studio.name,
    owner: seeded.studio.owner,
    city: seeded.studio.city,
    phone: seeded.studio.phone,
    tagline: seeded.studio.tagline,
    onboarded: false,
    leads: seeded.leads,
    quotations: seeded.quotations,
  })
  return c.json(await snapshot(userId))
})

app.post('/billing/checkout', async (c) => {
  const userId = await userIdFrom(c)
  if (!userId) return c.json({ error: 'Sign in required' }, 401)
  const user = await getStore().findUserById(userId)
  const studio = await getStore().getStudio(userId)
  if (!user || !studio) return c.json({ error: 'Studio missing' }, 404)
  if (user.email === DEMO_EMAIL) {
    return c.json({ error: 'Create your own studio to subscribe. The demo desk stays free.' }, 400)
  }
  const body = await readJson<{ plan?: string }>(c)
  const plan = PLANS[body.plan as PaidPlanId]
  if (!plan) return c.json({ error: 'Pick Studio or Studio Pro.' }, 400)
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return c.json(
      { error: 'Razorpay keys are not set yet. Your 14-day trial still works. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on Vercel to take payments.' },
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
      notes: { userId, plan: plan.id, studio: studio.name },
    }),
  })
  const json = (await res.json()) as { id?: string; error?: { description?: string } }
  if (!res.ok || !json.id) {
    return c.json({ error: json.error?.description || 'Could not start Razorpay checkout.' }, 502)
  }
  await getStore().insertOrder({
    id: newId(),
    userId,
    razorpayOrderId: json.id,
    plan: plan.id,
    amount: plan.amountPaise,
    status: 'created',
    createdAt: new Date().toISOString(),
  })
  return c.json({
    keyId,
    orderId: json.id,
    amount: plan.amountPaise,
    plan: plan.id,
    name: 'GoldHour',
    description: `${plan.name} · ${studio.name}`,
    email: user.email,
    phone: studio.phone,
  })
})

app.post('/billing/confirm', async (c) => {
  const userId = await userIdFrom(c)
  if (!userId) return c.json({ error: 'Sign in required' }, 401)
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return c.json({ error: 'Razorpay is not configured.' }, 503)
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
    return c.json({ error: 'Payment signature did not match.' }, 400)
  }
  const order = await getStore().findOrderByRazorpayId(orderId)
  if (!order || order.userId !== userId) {
    return c.json({ error: 'Order not found.' }, 404)
  }
  await getStore().markOrderPaid(orderId, paymentId)
  return c.json(await snapshot(userId))
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
  const event = JSON.parse(raw) as {
    event?: string
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } }
  }
  const orderId = event.payload?.payment?.entity?.order_id
  const paymentId = event.payload?.payment?.entity?.id
  if (event.event === 'payment.captured' && orderId && paymentId) {
    await getStore().markOrderPaid(orderId, paymentId)
  }
  return c.json({ ok: true })
})

export default app
