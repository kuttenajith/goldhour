import { VISIT_REPLY_EMAIL, WEB3FORMS_KEY } from './visitConfig.ts'

const TOUCH = 'gh-first-touch'
const PENDING = 'gh-visit-report-pending'
const MAILED = 'gh-visit-report-mailed'
const PAGES = 'gh-session-pages'
const STARTED = 'gh-session-started'

export type Arrival = {
  at: string
  page: string
  referrer: string
  source: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
}

type Geo = {
  ip?: string
  city?: string
  region?: string
  country?: string
  isp?: string
  org?: string
  domain?: string
}

let geoCache: Geo | null = null
let geoPromise: Promise<Geo> | null = null
let armed = false
let sending = false

function guessSource(referrer: string, utm: string) {
  if (utm) return utm
  if (!referrer) return 'direct / unknown (no referrer)'
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    if (host.includes('linkedin')) return 'linkedin.com'
    if (host.includes('github')) return 'github.com'
    if (host.includes('google')) return 'google'
    if (host.includes('bing')) return 'bing'
    if (host.includes('instagram')) return 'instagram'
    if (host.includes('whatsapp')) return 'whatsapp'
    if (host.includes('facebook')) return 'facebook'
    return host
  } catch {
    return 'unknown'
  }
}

export function rememberFirstTouch() {
  try {
    if (sessionStorage.getItem(TOUCH)) return
    const params = new URLSearchParams(window.location.search)
    const referrer = document.referrer.trim()
    const utm_source = params.get('utm_source')?.trim() || ''
    const arrival: Arrival = {
      at: new Date().toISOString(),
      page: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      referrer,
      source: guessSource(referrer, utm_source),
      utm_source,
      utm_medium: params.get('utm_medium')?.trim() || '',
      utm_campaign: params.get('utm_campaign')?.trim() || '',
      utm_content: params.get('utm_content')?.trim() || '',
    }
    sessionStorage.setItem(TOUCH, JSON.stringify(arrival))
  } catch {
    /* private mode */
  }
}

export function readFirstTouch(): Arrival | null {
  try {
    const raw = sessionStorage.getItem(TOUCH)
    if (!raw) return null
    return JSON.parse(raw) as Arrival
  } catch {
    return null
  }
}

function formatArrival(touch: Arrival | null) {
  if (!touch) return 'Not captured.'
  return [
    `Source: ${touch.source}`,
    `Landing page: ${touch.page}`,
    `Referrer: ${touch.referrer || '—'}`,
    `UTM source: ${touch.utm_source || '—'}`,
    `UTM medium: ${touch.utm_medium || '—'}`,
    `UTM campaign: ${touch.utm_campaign || '—'}`,
    `First seen: ${touch.at}`,
  ].join('\n')
}

function lookupGeo(): Promise<Geo> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1800)
  return fetch('https://ipwho.is/', { signal: controller.signal })
    .then((response) => response.json())
    .then(
      (data: {
        success?: boolean
        ip?: string
        city?: string
        region?: string
        country?: string
        connection?: { isp?: string; org?: string; domain?: string }
      }) => {
        if (data.success === false) return {}
        return {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          isp: data.connection?.isp,
          org: data.connection?.org,
          domain: data.connection?.domain,
        }
      },
    )
    .catch(() => ({}))
    .finally(() => window.clearTimeout(timer))
}

function ensureGeo() {
  if (!geoPromise) {
    geoPromise = lookupGeo().then((geo) => {
      geoCache = geo
      return geo
    })
  }
  return geoPromise
}

function isDatacenter(geo: Geo) {
  const isp = `${geo.isp || ''} ${geo.org || ''}`.toLowerCase()
  return /microsoft|github|google llc|google cloud|cloudflare|digitalocean|ovh|hetzner|linode|oracle|alibaba/.test(
    isp,
  )
}

function isSilentProbe(geo: Geo, touch: Arrival | null) {
  return isDatacenter(geo) && !touch?.referrer && !touch?.utm_source
}

