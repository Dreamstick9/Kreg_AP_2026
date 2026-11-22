// Sends email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// HTTP instead of SMTP so it works on hosts that block outbound SMTP ports.

const RESEND_URL = 'https://api.resend.com/emails'
const TIMEOUT_MS = 10000

async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[email] RESEND_API_KEY not set, skipping:', subject)
    return false
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.ALERT_FROM_EMAIL || 'Kreg Lite <onboarding@resend.dev>',
      to: [to],
      subject,
      text,
      html
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend responded ${res.status}: ${body}`)
  }

  return true
}

module.exports = { sendEmail }
