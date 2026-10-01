const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const { env } = require('./config/env')
const apiRoutes = require('./routes')
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware')

const app = express()

app.disable('x-powered-by')

// Detras de nginx (compose) la IP real llega en X-Forwarded-For.
// TRUST_PROXY=true confia en el primer hop; el backend no debe exponerse directo.
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1)
}

if (env.FRONTEND_ORIGIN === '*' && env.NODE_ENV === 'production') {
  console.warn(
    'ADVERTENCIA: FRONTEND_ORIGIN=* en produccion permite CORS abierto a cualquier origen.',
  )
}

app.use(helmet())

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN === '*' ? true : env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: false,
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

// Red de seguridad global generosa por IP; la proteccion estricta esta en el login.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Demasiadas solicitudes. Intente mas tarde.',
      code: 'RATE_LIMITED',
    },
  })
)

app.use('/api', apiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = {
  app,
}
