const express = require('express')
const { z } = require('zod')

const controller =
  require('../controllers/finanzas.controller')

const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')

const {
  validateRequest,
} = require('../middlewares/validation.middleware')

const {
  asyncHandler,
} = require('../utils/async-handler')

const router = express.Router()

const querySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2100)
    .optional(),
})

router.use(authenticateRequest)

router.get(
  '/dashboard',
  authorizeRoles([
    'admin',
    'finanzas',
  ]),
  validateRequest({
    query: querySchema,
  }),
  asyncHandler(controller.dashboard),
)

module.exports = router