export async function shouldCountAndMail(): Promise<boolean> {
  rememberFirstTouch()
  const geo = await ensureGeo()
  const silent = isSilentProbe(geo, readFirstTouch())
  if (silent) {
    try {
      sessionStorage.setItem(MAILED, '1')
    } catch {
      /* ignore */
    }
  }
  return !silent
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function readPages(): string[] {
  try {
    const raw = sessionStorage.getItem(PAGES)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function notePage(path = currentPath()) {
  try {
    const pages = readPages()
    if (pages[pages.length - 1] === path) return
    pages.push(path)
    sessionStorage.setItem(PAGES, JSON.stringify(pages.slice(-24)))
    if (!sessionStorage.getItem(STARTED)) sessionStorage.setItem(STARTED, String(Date.now()))
  } catch {
    /* private mode */
  }
}

function timeSpent() {
  const started = Number(sessionStorage.getItem(STARTED) || Date.now())
  const seconds = Math.round(Math.max(0, Date.now() - started) / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function armVisitReport() {
  try {
    sessionStorage.setItem(PENDING, '1')
    if (!sessionStorage.getItem(STARTED)) sessionStorage.setItem(STARTED, String(Date.now()))
  } catch {
    return
  }
  notePage()
  void ensureGeo()
  if (armed) return
  armed = true
  window.setTimeout(() => void flushVisitReport(), 8000)
  const onLeave = () => void flushVisitReport()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onLeave()
  })
  window.addEventListener('pagehide', onLeave)
}

async function flushVisitReport() {
  try {
    if (sessionStorage.getItem(PENDING) !== '1') return
    if (sessionStorage.getItem(MAILED) === '1') return
  } catch {
    return
  }

  if (!WEB3FORMS_KEY || sending) return

  sending = true
  rememberFirstTouch()
  const touch = readFirstTouch()
  const hiding = document.visibilityState === 'hidden'
  const geo = geoCache ?? (hiding ? {} : await ensureGeo())

  if (isSilentProbe(geo, touch)) {
    try {
      sessionStorage.setItem(MAILED, '1')
    } catch {
      /* ignore */
    }
    sending = false
    return
  }

  const company = geo.org || geo.isp || 'Unknown (home / mobile / VPN)'
  const place = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || '—'
  const pages = readPages()
  const trail = pages.length ? pages.join(' → ') : currentPath()
  const now = new Date().toISOString()

  const payload = {
    access_key: WEB3FORMS_KEY,
    subject: `[GOLDHOUR VISIT] ${company} · ${touch?.source || 'unknown'}`,
    from_name: 'GoldHour visit report (not a contact form)',
    name: 'GoldHour visit report',
    email: VISIT_REPLY_EMAIL,
    botcheck: false,
    kind: 'visit',
    company,
    source: touch?.source || 'unknown',
    message: [
      'THIS IS NOT A CONTACT FORM.',
      'A unique browser session on the live GoldHour desk.',
      '',
      `Company (from IP): ${company}`,
      `Network domain: ${geo.domain || '—'}`,
      `Location: ${place}`,
      `Time spent: ${timeSpent()}`,
      `Pages: ${trail}`,
      `When: ${now}`,
      '',
      'How they arrived',
      formatArrival(touch),
      '',
      'Network',
      `IP: ${geo.ip || '—'}`,
      `ISP: ${geo.isp || '—'}`,
      '',
      `Device: ${window.screen.width}×${window.screen.height}, ${navigator.language}, ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      `User agent: ${navigator.userAgent}`,
    ].join('\n'),
  }

  try {
    const request = fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    if (hiding) {
      sessionStorage.setItem(MAILED, '1')
      return
    }
    const response = await request
    const data = (await response.json()) as { success?: boolean }
    if (response.ok && data.success === true) {
      sessionStorage.setItem(MAILED, '1')
    }
  } catch {
    /* leave MAILED unset so the 8s timer can retry */
  } finally {
    sending = false
  }
}
