import { ADMIN_EMAIL, DEMO_EMAIL } from './constants.ts'
import { getStore, type DeskBackup } from './db.ts'
import { mailAdmin, mailDeskBackup } from './mail.ts'

export function studioCount(pack: DeskBackup) {
  return pack.users.filter((user) => user.email !== ADMIN_EMAIL && user.email !== DEMO_EMAIL).length
}

export async function runNightlyBackup() {
  const db = getStore()
  await db.ping()
  const pack = await db.exportDesk()
  const mailed = await mailDeskBackup(pack)
  return { ok: true as const, studios: studioCount(pack), mailed, exportedAt: pack.exportedAt }
}

export async function alertDatabaseDown(detail: string) {
  await mailAdmin(
    'GoldHour database is down',
    `The studio desk cannot reach Postgres. Paying studios cannot sign in until DATABASE_URL is fixed on Vercel.\n\n${detail.slice(0, 800)}`,
  )
}
