import { ADMIN_EMAIL, APP_URL } from './constants.ts'

const WEB3FORMS_KEY = process.env.WEB3FORMS_ACCESS_KEY || 'e7e8e974-642c-411f-83ae-999cdbcdbb6e'

export async function mailUser(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM || 'GoldHour <goldhour@updates.goldhour.app>'
  if (key) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      })
      return
    } catch {
      /* fall through */
    }
  }
  if (!WEB3FORMS_KEY) return
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `[FORWARD TO ${to}] ${subject}`,
        from_name: 'GoldHour',
        name: 'GoldHour',
        email: ADMIN_EMAIL,
        botcheck: false,
        kind: 'user-mail',
        message: `Send this to ${to}\n\n${text}\n\nApp: ${APP_URL}`,
      }),
    })
  } catch {
    /* never block auth */
  }
}
