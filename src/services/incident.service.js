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

module.exports = {}
