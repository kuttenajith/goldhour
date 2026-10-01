import { hashPassword, verifyPassword } from '../server/crypto.ts'
import { emptyStudio, getStore } from '../server/db.ts'
import { ADMIN_EMAIL } from '../server/notify.ts'

const password = process.argv[2] || ''
if (password.length < 8) {
  console.error('Pass the HQ password as the first argument (8+ characters).')
  process.exit(1)
}

const db = getStore()
await db.migrate()

let user = await db.findUserByEmail(ADMIN_EMAIL)
const hash = hashPassword(password)

if (!user) {
  user = {
    id: crypto.randomUUID(),
    email: ADMIN_EMAIL,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  }
  await db.insertUser(user)
  console.log('created HQ user')
} else {
  await db.updatePassword(user.id, hash)
  user = { ...user, passwordHash: hash }
  console.log('updated HQ password')
}

const studio = await db.getStudio(user.id)
if (!studio) {
  await db.upsertStudio({
    ...emptyStudio(user.id, {
      name: 'GoldHour HQ',
      owner: 'Ajith',
      city: 'Madurai',
      tagline: 'Operator desk',
    }),
    onboarded: true,
  })
  console.log('created HQ studio')
}

await db.upsertSub({
  userId: user.id,
  plan: 'hq',
  status: 'active',
  trialEndsOn: '2099-12-31',
  periodEndsOn: '2099-12-31',
  razorpayPaymentId: (await db.getSub(user.id))?.razorpayPaymentId ?? null,
})

const check = await db.findUserByEmail(ADMIN_EMAIL)
console.log('verify', Boolean(check && verifyPassword(password, check.passwordHash)))
console.log('email', check?.email)
