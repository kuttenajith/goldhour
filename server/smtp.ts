import { connect } from 'node:tls'
import { ADMIN_EMAIL } from './constants.ts'

function b64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function subjectHeader(subject: string) {
  if (/^[\x20-\x7e]+$/.test(subject)) return subject
  return `=?UTF-8?B?${b64(subject)}?=`
}

/** Gmail SMTP when GMAIL_APP_PASSWORD or SMTP_PASS is set. No extra package. */
export async function sendSmtpMail(opts: {
  to: string
  subject: string
  text: string
  html?: string
  filename?: string
  fileBody?: string
}): Promise<boolean> {
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || ''
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || ADMIN_EMAIL
  const host = process.env.SMTP_HOST || (pass ? 'smtp.gmail.com' : '')
  const port = Number(process.env.SMTP_PORT || 465)
  if (!pass || !host || !user) return false

  const mixed = `ghx${Date.now().toString(36)}`
  const alt = `gha${Date.now().toString(36)}`
  const letter = opts.html
    ? [
        `--${alt}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        opts.text,
        `--${alt}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        opts.html,
        `--${alt}--`,
      ].join('\r\n')
    : opts.text
  const body =
    opts.filename && opts.fileBody
      ? [
          `--${mixed}`,
          opts.html ? `Content-Type: multipart/alternative; boundary="${alt}"` : 'Content-Type: text/plain; charset=UTF-8',
          '',
          letter,
          `--${mixed}`,
          'Content-Type: application/json; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${opts.filename}"`,
          '',
          Buffer.from(opts.fileBody, 'utf8').toString('base64'),
          `--${mixed}--`,
        ].join('\r\n')
      : letter
  const payload = [
    `From: GoldHour <${user}>`,
    `To: ${opts.to}`,
    `Subject: ${subjectHeader(opts.subject)}`,
    'MIME-Version: 1.0',
    opts.filename && opts.fileBody
      ? `Content-Type: multipart/mixed; boundary="${mixed}"`
      : opts.html
        ? `Content-Type: multipart/alternative; boundary="${alt}"`
        : 'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n')

  return new Promise((resolve) => {
    let settled = false
    let step = 0
    const cmds = [
      'EHLO goldhour.app',
      'AUTH LOGIN',
      b64(user),
      b64(pass),
      `MAIL FROM:<${user}>`,
      `RCPT TO:<${opts.to}>`,
      'DATA',
      `${payload}\r\n.`,
      'QUIT',
    ]
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        sock.end()
      } catch {
        /* ignore */
      }
      resolve(ok)
    }
    const timer = setTimeout(() => finish(false), 12000)
    const sock = connect({ host, port, servername: host })
    sock.setEncoding('utf8')
    let buf = ''
    sock.on('data', (chunk: string) => {
      buf += chunk
      while (true) {
        const idx = buf.indexOf('\r\n')
        if (idx === -1) break
        const line = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        if (/^\d{3}-/.test(line)) continue
        const code = Number(line.slice(0, 3))
        if (!code) continue
        if (code >= 400) {
          console.error('goldhour-smtp', line.slice(0, 180))
          finish(false)
          return
        }
        if (step >= cmds.length) {
          finish(true)
          return
        }
        const cmd = cmds[step]
        step += 1
        sock.write(`${cmd}\r\n`)
        if (cmd === 'QUIT') finish(true)
      }
    })
    sock.on('error', (err) => {
      console.error('goldhour-smtp', err)
      finish(false)
    })
    sock.on('end', () => finish(step > 6))
  })
}
