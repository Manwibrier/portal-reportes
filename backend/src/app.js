const express = require('express')
const cors = require('cors')
const { env } = require('./config/env')
const apiRoutes = require('./routes')
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware')

const app = express()

app.disable('x-powered-by')

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN === '*' ? true : env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: false,
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

app.use('/api', apiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = {
  app,
}
