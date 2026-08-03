const express = require('express')
const { z } = require('zod')
const { asyncHandler } = require('../utils/async-handler')
const {
  getDashboard,
  getCierreMensual,
} = require('../controllers/clientes.controller')
const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')

const router = express.Router()

const MONTH_MIN = 1
const MONTH_MAX = 12
const YEAR_MIN = 2020
const YEAR_MAX = 2100

const clientesQuerySchema = z.object({
  zona: z.string().trim().min(1).max(120).optional(),
  franquicia: z.string().trim().min(1).max(120).optional(),
})

const cierreMensualQuerySchema = z.object({
  zona: z.string().trim().min(1).max(120).optional(),
  franquicia: z.string().trim().min(1).max(120).optional(),
  mes: z.coerce.number().int().min(MONTH_MIN).max(MONTH_MAX),
  anio: z.coerce.number().int().min(YEAR_MIN).max(YEAR_MAX),
})

router.use(authenticateRequest)

router.get(
  '/dashboard',
  authorizeRoles(['admin', 'clientes.resumen-diario']),
  validateRequest({ query: clientesQuerySchema }),
  asyncHandler(getDashboard),
)

router.get(
  '/cierre-mensual',
  authorizeRoles(['admin', 'clientes.cierre-mensual']),
  validateRequest({ query: cierreMensualQuerySchema }),
  asyncHandler(getCierreMensual),
)

module.exports = router
