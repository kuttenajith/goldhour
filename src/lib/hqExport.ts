function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

export function downloadText(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type HqExport = {
  exportedAt: string
  desks: Array<{
    email: string
    joinedAt: string
    removedAt: string | null
    studio: { name: string; owner: string; city: string; phone: string; tagline: string; onboarded: boolean } | null
    plan: string
    status: string
    trialEndsOn: string
    periodEndsOn: string | null
    requestedPlan: string | null
    razorpayPaymentId: string | null
    leads: Array<{
      id: string
      coupleName: string
      phone: string
      eventDate: string
      venue: string
      city: string
      status: string
      budget: number
      packageAmount: number
      notes: string
      createdOn: string
      payments: Array<{ kind: string; amount: number; receivedOn: string; note: string }>
    }>
    quotations: Array<{ packageName: string; amount: number; createdOn: string; notes: string }>
  }>
  payments: Array<{
    userId: string
    plan: string
    amountPaise: number
    amountRupees: number
    status: string
    createdAt: string
    paidAt: string | null
    razorpayOrderId: string
    razorpayPaymentId: string | null
  }>
  activity: Array<{ at: string; action: string; detail: string; userId: string | null; studioId: string | null }>
}

export function desksCsv(data: HqExport) {
  return csv([
    ['email', 'studio', 'owner', 'city', 'phone', 'joinedAt', 'removedAt', 'plan', 'status', 'trialEndsOn', 'periodEndsOn', 'requestedPlan', 'razorpayPaymentId', 'leadCount', 'quoteCount'],
    ...data.desks.map((d) => [
      d.email,
      d.studio?.name || '',
      d.studio?.owner || '',
      d.studio?.city || '',
      d.studio?.phone || '',
      d.joinedAt,
      d.removedAt || '',
      d.plan,
      d.status,
      d.trialEndsOn,
      d.periodEndsOn || '',
      d.requestedPlan || '',
      d.razorpayPaymentId || '',
      d.leads.length,
      d.quotations.length,
    ]),
  ])
}

export function leadsCsv(data: HqExport) {
  return csv([
    ['studioEmail', 'studio', 'couple', 'phone', 'status', 'wedding', 'city', 'venue', 'budget', 'package', 'entered', 'notes', 'couplePayments'],
    ...data.desks.flatMap((d) =>
      d.leads.map((lead) => [
        d.email,
        d.studio?.name || '',
        lead.coupleName,
        lead.phone,
        lead.status,
        lead.eventDate,
        lead.city,
        lead.venue,
        lead.budget,
        lead.packageAmount,
        lead.createdOn,
        lead.notes,
        (lead.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0),
      ]),
    ),
  ])
}

export function paymentsCsv(data: HqExport) {
  return csv([
    ['userId', 'plan', 'amountRupees', 'status', 'createdAt', 'paidAt', 'razorpayOrderId', 'razorpayPaymentId'],
    ...data.payments.map((p) => [
      p.userId,
      p.plan,
      p.amountRupees,
      p.status,
      p.createdAt,
      p.paidAt || '',
      p.razorpayOrderId,
      p.razorpayPaymentId || '',
    ]),
  ])
}
