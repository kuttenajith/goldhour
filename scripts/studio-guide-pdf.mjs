import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsPDF } from 'jspdf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '../public/GoldHour-Studio-Guide.pdf')

const steps = [
  [
    '01  Open GoldHour',
    'On your phone or laptop go to goldhour-chi.vercel.app. Use Chrome. Keep only one GoldHour tab open so two people do not overwrite the same booking.',
  ],
  [
    '02  Try the demo, or create your studio',
    'Demo: Log in, PIN 2026 (sample studio, sample couples). Your studio: Get started. Fastest is Continue with Google, then studio name, your name, city. Or studio name, 10-digit mobile OTP, email and an 8+ character password. 14 days free.',
  ],
  [
    '03  Save the enquiry the same hour it arrives',
    'Desk → Leads → new. Couple name, phone, wedding date, venue, city, budget, source (WhatsApp, Instagram, referral). Status starts as New. The couple leaves chat and sits on the desk.',
  ],
  [
    '04  Send a quotation',
    'Open the lead → quotation. Package splits into Advance, Before wedding, On delivery. Download the PDF. Tap WhatsApp — GoldHour writes the message; you send it from your phone. Mark Quoted.',
  ],
  [
    '05  Follow up without hunting in chat',
    'Set Next action and a date (2 days, then 5 if silent). Follow-ups shows who is due. The bell reminds you. WhatsApp drafts are ready for a gentle check-in.',
  ],
  [
    '06  Collect the advance, then Book',
    'When UPI lands, record it as Advance. Status → Accepted, then Booked. Outstanding stays visible until Before wedding and Final delivery are in. Do not leave advances as screenshots in WhatsApp.',
  ],
  [
    '07  Wedding week',
    'Open the booked lead. Tick events (engagement, mehendi, wedding, reception). Fill the day timeline so a second shooter can follow it. Bookings lists every date you have already taken.',
  ],
]

const doc = new jsPDF({ unit: 'mm', format: 'a4' })
const w = doc.internal.pageSize.getWidth()
const h = doc.internal.pageSize.getHeight()

function chrome() {
  doc.setFillColor(12, 10, 9)
  doc.rect(0, 0, w, h, 'F')
  doc.setDrawColor(201, 162, 39)
  doc.setLineWidth(0.4)
  doc.rect(12, 12, w - 24, h - 24)
}

function footer(page) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(154, 143, 124)
  doc.text('goldhour-chi.vercel.app', 22, h - 18)
  doc.text(String(page), w - 22, h - 18, { align: 'right' })
}

chrome()
doc.setFont('times', 'italic')
doc.setFontSize(11)
doc.setTextColor(201, 162, 39)
doc.text('STUDIO TUTORIAL  ·  WEDDING PHOTOGRAPHERS', w / 2, 32, { align: 'center' })
doc.setFont('times', 'bold')
doc.setFontSize(32)
doc.setTextColor(244, 234, 216)
doc.text('GoldHour', w / 2, 52, { align: 'center' })
doc.setFont('times', 'italic')
doc.setFontSize(16)
doc.setTextColor(232, 213, 163)
doc.text('One wedding on the desk', w / 2, 64, { align: 'center' })
doc.setDrawColor(232, 213, 163)
doc.setLineWidth(0.2)
doc.line(40, 72, w - 40, 72)

doc.setFont('helvetica', 'normal')
doc.setFontSize(11)
doc.setTextColor(154, 143, 124)
const intro = doc.splitTextToSize(
  'GoldHour is the studio desk — not an album for brides. Save the enquiry, send the quote, collect the advance, then shoot. 14-day trial, then Studio ₹999 / month or Studio Pro ₹1,499 / month.',
  w - 48,
)
doc.text(intro, 24, 88)

let y = 118
for (const [title, body] of steps.slice(0, 3)) {
  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(232, 213, 163)
  doc.text(title, 24, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(154, 143, 124)
  const lines = doc.splitTextToSize(body, w - 48)
  doc.text(lines, 24, y)
  y += lines.length * 5.2 + 10
}
footer(1)

doc.addPage()
chrome()
y = 28
for (const [title, body] of steps.slice(3)) {
  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(232, 213, 163)
  doc.text(title, 24, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(154, 143, 124)
  const lines = doc.splitTextToSize(body, w - 48)
  doc.text(lines, 24, y)
  y += lines.length * 5.2 + 10
}

doc.setFont('times', 'bold')
doc.setFontSize(13)
doc.setTextColor(232, 213, 163)
doc.text('Plans', 24, y)
y += 8
doc.setFont('helvetica', 'normal')
doc.setFontSize(10)
doc.setTextColor(154, 143, 124)
const plans = doc.splitTextToSize(
  'Trial 14 days ₹0 — full desk. Studio ₹999 / month — leads, PDF quotes, follow-ups, couple payments, vendors, deliveries. Studio Pro ₹1,499 / month — calendar, date holds, pipeline, Pulse, crew, shot list, WhatsApp drafts, desk chatbot, morning briefing. Pay from Plan in the desk (UPI / GPay). The desk opens when Razorpay completes. If a month ends, leads stay saved; renew on the same screen.',
  w - 48,
)
doc.text(plans, 24, y)
y += plans.length * 5.2 + 12

doc.setFont('times', 'bold')
doc.setFontSize(13)
doc.setTextColor(232, 213, 163)
doc.text('If something is stuck', 24, y)
y += 8
doc.setFont('helvetica', 'normal')
doc.setFontSize(10)
doc.setTextColor(154, 143, 124)
doc.text('Forgot password: goldhour-chi.vercel.app/forgot', 24, y)
y += 6
doc.text('HQ:  ajithkutten1998@gmail.com  — studio name + the mobile you used to sign up.', 24, y)
y += 6
doc.text('GoldHour never asks for your OTP on a phone call.', 24, y)
footer(2)

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
console.log('wrote', out)
