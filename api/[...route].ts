import { handle } from 'hono/vercel'
import app from './_bundle.mjs'

export const runtime = 'nodejs'
export const config = { runtime: 'nodejs' }

export default handle(app)
