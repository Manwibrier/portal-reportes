const express = require('express')
const { z } = require('zod')
const { getMe, login, logout } = require('../controllers/auth.controller')
const { authenticateRequest } = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')
const { asyncHandler } = require('../utils/async-handler')

const router = express.Router()

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
})

router.post('/login', validateRequest({ body: loginSchema }), asyncHandler(login))
router.post('/logout', authenticateRequest, asyncHandler(logout))
router.get('/me', authenticateRequest, asyncHandler(getMe))

module.exports = router
