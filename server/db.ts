import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { neon, neonConfig } from '@neondatabase/serverless'

neonConfig.fetchConnectionCache = true
import type { AppNotice, Lead, Quotation, StudioProfile } from '../src/lib/types.ts'
import { seedState } from '../src/lib/seed.ts'
import { ADMIN_EMAIL, DEMO_EMAIL } from './constants.ts'
import { hashPassword, newId } from './crypto.ts'
import { toIso } from './iso.ts'

export type UserRole = 'owner' | 'hq'

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  createdAt: string
  emailVerifiedAt: string | null
  role: UserRole
  deletedAt: string | null
}

export type SessionRow = {
  id: string
  userId: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  ip: string
  userAgent: string
}

export type TokenRow = {
  id: string
  userId: string
  kind: 'verify_email' | 'reset_password'
  tokenHash: string
  expiresAt: string
  usedAt: string | null
}

export type AuditRow = {
  id: string
  studioId: string | null
  userId: string | null
  action: string
  detail: string
  ip: string
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
  requestedPlan: string | null
}

export type OrderRow = {
  id: string
  userId: string
  razorpayOrderId: string
  plan: string
  amount: number
  status: string
  createdAt: string
  paidAt: string | null
  razorpayPaymentId: string | null
}

export type PhoneOtpRow = {
  phone: string
  codeHash: string
  expiresAt: string
  verifiedAt: string | null
  sentAt: string
  tries: number
}

export type TenantPublic = {
  user: { id: string; email: string; createdAt: string; deletedAt: string | null }
  studio: StudioRow | null
  sub: SubRow | null
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
  listOrders(): Promise<OrderRow[]>
  markOrderPaid(razorpayOrderId: string, paymentId: string): Promise<void>
  setUserDeleted(userId: string, deletedAt: string | null): Promise<void>
  ensureDemo(): Promise<UserRow>
  listTenants(): Promise<TenantPublic[]>
  updatePassword(userId: string, passwordHash: string): Promise<void>
  markEmailVerified(userId: string): Promise<void>
  createSession(row: SessionRow): Promise<void>
  getSession(id: string): Promise<SessionRow | null>
  revokeSession(id: string): Promise<void>
  revokeUserSessions(userId: string): Promise<void>
  recordAuthAttempt(email: string, ip: string, ok: boolean): Promise<void>
  countRecentFailures(email: string, ip: string, sinceIso: string): Promise<{ email: number; ip: number }>
  createToken(row: TokenRow): Promise<void>
  consumeToken(kind: TokenRow['kind'], tokenHash: string): Promise<TokenRow | null>
  insertAudit(row: AuditRow): Promise<void>
  listAudit(opts: { studioId?: string; limit?: number; actionPrefix?: string }): Promise<AuditRow[]>
  claimUnmailed(ids: string[]): Promise<string[]>
  releaseMailed(ids: string[]): Promise<void>
  putPhoneOtp(row: PhoneOtpRow): Promise<void>
  getPhoneOtp(phone: string): Promise<PhoneOtpRow | null>
  getSetting(key: string): Promise<string | null>
  putSetting(key: string, value: string): Promise<void>
  upsertHqNotice(notice: AppNotice): Promise<void>
  listHqNotices(): Promise<AppNotice[]>
}

function mapUser(row: Partial<UserRow> & { id: string; email: string; passwordHash?: string; password_hash?: string; createdAt?: string; created_at?: string; emailVerifiedAt?: string | null; email_verified_at?: string | null; deletedAt?: string | null; deleted_at?: string | null; role?: string }): UserRow {
  const email = String(row.email).toLowerCase()
  const verified = row.emailVerifiedAt ?? row.email_verified_at ?? null
  const deleted = row.deletedAt ?? row.deleted_at ?? null
  return {
    id: row.id,
    email,
    passwordHash: row.passwordHash || row.password_hash || '',
    createdAt: toIso(row.createdAt || row.created_at, new Date().toISOString()),
    emailVerifiedAt: verified ? toIso(verified) || null : null,
    role: row.role === 'hq' || email === ADMIN_EMAIL ? 'hq' : 'owner',
    deletedAt: deleted ? toIso(deleted) || null : null,
  }
}

