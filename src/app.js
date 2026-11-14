const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()


const healthRoutes = require('./routes/health.routes')


app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/healthz', healthRoutes)


module.exports = app