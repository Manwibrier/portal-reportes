const express = require('express')
const { z } = require('zod')
const { asyncHandler } = require('../utils/async-handler')
const { getDashboard } = require('../controllers/gerencia.controller')
const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')

const router = express.Router()

const WINDOW_MONTHS_MIN = 1
const WINDOW_MONTHS_MAX = 24

const gerenciaQuerySchema = z.object({
  zona: z.string().trim().min(1).max(120).optional(),
  franquicia: z.string().trim().min(1).max(120).optional(),
  segmento: z.enum(['HOGAR', 'JURIDICO', 'GOBIERNO']).default('HOGAR'),
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'El periodo debe tener formato YYYY-MM')
    .optional(),
  windowMonths: z.coerce
    .number()
    .int()
    .min(WINDOW_MONTHS_MIN)
    .max(WINDOW_MONTHS_MAX)
    .default(12),
})

router.use(authenticateRequest)

router.get(
  '/dashboard',
  authorizeRoles(['admin', 'gerencia']),
  validateRequest({ query: gerenciaQuerySchema }),
  asyncHandler(getDashboard),
)

module.exports = router
