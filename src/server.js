require('dotenv').config()

const { connect } = require('node:http2')
const app = require('./app')

PORT = process.env.PORT || 3000

app.listen(PORT, () =>{
    console.log(`Kreg Lite running on http://localhost:${PORT}`)
})