import { serve } from '@hono/node-server'
import app from './app'

const port = Number(process.env.API_PORT || 8788)
serve({ fetch: app.fetch, port })
console.log(`GoldHour API http://127.0.0.1:${port}`)
