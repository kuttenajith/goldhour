import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'
import type { Lead, Quotation, StudioProfile } from '../src/lib/types.ts'
import { seedState } from '../src/lib/seed.ts'
import { hashPassword, newId } from './crypto.ts'

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

export type StudioRow = {
  id: string
  userId: string
  name: string
  owner: string
  city: string
  phone: string
  tagline: string
  onboarded: boolean
  leads: Lead[]
  quotations: Quotation[]
}

export type SubRow = {
  userId: string
  plan: string
  status: string
  trialEndsOn: string
  periodEndsOn: string | null
  razorpayPaymentId: string | null
}

export type OrderRow = {
  id: string
  userId: string
  razorpayOrderId: string
  plan: string
  amount: number
  status: string
  createdAt: string
}

export type Store = {
  migrate(): Promise<void>
  findUserByEmail(email: string): Promise<UserRow | null>
  findUserById(id: string): Promise<UserRow | null>
  insertUser(user: UserRow): Promise<void>
  getStudio(userId: string): Promise<StudioRow | null>
  upsertStudio(studio: StudioRow): Promise<void>
  getSub(userId: string): Promise<SubRow | null>
  upsertSub(sub: SubRow): Promise<void>
  insertOrder(order: OrderRow): Promise<void>
  findOrderByRazorpayId(id: string): Promise<OrderRow | null>
  markOrderPaid(razorpayOrderId: string, paymentId: string): Promise<void>
  ensureDemo(): Promise<UserRow>
}

const DEMO_EMAIL = 'demo@goldhour.app'

function emptyStudio(userId: string, profile: Partial<StudioProfile> & { name: string }): StudioRow {
  return {
    id: newId(),
    userId,
    name: profile.name,
    owner: profile.owner || '',
    city: profile.city || '',
    phone: profile.phone || '',
    tagline: profile.tagline || 'Wedding photography',
    onboarded: false,
    leads: [],
    quotations: [],
  }
}

async function seedDemo(store: Store) {
  const existing = await store.findUserByEmail(DEMO_EMAIL)
  if (existing) return existing
  const seeded = seedState()
  const user: UserRow = {
    id: newId(),
    email: DEMO_EMAIL,
    passwordHash: hashPassword('2026'),
    createdAt: new Date().toISOString(),
  }
  await store.insertUser(user)
  await store.upsertStudio({
    id: newId(),
    userId: user.id,
    name: seeded.studio.name,
    owner: seeded.studio.owner,
    city: seeded.studio.city,
    phone: seeded.studio.phone,
    tagline: seeded.studio.tagline,
    onboarded: false,
    leads: seeded.leads,
    quotations: seeded.quotations,
  })
  await store.upsertSub({
    userId: user.id,
    plan: 'trial',
    status: 'trialing',
    trialEndsOn: '2099-12-31',
    periodEndsOn: null,
    razorpayPaymentId: null,
  })
  return user
}

type FileShape = {
  users: UserRow[]
  studios: StudioRow[]
  subs: SubRow[]
  orders: OrderRow[]
}

