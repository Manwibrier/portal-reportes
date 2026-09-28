const express = require('express')
const { z } = require('zod')
const {
  create,
  getById,
  list,
  remove,
  update,
} = require('../controllers/users.controller')
const {
  authenticateRequest,
  authorizeRoles,
} = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')
const { asyncHandler } = require('../utils/async-handler')
const { ROLE_VALUES } = require('../utils/roles')

const router = express.Router()

const roleValueSchema = z.enum(ROLE_VALUES)
const roleFieldSchema = z
  .union([
    roleValueSchema,
    z.array(roleValueSchema).min(1).max(ROLE_VALUES.length),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]))

const idSchema = z.object({
  id: z.string().trim().min(1).max(80),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().max(160).optional(),
  role: roleValueSchema.optional(),
})

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
  role: roleFieldSchema,
})

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z
    .union([z.string().min(8).max(200), z.literal('')])
    .optional(),
  role: roleFieldSchema,
})

router.use(authenticateRequest, authorizeRoles(['admin']))

router.get('/', validateRequest({ query: listQuerySchema }), asyncHandler(list))
router.post('/', validateRequest({ body: createUserSchema }), asyncHandler(create))
router.get('/:id', validateRequest({ params: idSchema }), asyncHandler(getById))
router.put(
  '/:id',
  validateRequest({ params: idSchema, body: updateUserSchema }),
  asyncHandler(update)
)
router.delete('/:id', validateRequest({ params: idSchema }), asyncHandler(remove))

module.exports = router
