const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()


const healthRoutes = require('./routes/health.routes')
const monitorRoutes = require('./routes/monitor.routes')


app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/healthz', healthRoutes)
app.use('/api/v1/monitors', monitorRoutes)


module.exports = app
