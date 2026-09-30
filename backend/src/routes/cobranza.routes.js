const express = require('express')
const { z } = require('zod')
const controller = require('../controllers/cobranza.controller')
const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')
const { asyncHandler } = require('../utils/async-handler')

const router = express.Router()

const optionalText = (max = 180) =>
  z.string().trim().min(1).max(max).optional()

const cobranzaQuerySchema = z.object({
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'El periodo debe tener formato YYYY-MM')
    .optional(),
  zona: optionalText(180),
  franquicia: optionalText(180),
  servicio: optionalText(140),
  search: optionalText(180),
  limit: z.coerce.number().int().min(1).max(5000).default(300),
})

const cobranzaSnapshotSchema = z.object({
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'El periodo debe tener formato YYYY-MM')
    .optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(5000),
})

const cobranzaAnalisisSchema = z.object({
  periodo: z.string().trim().regex(/^\d{4}-\d{2}$/, 'El periodo debe tener formato YYYY-MM').optional(),
  zona: optionalText(180),
  franquicia: optionalText(180),
  servicio: optionalText(140),
  search: optionalText(180),
  limit: z.coerce.number().int().min(1).max(150000).default(50000),
})

router.use(authenticateRequest)

router.get(
  '/dashboard',
  authorizeRoles(['admin', 'cobranza.resumen', 'cobranza.detalle']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.dashboard),
)

router.get(
  '/regiones',
  authorizeRoles(['admin', 'cobranza.resumen', 'cobranza.detalle']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.regiones),
)

router.get(
  '/franquicias',
  authorizeRoles(['admin', 'cobranza.detalle', 'cobranza.resumen']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.franquicias),
)

router.get(
  '/tablas',
  authorizeRoles(['admin', 'cobranza.detalle']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.tablas),
)

router.get(
  '/clientes-x-cobrar',
  authorizeRoles(['admin', 'cobranza.detalle']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.clientesXCobrar),
)

router.get(
  '/historico',
  authorizeRoles(['admin', 'cobranza.historico', 'cobranza.resumen']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.historico),
)

router.get(
  '/auditoria',
  authorizeRoles(['admin', 'cobranza.historico']),
  validateRequest({ query: cobranzaQuerySchema }),
  asyncHandler(controller.auditoria),
)

router.post(
  '/snapshot',
  authorizeRoles(['admin', 'cobranza.historico']),
  validateRequest({ body: cobranzaSnapshotSchema }),
  asyncHandler(controller.snapshot),
)

router.get(
  '/analisis-comparativo',
  authorizeRoles(['admin', 'cobranza.detalle', 'cobranza.resumen']),
  validateRequest({ query: cobranzaAnalisisSchema }),
  asyncHandler(controller.analisisComparativo),
)

module.exports = router
