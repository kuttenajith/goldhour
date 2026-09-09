import { jsPDF } from 'jspdf'
import { day, money } from './format.ts'
import type { Lead, Quotation, StudioProfile } from './types.ts'

export function downloadQuotation(studio: StudioProfile, lead: Lead, quote: Quotation) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()

  doc.setFillColor(12, 10, 9)
  doc.rect(0, 0, w, 297, 'F')

  doc.setDrawColor(201, 162, 39)
  doc.setLineWidth(0.4)
  doc.rect(12, 12, w - 24, 273)

  doc.setTextColor(201, 162, 39)
  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.text(studio.city.toUpperCase() + '  ·  WEDDING PHOTOGRAPHY', w / 2, 28, {
    align: 'center',
  })

  doc.setFont('times', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(244, 234, 216)
  doc.text(studio.name, w / 2, 42, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(201, 162, 39)
  doc.text(studio.tagline.toUpperCase(), w / 2, 50, { align: 'center' })

  doc.setDrawColor(232, 213, 163)
  doc.setLineWidth(0.2)
  doc.line(40, 58, w - 40, 58)

  doc.setFont('times', 'italic')
  doc.setFontSize(14)
  doc.setTextColor(232, 213, 163)
  doc.text('Quotation', w / 2, 70, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(154, 143, 124)
  doc.text(`No. ${quote.id.slice(0, 8).toUpperCase()}   ·   ${day(quote.createdOn)}`, w / 2, 78, {
    align: 'center',
  })

  const rows: [string, string][] = [
    ['Prepared for', lead.coupleName],
    ['Event date', day(lead.eventDate)],
    ['Venue', lead.venue || lead.city],
    ['Package', quote.packageName],
    ['Investment', money(quote.amount)],
    ['Advance to confirm', money(lead.plan?.advance ?? Math.round(quote.amount * 0.25))],
    ['Before wedding', money(lead.plan?.beforeWedding ?? Math.round(quote.amount * 0.375))],
    ['On delivery', money(lead.plan?.finalDelivery ?? Math.round(quote.amount * 0.375))],
  ]

  let y = 98
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(154, 143, 124)
    doc.text(k, 32, y)
    doc.setTextColor(244, 234, 216)
    doc.text(v, w - 32, y, { align: 'right' })
    y += 12
  })

  doc.setDrawColor(232, 213, 163)
  doc.line(32, y + 2, w - 32, y + 2)

  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(232, 213, 163)
  const notes = quote.notes || 'Coverage includes getting-ready, rituals, family portraits and reception.'
  const split = doc.splitTextToSize(notes, w - 64)
  doc.text(split, 32, y + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(154, 143, 124)
  doc.text(
    'Valid for 14 days. Dates are reserved on receipt of advance. Printed with GoldHour.',
    w / 2,
    268,
    { align: 'center' },
  )
  doc.setTextColor(201, 162, 39)
  doc.text(studio.phone + '  ·  ' + studio.owner, w / 2, 276, { align: 'center' })

  const file = `${studio.name.replace(/\s+/g, '-')}-${lead.coupleName.replace(/\s+/g, '-')}-quotation.pdf`
  doc.save(file)
}
