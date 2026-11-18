require('dotenv').config()

const prisma = require('./config/db')
const app = require('./app')
const { startScheduler } = require('./jobs/scheduler')
require('./services/incident.service')

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
    console.log(`Kreg Lite running on http://localhost:${PORT}`)
})

const timer = startScheduler()

const shutdown = async () => {
    clearInterval(timer)
    server.close()
    await prisma.$disconnect()
    console.log('Shut down cleanly')
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
