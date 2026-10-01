import { handle } from 'hono/vercel'
import app from '../server/app.ts'

export const runtime = 'nodejs'
export const config = { runtime: 'nodejs' }

export default handle(app)