function publicUser(user: UserRow): TenantPublic['user'] {
  return {
    id: user.id,
    email: user.email,
    createdAt: toIso(user.createdAt, new Date().toISOString()),
    deletedAt: user.deletedAt ? toIso(user.deletedAt) || null : null,
  }
}

function mapOrder(row: Partial<OrderRow> & { id: string }): OrderRow {
  const status = String(row.status || 'created')
  return {
    id: row.id,
    userId: String(row.userId || ''),
    razorpayOrderId: String(row.razorpayOrderId || ''),
    plan: String(row.plan || ''),
    amount: Number(row.amount || 0),
    status,
    createdAt: toIso(row.createdAt, new Date().toISOString()),
    paidAt: row.paidAt ? toIso(row.paidAt) || null : status === 'paid' ? toIso(row.createdAt) || null : null,
    razorpayPaymentId: row.razorpayPaymentId || null,
  }
}

function mapHqNotice(row: Partial<AppNotice> & { id: string }): AppNotice {
  return {
    id: row.id,
    title: String(row.title || ''),
    body: String(row.body || ''),
    href: String(row.href || '/admin'),
    at: toIso(row.at, new Date().toISOString()),
    sticky: Boolean(row.sticky),
  }
}

function sliceDate(value: string | null | undefined) {
  if (!value) return null
  return String(value).slice(0, 10)
}

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

function mapSub(row: SubRow): SubRow {
  return {
    ...row,
    trialEndsOn: String(row.trialEndsOn || '').slice(0, 10),
    periodEndsOn: row.periodEndsOn ? String(row.periodEndsOn).slice(0, 10) : null,
    requestedPlan: row.requestedPlan || null,
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
    emailVerifiedAt: new Date().toISOString(),
    role: 'owner',
    deletedAt: null,
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
    requestedPlan: null,
  })
  return user
}

type FileShape = {
  users: UserRow[]
  studios: StudioRow[]
  subs: SubRow[]
  orders: OrderRow[]
  sessions: SessionRow[]
  attempts: { email: string; ip: string; ok: boolean; createdAt: string }[]
  tokens: TokenRow[]
  audit: AuditRow[]
  mailed: string[]
  otps: PhoneOtpRow[]
  settings: Record<string, string>
  hqInbox: AppNotice[]
}

