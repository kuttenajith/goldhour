import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { DEMO_PIN, seedState } from '../src/lib/seed.ts'
import type { Lead, Quotation, StudioProfile } from '../src/lib/types.ts'
import { hashPassword, jwtSecret, newId, razorpaySignature, safeEqual, verifyPassword, webhookSignature } from './crypto.ts'
import { DEMO_EMAIL, emptyStudio, getStore } from './db.ts'
import { ADMIN_EMAIL, isAdminEmail, notifyLeadChanges, notifyPaid, notifyStudioSignup } from './notify.ts'
import { PLANS, billingStatus, trialEnd, type PaidPlanId } from './plans.ts'

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
    'HS256',
  )
  setCookie(c, 'goldhour_session', token, cookieOpts(c.req.url))
}

async function userIdFrom(c: Context) {
  const token = getCookie(c, 'goldhour_session')
  const secret = jwtSecret()
  if (!token || !secret) return null
  try {
    const payload = (await verify(token, secret, 'HS256')) as Jwt
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
  const admin = isAdminEmail(user.email)
  return {
    email: user.email,
    isAdmin: admin,
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
      plan: admin ? 'hq' : billing.plan,
      status: admin ? 'active' : billing.status,
      trialEndsOn: billing.trialEndsOn,
      periodEndsOn: billing.periodEndsOn,
      active: admin || billing.active,
    },
  }
}

async function claimAdmin(password: string) {
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD')
  }
  const db = getStore()
  const user = {
    id: newId(),
    email: ADMIN_EMAIL,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
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
  console.error(err)
  return c.json({ error: err.message || 'Server error' }, 500)
})

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
  const admin = isAdminEmail(email)
  await db.upsertStudio(
    admin
      ? {
          ...emptyStudio(user.id, {
            name: 'GoldHour HQ',
            owner: 'Ajith',
            city: body.city?.trim() || 'Madurai',
            phone: body.phone?.trim() || '',
            tagline: 'Operator desk',
          }),
          onboarded: true,
        }
      : emptyStudio(user.id, {
          name: studioName,
          owner: body.owner?.trim() || studioName,
          city: body.city?.trim() || '',
          phone: body.phone?.trim() || '',
        }),
  )
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
        name: studioName,
        owner: body.owner?.trim() || studioName,
        city: body.city?.trim() || '',
        phone: body.phone?.trim() || '',
        tagline: 'Wedding photography',
      },
      email,
    )
  }
  await setSession(c, user.id)
  return c.json(await snapshot(user.id))
})

app.post('/auth/login', async (c) => {
  const body = await readJson<{ email?: string; password?: string }>(c)
  const email = body.email?.trim().toLowerCase() || ''
  const password = body.password || ''
  const db = getStore()
  let user = await db.findUserByEmail(email)
  if (!user && isAdminEmail(email)) {
    try {
      user = await claimAdmin(password)
    } catch (err) {
      if (err instanceof Error && err.message === 'ADMIN_PASSWORD') {
        return c.json({ error: 'Set an 8+ character password on first HQ sign-in.' }, 400)
      }
      throw err
    }
  } else if (!user || !verifyPassword(password, user.passwordHash)) {
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
  const user = await db.findUserById(userId)
  if (!user) return c.json({ error: 'Studio missing' }, 404)
  const nextLeads = body.leads ?? current.leads
  const nextQuotes = body.quotations ?? current.quotations
  const nextStudio = body.studio
    ? {
        name: body.studio.name,
        owner: body.studio.owner,
        city: body.studio.city,
        phone: body.studio.phone,
        tagline: body.studio.tagline,
      }
    : {
        name: current.name,
        owner: current.owner,
        city: current.city,
        phone: current.phone,
        tagline: current.tagline,
      }
  await db.upsertStudio({
    ...current,
    ...nextStudio,
    leads: nextLeads,
    quotations: nextQuotes,
    onboarded: body.onboarded ?? current.onboarded,
  })
  notifyLeadChanges({
    email: user.email,
    studio: nextStudio,
    before: current.leads || [],
    after: nextLeads,
    quotationsBefore: current.quotations || [],
    quotationsAfter: nextQuotes,
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
  if (user.email === DEMO_EMAIL || isAdminEmail(user.email)) {
    return c.json({ error: 'HQ and the demo desk stay free. Create a studio account to subscribe.' }, 400)
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
  const studio = await getStore().getStudio(userId)
  const user = await getStore().findUserById(userId)
  if (studio && user) notifyPaid(studio, user.email, order.plan, order.amount)
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
    const order = await getStore().findOrderByRazorpayId(orderId)
    await getStore().markOrderPaid(orderId, paymentId)
    if (order) {
      const user = await getStore().findUserById(order.userId)
      const studio = await getStore().getStudio(order.userId)
      if (user && studio) notifyPaid(studio, user.email, order.plan, order.amount)
    }
  }
  return c.json({ ok: true })
})

app.get('/admin/overview', async (c) => {
  const userId = await userIdFrom(c)
  if (!userId) return c.json({ error: 'Sign in required' }, 401)
  const db = getStore()
  const me = await db.findUserById(userId)
  if (!me || !isAdminEmail(me.email)) {
    return c.json({ error: 'HQ only' }, 403)
  }
  const tenants = await db.listTenants()
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

export default app