function fileStore(path: string): Store {
  const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('node:fs') as typeof import('node:fs')
  const { dirname } = require('node:path') as typeof import('node:path')
  const empty = (): FileShape => ({ users: [], studios: [], subs: [], orders: [] })

  function read(): FileShape {
    if (!existsSync(path)) return empty()
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as FileShape
    } catch {
      return empty()
    }
  }

  function write(next: FileShape) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(next, null, 2))
  }

  const store: Store = {
    async migrate() {
      write(read())
    },
    async findUserByEmail(email) {
      return read().users.find((u) => u.email === email) ?? null
    },
    async findUserById(id) {
      return read().users.find((u) => u.id === id) ?? null
    },
    async insertUser(user) {
      const db = read()
      if (db.users.some((u) => u.email === user.email)) throw new Error('EMAIL_TAKEN')
      db.users.push(user)
      write(db)
    },
    async getStudio(userId) {
      return read().studios.find((s) => s.userId === userId) ?? null
    },
    async upsertStudio(studio) {
      const db = read()
      const i = db.studios.findIndex((s) => s.userId === studio.userId)
      if (i === -1) db.studios.push(studio)
      else db.studios[i] = studio
      write(db)
    },
    async getSub(userId) {
      return read().subs.find((s) => s.userId === userId) ?? null
    },
    async upsertSub(sub) {
      const db = read()
      const i = db.subs.findIndex((s) => s.userId === sub.userId)
      if (i === -1) db.subs.push(sub)
      else db.subs[i] = sub
      write(db)
    },
    async insertOrder(order) {
      const db = read()
      db.orders.push(order)
      write(db)
    },
    async findOrderByRazorpayId(id) {
      return read().orders.find((o) => o.razorpayOrderId === id) ?? null
    },
    async markOrderPaid(razorpayOrderId, paymentId) {
      const db = read()
      const order = db.orders.find((o) => o.razorpayOrderId === razorpayOrderId)
      if (!order) return
      order.status = 'paid'
      const sub = db.subs.find((s) => s.userId === order.userId)
      if (sub) {
        sub.plan = order.plan
        sub.status = 'active'
        sub.razorpayPaymentId = paymentId
        const start = sub.periodEndsOn && sub.periodEndsOn > new Date().toISOString().slice(0, 10)
          ? sub.periodEndsOn
          : new Date().toISOString().slice(0, 10)
        const days = order.plan === 'studio_pro' ? 30 : 30
        const d = new Date(`${start}T00:00:00.000Z`)
        d.setUTCDate(d.getUTCDate() + days)
        sub.periodEndsOn = d.toISOString().slice(0, 10)
      }
      write(db)
    },
    async ensureDemo() {
      return seedDemo(store)
    },
  }
  return store
}

