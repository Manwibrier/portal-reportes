const express = require('express')
const { z } = require('zod')
const { asyncHandler } = require('../utils/async-handler')
const {
  getDashboard,
  getSmartOlt,
  getSmartOltOlts,
  getOrdenesServicio,
} = require('../controllers/operaciones.controller')
const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')

const router = express.Router()

const LIMIT_MIN = 1
const LIMIT_MAX = 20000
const DEFAULT_LIMIT = 5000

const optionalText = (max = 180) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .optional()

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

const optionalPeriod = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/)
  .optional()

const operacionesDashboardQuerySchema = z.object({
  olt: optionalText(180),
  status: optionalText(80),
  signalBand: z
    .enum(['all', 'very-good', 'warning', 'critical', 'without-signal'])
    .optional(),
  ordenStatus: optionalText(80),
  zona: optionalText(120),
  franquicia: optionalText(120),
  servicio: optionalText(120),
  limit: z.coerce
    .number()
    .int()
    .min(LIMIT_MIN)
    .max(LIMIT_MAX)
    .default(DEFAULT_LIMIT),
  meta: z.enum(['true', 'false']).optional(),
  debug: z.enum(['true', 'false']).optional(),
})

const smartOltQuerySchema = z.object({
  olt: optionalText(180),
  status: optionalText(80),
  signalBand: z
    .enum(['all', 'very-good', 'warning', 'critical', 'without-signal'])
    .optional(),
  limit: z.coerce
    .number()
    .int()
    .min(LIMIT_MIN)
    .max(LIMIT_MAX)
    .default(DEFAULT_LIMIT),
  meta: z.enum(['true', 'false']).optional(),
  debug: z.enum(['true', 'false']).optional(),
})

const smartOltOltsQuerySchema = z.object({
  search: optionalText(120),
  meta: z.enum(['true', 'false']).optional(),
})

const ordenesServicioQuerySchema = z.object({
  periodo: optionalPeriod,
  fechaDesde: optionalDate,
  fechaHasta: optionalDate,
  anio: z.coerce.number().int().min(2018).max(2100).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
  scope: z.enum(['registered', 'executed', 'backlog', 'year']).optional(),
  alcance: z.enum(['registered', 'executed', 'backlog', 'year']).optional(),
  zona: optionalText(120),
  franquicia: optionalText(160),
  sector: optionalText(160),
  servicio: optionalText(120),
  tipoServicio: optionalText(160),
  tipoOrden: optionalText(180),
  estatusOrden: optionalText(120),
  estatusContrato: optionalText(120),
  tecnico: optionalText(220),
  usuarioCreador: optionalText(160),
  cohorte: z
    .enum([
      'REGISTRADA_Y_EJECUTADA_EN_PERIODO',
      'ARRASTRE_EJECUTADO_EN_PERIODO',
      'NUEVA_PENDIENTE',
      'BACKLOG_ANTERIOR_PENDIENTE',
      'REGISTRADA_EN_PERIODO',
    ])
    .optional(),
  meta: z.enum(['true', 'false']).optional(),
  debug: z.enum(['true', 'false']).optional(),
})

function registerGet(path, allowedRoles, querySchema, controller) {
  router.get(
    path,
    authorizeRoles(allowedRoles),
    validateRequest({ query: querySchema }),
    asyncHandler(controller),
  )
}

router.use(authenticateRequest)

registerGet(
  '/dashboard',
  ['admin', 'operaciones.dashboard'],
  operacionesDashboardQuerySchema,
  getDashboard,
)

registerGet(
  '/smartolt/olts',
  ['admin', 'operaciones.smartolt'],
  smartOltOltsQuerySchema,
  getSmartOltOlts,
)

registerGet(
  '/smartolt',
  ['admin', 'operaciones.smartolt'],
  smartOltQuerySchema,
  getSmartOlt,
)

registerGet(
  '/ordenes-servicio',
  ['admin', 'operaciones.ordenes-servicio'],
  ordenesServicioQuerySchema,
  getOrdenesServicio,
)

module.exports = router
