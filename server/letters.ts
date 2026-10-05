import { APP_URL } from './constants.ts'

export function trialWelcomeLetter(opts: {
  owner: string
  studio: string
  city: string
  trialEndsOn: string
  verifyUrl: string
}) {
  const name = opts.owner.split(/\s+/)[0] || 'there'
  return {
    subject: `${opts.studio} is on GoldHour — 14 days, then ₹999`,
    text: [
      `Hi ${name},`,
      '',
      `Your studio desk is open. Fourteen days. No card today.`,
      opts.city ? `Logged as ${opts.studio}, ${opts.city}.` : `Logged as ${opts.studio}.`,
      '',
      'This week, take the weddings off WhatsApp and put them on the desk:',
      '• name, phone, date, venue — one enquiry',
      '• send the quotation from the same place',
      '• follow up in 2 days, then 5 if they go quiet',
      '• take the advance before you block the Saturday',
      '',
      `Trial until ${opts.trialEndsOn}. After that, Studio is ₹999 / month. Studio Pro is ₹1,500 — calendar, pipeline, Pulse, WhatsApp desk and Padmavathi the chatbot. Same desk. Your couples stay on the server, not in this browser.`,
      '',
      'Confirm this email (so we know the studio is real):',
      opts.verifyUrl,
      '',
      'Open the desk:',
      `${APP_URL}/studio`,
      '',
      'Keep it after the trial:',
      `${APP_URL}/studio/billing`,
      '',
      'The photographers who keep the desk open are the ones whose Saturdays are already booked.',
      '',
      '— GoldHour, Madurai',
    ].join('\n'),
  }
}

export function demoFollowLetter() {
  return {
    subject: 'You just walked the GoldHour desk — keep it for ₹999 / month',
    text: [
      'You opened the GoldHour demo — Meenakshi Frames, the Madurai wedding desk.',
      '',
      'Priya’s booking, the quotation PDF, the follow-up in two days, the advance before the mandap — that is not a slideshow. That is the work that currently lives in WhatsApp and gets lost on a Friday night.',
      '',
      'Your own studio gets the same desk for 14 days. Free. No card.',
      'Then ₹999 / month for Studio, or ₹1,500 for Studio Pro — calendar, pipeline, Pulse reports and the desk chatbot.',
      '',
      'Start your trial (two minutes):',
      `${APP_URL}/signup`,
      '',
      'Already sure? Open billing after you sign up:',
      `${APP_URL}/studio/billing`,
      '',
      'If a couple is waiting on a quote tonight, do not leave it in the chat.',
      '',
      '— GoldHour',
    ].join('\n'),
  }
}