function postgresStore(url: string): Store {
  const sql = neon(url)

  const store: Store = {
    async migrate() {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`
      await sql`CREATE TABLE IF NOT EXISTS studios (
        id text PRIMARY KEY,
        user_id text UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        owner text NOT NULL DEFAULT '',
        city text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        tagline text NOT NULL DEFAULT '',
        onboarded boolean NOT NULL DEFAULT false,
        leads jsonb NOT NULL DEFAULT '[]'::jsonb,
        quotations jsonb NOT NULL DEFAULT '[]'::jsonb
      )`
      await sql`CREATE TABLE IF NOT EXISTS subscriptions (
        user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        plan text NOT NULL,
        status text NOT NULL,
        trial_ends_on date NOT NULL,
        period_ends_on date,
        razorpay_payment_id text
      )`
      await sql`CREATE TABLE IF NOT EXISTS billing_orders (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        razorpay_order_id text UNIQUE NOT NULL,
        plan text NOT NULL,
        amount integer NOT NULL,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`
    },
    async findUserByEmail(email) {
      const rows = await sql`SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt" FROM users WHERE email = ${email}`
      return (rows[0] as UserRow) ?? null
    },
    async findUserById(id) {
      const rows = await sql`SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt" FROM users WHERE id = ${id}`
      return (rows[0] as UserRow) ?? null
    },
    async insertUser(user) {
      try {
        await sql`INSERT INTO users (id, email, password_hash, created_at) VALUES (${user.id}, ${user.email}, ${user.passwordHash}, ${user.createdAt})`
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        if (message.includes('unique') || message.includes('duplicate')) throw new Error('EMAIL_TAKEN')
        throw err
      }
    },
    async getStudio(userId) {
      const rows = await sql`SELECT id, user_id AS "userId", name, owner, city, phone, tagline, onboarded, leads, quotations FROM studios WHERE user_id = ${userId}`
      const row = rows[0] as StudioRow | undefined
      return row ?? null
    },
    async upsertStudio(studio) {
      await sql`INSERT INTO studios (id, user_id, name, owner, city, phone, tagline, onboarded, leads, quotations)
        VALUES (${studio.id}, ${studio.userId}, ${studio.name}, ${studio.owner}, ${studio.city}, ${studio.phone}, ${studio.tagline}, ${studio.onboarded}, ${JSON.stringify(studio.leads)}::jsonb, ${JSON.stringify(studio.quotations)}::jsonb)
        ON CONFLICT (user_id) DO UPDATE SET
          name = excluded.name,
          owner = excluded.owner,
          city = excluded.city,
          phone = excluded.phone,
          tagline = excluded.tagline,
          onboarded = excluded.onboarded,
          leads = excluded.leads,
          quotations = excluded.quotations`
    },
    async getSub(userId) {
      const rows = await sql`SELECT user_id AS "userId", plan, status, trial_ends_on AS "trialEndsOn", period_ends_on AS "periodEndsOn", razorpay_payment_id AS "razorpayPaymentId" FROM subscriptions WHERE user_id = ${userId}`
      const row = rows[0] as SubRow | undefined
      if (!row) return null
      return {
        ...row,
        trialEndsOn: String(row.trialEndsOn).slice(0, 10),
        periodEndsOn: row.periodEndsOn ? String(row.periodEndsOn).slice(0, 10) : null,
      }
    },
    async upsertSub(sub) {
      await sql`INSERT INTO subscriptions (user_id, plan, status, trial_ends_on, period_ends_on, razorpay_payment_id)
        VALUES (${sub.userId}, ${sub.plan}, ${sub.status}, ${sub.trialEndsOn}, ${sub.periodEndsOn}, ${sub.razorpayPaymentId})
        ON CONFLICT (user_id) DO UPDATE SET
          plan = excluded.plan,
          status = excluded.status,
          trial_ends_on = excluded.trial_ends_on,
          period_ends_on = excluded.period_ends_on,
          razorpay_payment_id = excluded.razorpay_payment_id`
    },
    async insertOrder(order) {
      await sql`INSERT INTO billing_orders (id, user_id, razorpay_order_id, plan, amount, status, created_at)
        VALUES (${order.id}, ${order.userId}, ${order.razorpayOrderId}, ${order.plan}, ${order.amount}, ${order.status}, ${order.createdAt})`
    },
    async findOrderByRazorpayId(id) {
      const rows = await sql`SELECT id, user_id AS "userId", razorpay_order_id AS "razorpayOrderId", plan, amount, status, created_at AS "createdAt" FROM billing_orders WHERE razorpay_order_id = ${id}`
      return (rows[0] as OrderRow) ?? null
    },
    async markOrderPaid(razorpayOrderId, paymentId) {
      const order = await store.findOrderByRazorpayId(razorpayOrderId)
      if (!order) return
      await sql`UPDATE billing_orders SET status = 'paid' WHERE razorpay_order_id = ${razorpayOrderId}`
      const sub = await store.getSub(order.userId)
      if (!sub) return
      const today = new Date().toISOString().slice(0, 10)
      const start = sub.periodEndsOn && sub.periodEndsOn > today ? sub.periodEndsOn : today
      const d = new Date(`${start}T00:00:00.000Z`)
      d.setUTCDate(d.getUTCDate() + 30)
      await store.upsertSub({
        ...sub,
        plan: order.plan,
        status: 'active',
        razorpayPaymentId: paymentId,
        periodEndsOn: d.toISOString().slice(0, 10),
      })
    },
    async ensureDemo() {
      return seedDemo(store)
    },
  }
  return store
}

let cached: Store | null = null

export function getStore(): Store {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (process.env.VERCEL && !url) {
    throw new Error('DATABASE_URL is required on Vercel')
  }
  cached = url ? postgresStore(url) : fileStore(resolve(process.cwd(), '.data/goldhour.json'))
  return cached
}

export { emptyStudio, DEMO_EMAIL }
