const express = require('express')
const { z } = require('zod')
const { asyncHandler } = require('../utils/async-handler')
const {
  getManagementDashboard,
  getOperationalDashboard,
  listBacklogMonthly,
  listMonthlyTickets,
  listOperationalCriticalTickets,
  listRejectionReasons,
  listTickets,
} = require('../controllers/tickets.controller')
const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')

const router = express.Router()

const WINDOW_MONTHS_MIN = 1
const WINDOW_MONTHS_MAX = 24
const LIMIT_MIN = 1
const LIMIT_MAX = 100
const REJECTION_LIMIT_MAX = 20

const TICKETS_OPERATIONAL_ROLES = ['admin', 'tickets.operacional']
const TICKETS_MANAGEMENT_ROLES = ['admin', 'tickets.gerencial']

function createWindowMonthsSchema(defaultValue) {
  return z.coerce
    .number()
    .int()
    .min(WINDOW_MONTHS_MIN)
    .max(WINDOW_MONTHS_MAX)
    .default(defaultValue)
}

function createLimitSchema(defaultValue, maxValue = LIMIT_MAX) {
  return z.coerce
    .number()
    .int()
    .min(LIMIT_MIN)
    .max(maxValue)
    .default(defaultValue)
}

const departmentSchema = z.string().trim().min(1).max(120).optional()

const ticketsQuerySchema = z.object({
  windowMonths: createWindowMonthsSchema(12),
  department: departmentSchema,
  limit: createLimitSchema(25),
})

const monthlyQuerySchema = z.object({
  windowMonths: createWindowMonthsSchema(18),
})

const rejectionQuerySchema = z.object({
  windowMonths: createWindowMonthsSchema(12),
  limit: createLimitSchema(10, REJECTION_LIMIT_MAX),
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

registerGet('/', TICKETS_OPERATIONAL_ROLES, ticketsQuerySchema, listTickets)
registerGet(
  '/mensuales',
  TICKETS_MANAGEMENT_ROLES,
  monthlyQuerySchema,
  listMonthlyTickets,
)
registerGet(
  '/operacional-resumen',
  TICKETS_OPERATIONAL_ROLES,
  ticketsQuerySchema,
  getOperationalDashboard,
)
registerGet(
  '/operacional-criticos',
  TICKETS_OPERATIONAL_ROLES,
  ticketsQuerySchema,
  listOperationalCriticalTickets,
)
registerGet(
  '/gerencial-resumen',
  TICKETS_MANAGEMENT_ROLES,
  monthlyQuerySchema,
  getManagementDashboard,
)
registerGet(
  '/backlog-mensual',
  TICKETS_OPERATIONAL_ROLES,
  monthlyQuerySchema,
  listBacklogMonthly,
)
registerGet(
  '/rechazos',
  TICKETS_MANAGEMENT_ROLES,
  rejectionQuerySchema,
  listRejectionReasons,
)

module.exports = router
