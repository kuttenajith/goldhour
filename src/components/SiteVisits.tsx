import { useEffect, useState } from 'react'
import { armVisitReport, rememberFirstTouch, shouldCountAndMail } from '../lib/visitReport.ts'
import { VISIT_ENDPOINT, VISIT_KEY, VISIT_NAMESPACE } from '../lib/visitConfig.ts'

const SKIP = 'gh-goldhour-skip'
const COUNTED = 'gh-goldhour-visit-counted'
const COOKIE = 'gh-goldhour-skip=1'

let visitsPromise: Promise<number | null> | null = null

function isLive() {
  return window.location.hostname === 'kuttenajith.github.io'
}

function isBot() {
  if (navigator.webdriver) return true
  return /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|pingdom|bytespider|ahrefs|semrush|yandex|applebot|linkedinbot|slackbot|discordbot|telegrambot|prerender|phantom|selenium|puppeteer|playwright|gtmetrix|uptimerobot|statuscake|axios\/|node-fetch|go-http-client|python-|libwww|wget|curl|httpie|okhttp|petalbot|dotbot|mj12bot/i.test(
    navigator.userAgent,
  )
}

function hasCookie() {
  return document.cookie.split(';').some((part) => part.trim().startsWith(COOKIE))
}

function rememberBrowser() {
  try {
    localStorage.setItem(SKIP, '1')
    localStorage.setItem(COUNTED, '1')
    document.cookie = `${COOKIE}; Max-Age=315360000; Path=/; SameSite=Lax`
  } catch {
    /* private mode */
  }
}

function isKnownBrowser() {
  try {
    if (localStorage.getItem(SKIP) === '1') return true
    if (localStorage.getItem(COUNTED) === '1') return true
    if (hasCookie()) return true
  } catch {
    return true
  }
  return false
}

function isOwnerVisit() {
  const params = new URLSearchParams(window.location.search)
  return params.get('owner') === '1' || params.get('me') === '1'
}

function stripOwnerQuery() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('owner') && !url.searchParams.has('me')) return
  url.searchParams.delete('owner')
  url.searchParams.delete('me')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

async function fetchCount(action: 'get' | 'hit') {
  const response = await fetch(`${VISIT_ENDPOINT}/${action}/${VISIT_NAMESPACE}/${VISIT_KEY}`)
  if (response.status === 404) return 0
  if (!response.ok) throw new Error('counter')
  const data = (await response.json()) as { value?: number }
  return Number(data.value) || 0
}

export function loadVisits() {
  if (visitsPromise) return visitsPromise

  visitsPromise = (async () => {
    rememberFirstTouch()

    const owner = isOwnerVisit()
    if (owner) {
      rememberBrowser()
      stripOwnerQuery()
    }

    const skip = owner || !isLive() || isBot() || isKnownBrowser()
    if (skip) return fetchCount('get')

    rememberBrowser()
    void shouldCountAndMail().then((eligible) => {
      if (eligible) armVisitReport()
    })
    return fetchCount('hit')
  })().catch(() => 0)

  return visitsPromise
}

export function SiteVisits() {
  const [visits, setVisits] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    loadVisits().then((value) => {
      if (active) setVisits(value ?? 0)
    })
    return () => {
      active = false
    }
  }, [])

  const formatted = visits == null ? '…' : new Intl.NumberFormat('en').format(visits)

  return (
    <span className="foot-visits" title="Unique browsers, excluding yours">
      {formatted} visits
    </span>
  )
}
