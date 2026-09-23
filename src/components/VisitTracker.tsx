import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { loadVisits } from './SiteVisits.tsx'
import { notePage } from '../lib/visitReport.ts'

export function VisitTracker() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    void loadVisits()
  }, [])

  useEffect(() => {
    notePage(`${pathname}${search}${hash}`)
  }, [pathname, search, hash])

  return null
}
