const express = require('express')
const authRoutes = require('./auth.routes')
const healthRoutes = require('./health.routes')
const ticketsRoutes = require('./tickets.routes')
const clientesRoutes = require('./clientes.routes')
const gerenciaRoutes = require('./gerencia.routes')
const operacionesRoutes = require('./operaciones.routes')
const usersRoutes = require('./users.routes')

const router = express.Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/tickets', ticketsRoutes)
router.use('/clientes', clientesRoutes)
router.use('/gerencia', gerenciaRoutes)
router.use('/operaciones', operacionesRoutes)
router.use('/users', usersRoutes)

module.exports = router
