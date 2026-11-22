// Emails the monitor's owner when it goes DOWN and when it recovers.
// checker.service emits each event once per state change, so this sends one email per transition.

const prisma = require('../config/db')
const monitorEvents = require('../events/monitorEvents')
const { sendEmail } = require('./email.service')

const APP_URL = () => process.env.APP_URL || 'https://kreg-lite.dreamstick.dev'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000))
  if (totalMinutes < 1) return 'less than a minute'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  return parts.join(' ')
}

async function ownerEmail(monitor) {
  const user = await prisma.user.findUnique({
    where: { id: monitor.userId },
    select: { email: true }
  })
  return user?.email
}

monitorEvents.on('monitor:down', async (monitor, result) => {
  try {
    const to = await ownerEmail(monitor)
    if (!to) return

    const link = `${APP_URL()}/monitors/${monitor.id}`
    const reason = result.error || 'Unknown error'
    const time = new Date().toUTCString()

    const sent = await sendEmail({
      to,
      subject: `🔴 ${monitor.name} is DOWN`,
      text: `${monitor.name} (${monitor.url}) is DOWN.\n\nReason: ${reason}\nDetected: ${time}\n\nDetails: ${link}`,
      html: `<p><strong>${escapeHtml(monitor.name)}</strong> (${escapeHtml(monitor.url)}) is <strong>DOWN</strong>.</p>
<p>Reason: ${escapeHtml(reason)}<br>Detected: ${escapeHtml(time)}</p>
<p><a href="${escapeHtml(link)}">View monitor</a></p>`
    })
    if (sent) console.log('[email] down alert sent for', monitor.name)
  } catch (err) {
    console.error('[email] down alert failed for monitor', monitor.id, err.message)
  }
})

monitorEvents.on('monitor:up', async (monitor) => {
  try {
    const to = await ownerEmail(monitor)
    if (!to) return

    const incident = await prisma.incident.findFirst({
      where: { monitorId: monitor.id },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    })
    const downFor = incident ? formatDuration(Date.now() - incident.startedAt.getTime()) : null

    const link = `${APP_URL()}/monitors/${monitor.id}`
    const time = new Date().toUTCString()
    const downLine = downFor ? `Down for: ${downFor}` : ''

    const sent = await sendEmail({
      to,
      subject: `🟢 ${monitor.name} is back UP`,
      text: `${monitor.name} (${monitor.url}) is back UP.\n\nRecovered: ${time}\n${downLine}\n\nDetails: ${link}`,
      html: `<p><strong>${escapeHtml(monitor.name)}</strong> (${escapeHtml(monitor.url)}) is back <strong>UP</strong>.</p>
<p>Recovered: ${escapeHtml(time)}${downFor ? `<br>Down for: ${escapeHtml(downFor)}` : ''}</p>
<p><a href="${escapeHtml(link)}">View monitor</a></p>`
    })
    if (sent) console.log('[email] recovery alert sent for', monitor.name)
  } catch (err) {
    console.error('[email] recovery alert failed for monitor', monitor.id, err.message)
  }
})

module.exports = {}
