const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const authRoutes = require('./routes/auth.routes')
const healthRoutes = require('./routes/health.routes')

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/v1/auth', authRoutes)
app.use('/healthz', healthRoutes)

module.exports = app