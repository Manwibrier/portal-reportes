const express = require('express')
const { z } = require('zod')
const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const { getMe, login, logout } = require('../controllers/auth.controller')
const { authenticateRequest } = require('../middlewares/auth.middleware')
const { validateRequest } = require('../middlewares/validation.middleware')
const { asyncHandler } = require('../utils/async-handler')

const router = express.Router()

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
})

// Fuerza bruta: pocas intentos por IP + correo. Solo cuenta intentos fallidos
// (skipSuccessfulRequests) para no castigar logins validos compartiendo IP.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').toLowerCase()}`,
  message: {
    error: 'Demasiados intentos de inicio de sesion. Espere unos minutos.',
    code: 'RATE_LIMITED',
  },
})

router.post('/login', loginRateLimiter, validateRequest({ body: loginSchema }), asyncHandler(login))
router.post('/logout', authenticateRequest, asyncHandler(logout))
router.get('/me', authenticateRequest, asyncHandler(getMe))

module.exports = router
