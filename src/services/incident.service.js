const prisma = require('../config/db')
const monitorEvents = require('../events/monitorEvents')

monitorEvents.on('monitor:down', async (monitor, result) => {
  try {
    await prisma.incident.create({
      data: {
        monitorId: monitor.id,
        reason: result.error
      }
    })
    console.log('[DOWN]', monitor.name, result.error)
  } catch (err) {
    console.error(err.message)
  }
})

monitorEvents.on('monitor:up', async (monitor) => {
  try {
    await prisma.incident.updateMany({
      where: { monitorId: monitor.id, resolvedAt: null },
      data: { resolvedAt: new Date() }
    })
    console.log('[UP]', monitor.name, 'recovered')
  } catch (err) {
    console.error('Failed to resolve incidents for monitor', monitor.id, err.message)
  }
})

module.exports = {}