function fileStore(path: string): Store {
  const empty = (): FileShape => ({
    users: [],
    studios: [],
    subs: [],
    orders: [],
    sessions: [],
    attempts: [],
    tokens: [],
    audit: [],
    mailed: [],
    otps: [],
    settings: {},
    hqInbox: [],
  })

  function read(): FileShape {
    if (!existsSync(path)) return empty()
    try {
      return { ...empty(), ...(JSON.parse(readFileSync(path, 'utf8')) as Partial<FileShape>) }
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
      const needle = email.trim().toLowerCase()
      const row = read().users.find((u) => u.email.toLowerCase() === needle)
      return row ? mapUser(row) : null
    },
    async findUserById(id) {
      const row = read().users.find((u) => u.id === id)
      return row ? mapUser(row) : null
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
      const row = read().subs.find((s) => s.userId === userId)
      return row ? mapSub(row) : null
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
      const row = read().orders.find((o) => o.razorpayOrderId === id)
      return row ? mapOrder(row) : null
    },
    async listOrders() {
      return read()
        .orders.map(mapOrder)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async markOrderPaid(razorpayOrderId, paymentId) {
      const db = read()
      const order = db.orders.find((o) => o.razorpayOrderId === razorpayOrderId)
      if (!order) return
      order.status = 'paid'
      order.paidAt = new Date().toISOString()
      order.razorpayPaymentId = paymentId
      const sub = db.subs.find((s) => s.userId === order.userId)
      if (sub) {
        sub.plan = order.plan
        sub.status = 'active'
        sub.razorpayPaymentId = paymentId
        sub.requestedPlan = null
        const start = sub.periodEndsOn && sub.periodEndsOn > new Date().toISOString().slice(0, 10)
          ? sub.periodEndsOn
          : new Date().toISOString().slice(0, 10)
        const d = new Date(`${start}T00:00:00.000Z`)
        d.setUTCDate(d.getUTCDate() + 30)
        sub.periodEndsOn = d.toISOString().slice(0, 10)
      }
      write(db)
    },
    async setUserDeleted(userId, deletedAt) {
      const db = read()
      const user = db.users.find((u) => u.id === userId)
      if (!user) return
      user.deletedAt = deletedAt
      write(db)
    },
    async ensureDemo() {
      return seedDemo(store)
    },
    async listTenants() {
      const db = read()
      return db.users.map((user) => ({
        user: publicUser(user),
        studio: db.studios.find((s) => s.userId === user.id) ?? null,
        sub: (() => {
          const row = db.subs.find((s) => s.userId === user.id)
          return row ? mapSub(row) : null
        })(),
      }))
    },
    async updatePassword(userId, passwordHash) {
      const db = read()
      const user = db.users.find((u) => u.id === userId)
      if (!user) return
      user.passwordHash = passwordHash
      write(db)
    },
    async markEmailVerified(userId) {
      const db = read()
      const user = db.users.find((u) => u.id === userId)
      if (!user) return
      user.emailVerifiedAt = new Date().toISOString()
      write(db)
    },
    async createSession(row) {
      const db = read()
      db.sessions.push(row)
      write(db)
    },
    async getSession(id) {
      return read().sessions.find((s) => s.id === id) ?? null
    },
    async revokeSession(id) {
      const db = read()
      const row = db.sessions.find((s) => s.id === id)
      if (!row) return
      row.revokedAt = new Date().toISOString()
      write(db)
    },
    async revokeUserSessions(userId) {
      const db = read()
      const now = new Date().toISOString()
      db.sessions.forEach((s) => {
        if (s.userId === userId && !s.revokedAt) s.revokedAt = now
      })
      write(db)
    },
    async recordAuthAttempt(email, ip, ok) {
      const db = read()
      db.attempts.push({ email, ip, ok, createdAt: new Date().toISOString() })
      db.attempts = db.attempts.slice(-2000)
      write(db)
    },
    async countRecentFailures(email, ip, sinceIso) {
      const attempts = read().attempts.filter((a) => !a.ok && a.createdAt >= sinceIso)
      return {
        email: attempts.filter((a) => a.email === email).length,
        ip: attempts.filter((a) => a.ip === ip).length,
      }
    },
    async createToken(row) {
      const db = read()
      db.tokens.push(row)
      write(db)
    },
    async consumeToken(kind, tokenHash) {
      const db = read()
      const row = db.tokens.find((t) => t.kind === kind && t.tokenHash === tokenHash && !t.usedAt)
      if (!row || row.expiresAt < new Date().toISOString()) return null
      row.usedAt = new Date().toISOString()
      write(db)
      return row
    },
    async insertAudit(row) {
      const db = read()
      db.audit.unshift(row)
      db.audit = db.audit.slice(0, 2000)
      write(db)
    },
    async listAudit(opts) {
      const limit = Math.min(Math.max(opts.limit ?? 80, 1), 500)
      return read()
        .audit.filter((r) => {
          if (opts.studioId && r.studioId !== opts.studioId) return false
          if (opts.actionPrefix && !r.action.startsWith(opts.actionPrefix)) return false
          return true
        })
        .slice(0, limit)
    },
    async claimUnmailed(ids) {
      if (!ids.length) return []
      const db = read()
      const seen = new Set(db.mailed || [])
      const claimed = ids.filter((id) => id && !seen.has(id))
      if (!claimed.length) return []
      db.mailed = [...db.mailed, ...claimed].slice(-4000)
      write(db)
      return claimed
    },
    async releaseMailed(ids) {
      if (!ids.length) return
      const drop = new Set(ids)
      const db = read()
      db.mailed = (db.mailed || []).filter((id) => !drop.has(id))
      write(db)
    },
    async putPhoneOtp(row) {
      const db = read()
      db.otps = (db.otps || []).filter((item) => item.phone !== row.phone)
      db.otps.push(row)
      write(db)
    },
    async getPhoneOtp(phone) {
      return (read().otps || []).find((item) => item.phone === phone) ?? null
    },
    async getSetting(key) {
      return (read().settings || {})[key] || null
    },
    async putSetting(key, value) {
      const db = read()
      db.settings = { ...(db.settings || {}), [key]: value }
      write(db)
    },
    async upsertHqNotice(notice) {
      const db = read()
      const row = mapHqNotice(notice)
      db.hqInbox = (db.hqInbox || []).filter((item) => item.id !== row.id)
      db.hqInbox.push(row)
      write(db)
    },
    async listHqNotices() {
      return [...(read().hqInbox || [])]
        .map(mapHqNotice)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 200)
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
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz`
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner'`
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz`
      await sql`UPDATE users SET email_verified_at = COALESCE(email_verified_at, created_at)`
      await sql`UPDATE users SET role = 'hq' WHERE lower(email) = ${ADMIN_EMAIL}`
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
        razorpay_payment_id text,
        requested_plan text
      )`
      await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS requested_plan text`
      await sql`CREATE TABLE IF NOT EXISTS billing_orders (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        razorpay_order_id text UNIQUE NOT NULL,
        plan text NOT NULL,
        amount integer NOT NULL,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`
      await sql`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS paid_at timestamptz`
      await sql`ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text`
      await sql`CREATE TABLE IF NOT EXISTS sessions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        ip text NOT NULL DEFAULT '',
        user_agent text NOT NULL DEFAULT ''
      )`
      await sql`CREATE TABLE IF NOT EXISTS auth_attempts (
        id text PRIMARY KEY,
        email text NOT NULL,
        ip text NOT NULL,
        ok boolean NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`
      await sql`CREATE TABLE IF NOT EXISTS auth_tokens (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind text NOT NULL,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz
      )`
      await sql`CREATE TABLE IF NOT EXISTS audit_events (
        id text PRIMARY KEY,
        studio_id text,
        user_id text,
        action text NOT NULL,
        detail text NOT NULL DEFAULT '',
        ip text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )`
      await sql`CREATE TABLE IF NOT EXISTS mailed_notices (
        id text PRIMARY KEY,
        sent_at timestamptz NOT NULL DEFAULT now()
      )`
      await sql`CREATE TABLE IF NOT EXISTS phone_otps (
        phone text PRIMARY KEY,
        code_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        verified_at timestamptz,
        sent_at timestamptz NOT NULL,
        tries integer NOT NULL DEFAULT 0
      )`
      await sql`CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY,
        value text NOT NULL
      )`
      await sql`CREATE TABLE IF NOT EXISTS hq_inbox (
        id text PRIMARY KEY,
        title text NOT NULL,
        body text NOT NULL,
        href text NOT NULL,
        at timestamptz NOT NULL,
        sticky boolean NOT NULL DEFAULT true
      )`
    },
    async findUserByEmail(email) {
      const needle = email.trim().toLowerCase()
      const rows = await sql`SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt", email_verified_at AS "emailVerifiedAt", role, deleted_at AS "deletedAt" FROM users WHERE lower(email) = ${needle}`
      const row = rows[0] as Parameters<typeof mapUser>[0] | undefined
      return row ? mapUser(row) : null
    },
    async findUserById(id) {
      const rows = await sql`SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt", email_verified_at AS "emailVerifiedAt", role, deleted_at AS "deletedAt" FROM users WHERE id = ${id}`
      const row = rows[0] as Parameters<typeof mapUser>[0] | undefined
      return row ? mapUser(row) : null
    },
    async insertUser(user) {
      try {
        await sql`INSERT INTO users (id, email, password_hash, created_at, email_verified_at, role, deleted_at) VALUES (${user.id}, ${user.email}, ${user.passwordHash}, ${user.createdAt}, ${user.emailVerifiedAt}, ${user.role}, ${user.deletedAt})`
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
      const rows = await sql`SELECT user_id AS "userId", plan, status, trial_ends_on::text AS "trialEndsOn", period_ends_on::text AS "periodEndsOn", razorpay_payment_id AS "razorpayPaymentId", requested_plan AS "requestedPlan" FROM subscriptions WHERE user_id = ${userId}`
      const row = rows[0] as SubRow | undefined
      return row ? mapSub(row) : null
    },
    async upsertSub(sub) {
      await sql`INSERT INTO subscriptions (user_id, plan, status, trial_ends_on, period_ends_on, razorpay_payment_id, requested_plan)
        VALUES (${sub.userId}, ${sub.plan}, ${sub.status}, ${sub.trialEndsOn}, ${sub.periodEndsOn}, ${sub.razorpayPaymentId}, ${sub.requestedPlan || null})
        ON CONFLICT (user_id) DO UPDATE SET
          plan = excluded.plan,
          status = excluded.status,
          trial_ends_on = excluded.trial_ends_on,
          period_ends_on = excluded.period_ends_on,
          razorpay_payment_id = excluded.razorpay_payment_id,
          requested_plan = excluded.requested_plan`
    },
    async insertOrder(order) {
      await sql`INSERT INTO billing_orders (id, user_id, razorpay_order_id, plan, amount, status, created_at, paid_at, razorpay_payment_id)
        VALUES (${order.id}, ${order.userId}, ${order.razorpayOrderId}, ${order.plan}, ${order.amount}, ${order.status}, ${order.createdAt}, ${order.paidAt}, ${order.razorpayPaymentId})`
    },
    async findOrderByRazorpayId(id) {
      const rows = await sql`SELECT id, user_id AS "userId", razorpay_order_id AS "razorpayOrderId", plan, amount, status, created_at AS "createdAt", paid_at AS "paidAt", razorpay_payment_id AS "razorpayPaymentId" FROM billing_orders WHERE razorpay_order_id = ${id}`
      const row = rows[0] as OrderRow | undefined
      return row ? mapOrder(row) : null
    },
    async listOrders() {
      const rows = await sql`SELECT id, user_id AS "userId", razorpay_order_id AS "razorpayOrderId", plan, amount, status, created_at AS "createdAt", paid_at AS "paidAt", razorpay_payment_id AS "razorpayPaymentId" FROM billing_orders ORDER BY created_at DESC`
      return (rows as OrderRow[]).map(mapOrder)
    },
    async markOrderPaid(razorpayOrderId, paymentId) {
      const order = await store.findOrderByRazorpayId(razorpayOrderId)
      if (!order) return
      await sql`UPDATE billing_orders SET status = 'paid', paid_at = now(), razorpay_payment_id = ${paymentId} WHERE razorpay_order_id = ${razorpayOrderId}`
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
        requestedPlan: null,
        periodEndsOn: d.toISOString().slice(0, 10),
      })
    },
    async setUserDeleted(userId, deletedAt) {
      await sql`UPDATE users SET deleted_at = ${deletedAt} WHERE id = ${userId}`
    },
    async ensureDemo() {
      return seedDemo(store)
    },
    async listTenants() {
      const users = await sql`SELECT id, email, created_at AS "createdAt", deleted_at AS "deletedAt" FROM users ORDER BY created_at DESC`
      const studios = await sql`SELECT id, user_id AS "userId", name, owner, city, phone, tagline, onboarded, leads, quotations FROM studios`
      const subs = await sql`SELECT user_id AS "userId", plan, status, trial_ends_on::text AS "trialEndsOn", period_ends_on::text AS "periodEndsOn", razorpay_payment_id AS "razorpayPaymentId", requested_plan AS "requestedPlan" FROM subscriptions`
      const studioByUser = new Map((studios as StudioRow[]).map((s) => [s.userId, s]))
      const subByUser = new Map((subs as SubRow[]).map((s) => [s.userId, mapSub(s)]))
      return (users as { id: string; email: string; createdAt: string }[]).map((user) => ({
        user: publicUser(user as UserRow),
        studio: studioByUser.get(user.id) ?? null,
        sub: subByUser.get(user.id) ?? null,
      }))
    },
    async updatePassword(userId, passwordHash) {
      await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`
    },
    async markEmailVerified(userId) {
      await sql`UPDATE users SET email_verified_at = now() WHERE id = ${userId}`
    },
    async createSession(row) {
      await sql`INSERT INTO sessions (id, user_id, expires_at, revoked_at, created_at, ip, user_agent)
        VALUES (${row.id}, ${row.userId}, ${row.expiresAt}, ${row.revokedAt}, ${row.createdAt}, ${row.ip}, ${row.userAgent})`
    },
    async getSession(id) {
      const rows = await sql`SELECT id, user_id AS "userId", expires_at AS "expiresAt", revoked_at AS "revokedAt", created_at AS "createdAt", ip, user_agent AS "userAgent" FROM sessions WHERE id = ${id}`
      const row = rows[0] as SessionRow | undefined
      if (!row) return null
      return {
        ...row,
        expiresAt: String(row.expiresAt),
        revokedAt: row.revokedAt ? String(row.revokedAt) : null,
        createdAt: String(row.createdAt),
      }
    },
    async revokeSession(id) {
      await sql`UPDATE sessions SET revoked_at = now() WHERE id = ${id} AND revoked_at IS NULL`
    },
    async revokeUserSessions(userId) {
      await sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`
    },
    async recordAuthAttempt(email, ip, ok) {
      await sql`INSERT INTO auth_attempts (id, email, ip, ok, created_at) VALUES (${newId()}, ${email}, ${ip}, ${ok}, ${new Date().toISOString()})`
    },
    async countRecentFailures(email, ip, sinceIso) {
      const byEmail = await sql`SELECT count(*)::int AS n FROM auth_attempts WHERE email = ${email} AND ok = false AND created_at >= ${sinceIso}`
      const byIp = await sql`SELECT count(*)::int AS n FROM auth_attempts WHERE ip = ${ip} AND ok = false AND created_at >= ${sinceIso}`
      return {
        email: Number((byEmail[0] as { n?: number })?.n || 0),
        ip: Number((byIp[0] as { n?: number })?.n || 0),
      }
    },
    async createToken(row) {
      await sql`INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, used_at)
        VALUES (${row.id}, ${row.userId}, ${row.kind}, ${row.tokenHash}, ${row.expiresAt}, ${row.usedAt})`
    },
    async consumeToken(kind, tokenHash) {
      const rows = await sql`SELECT id, user_id AS "userId", kind, token_hash AS "tokenHash", expires_at AS "expiresAt", used_at AS "usedAt" FROM auth_tokens WHERE kind = ${kind} AND token_hash = ${tokenHash} AND used_at IS NULL`
      const row = rows[0] as TokenRow | undefined
      if (!row) return null
      if (new Date(String(row.expiresAt)).getTime() < Date.now()) return null
      await sql`UPDATE auth_tokens SET used_at = now() WHERE id = ${row.id}`
      return { ...row, expiresAt: String(row.expiresAt), usedAt: new Date().toISOString() }
    },
    async insertAudit(row) {
      await sql`INSERT INTO audit_events (id, studio_id, user_id, action, detail, ip, created_at)
        VALUES (${row.id}, ${row.studioId}, ${row.userId}, ${row.action}, ${row.detail}, ${row.ip}, ${row.createdAt})`
    },
    async listAudit(opts) {
      const limit = Math.min(Math.max(opts.limit ?? 80, 1), 500)
      const prefix = opts.actionPrefix ? `${opts.actionPrefix}%` : null
      const rows = opts.studioId
        ? prefix
          ? await sql`SELECT id, studio_id AS "studioId", user_id AS "userId", action, detail, ip, created_at AS "createdAt" FROM audit_events WHERE studio_id = ${opts.studioId} AND action LIKE ${prefix} ORDER BY created_at DESC LIMIT ${limit}`
          : await sql`SELECT id, studio_id AS "studioId", user_id AS "userId", action, detail, ip, created_at AS "createdAt" FROM audit_events WHERE studio_id = ${opts.studioId} ORDER BY created_at DESC LIMIT ${limit}`
        : prefix
          ? await sql`SELECT id, studio_id AS "studioId", user_id AS "userId", action, detail, ip, created_at AS "createdAt" FROM audit_events WHERE action LIKE ${prefix} ORDER BY created_at DESC LIMIT ${limit}`
          : await sql`SELECT id, studio_id AS "studioId", user_id AS "userId", action, detail, ip, created_at AS "createdAt" FROM audit_events ORDER BY created_at DESC LIMIT ${limit}`
      return (rows as AuditRow[]).map((r) => ({ ...r, createdAt: toIso(r.createdAt, new Date().toISOString()) }))
    },
    async claimUnmailed(ids) {
      const claimed: string[] = []
      for (const id of ids) {
        if (!id) continue
        const rows = await sql`INSERT INTO mailed_notices (id) VALUES (${id}) ON CONFLICT (id) DO NOTHING RETURNING id`
        if (rows[0]) claimed.push(id)
      }
      return claimed
    },
    async releaseMailed(ids) {
      for (const id of ids) {
        if (!id) continue
        await sql`DELETE FROM mailed_notices WHERE id = ${id}`
      }
    },
    async putPhoneOtp(row) {
      await sql`INSERT INTO phone_otps (phone, code_hash, expires_at, verified_at, sent_at, tries)
        VALUES (${row.phone}, ${row.codeHash}, ${row.expiresAt}, ${row.verifiedAt}, ${row.sentAt}, ${row.tries})
        ON CONFLICT (phone) DO UPDATE SET
          code_hash = excluded.code_hash,
          expires_at = excluded.expires_at,
          verified_at = excluded.verified_at,
          sent_at = excluded.sent_at,
          tries = excluded.tries`
    },
    async getPhoneOtp(phone) {
      const rows = await sql`SELECT phone, code_hash AS "codeHash", expires_at AS "expiresAt", verified_at AS "verifiedAt", sent_at AS "sentAt", tries FROM phone_otps WHERE phone = ${phone}`
      const row = rows[0] as PhoneOtpRow | undefined
      if (!row) return null
      return {
        phone: String(row.phone),
        codeHash: String(row.codeHash || (row as { code_hash?: string }).code_hash || ''),
        expiresAt: toIso(row.expiresAt, new Date().toISOString()),
        verifiedAt: row.verifiedAt ? toIso(row.verifiedAt) || null : null,
        sentAt: toIso(row.sentAt, new Date().toISOString()),
        tries: Number(row.tries || 0),
      }
    },
    async getSetting(key) {
      const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}`
      const value = (rows[0] as { value?: string } | undefined)?.value
      return value || null
    },
    async putSetting(key, value) {
      await sql`INSERT INTO app_settings (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = excluded.value`
    },
    async upsertHqNotice(notice) {
      const row = mapHqNotice(notice)
      await sql`INSERT INTO hq_inbox (id, title, body, href, at, sticky)
        VALUES (${row.id}, ${row.title}, ${row.body}, ${row.href}, ${row.at}, ${Boolean(row.sticky)})
        ON CONFLICT (id) DO UPDATE SET
          title = excluded.title,
          body = excluded.body,
          href = excluded.href,
          at = excluded.at,
          sticky = excluded.sticky`
    },
    async listHqNotices() {
      const rows = await sql`SELECT id, title, body, href, at, sticky FROM hq_inbox ORDER BY at DESC LIMIT 200`
      return (rows as AppNotice[]).map(mapHqNotice)
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
