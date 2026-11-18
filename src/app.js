const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const authRoutes = require('./routes/auth.routes')
const healthRoutes = require('./routes/health.routes')
const monitorRoutes = require('./routes/monitor.routes')
const statsRoutes = require('./routes/stats.routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')
const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/v1/auth', authRoutes)
app.use('/healthz', healthRoutes)
app.use('/api/v1/monitors', monitorRoutes)
app.use('/api/v1/stats', statsRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
