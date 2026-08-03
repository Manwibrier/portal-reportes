const { z } = require('zod')
const { fromError } = require('zod-validation-error')
const { AppError } = require('../utils/app-error')

/**
 * Middleware para rutas inexistentes.
 *
 * @type {import('express').RequestHandler}
 */
function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      `La ruta ${req.method} ${req.originalUrl} no existe.`,
      404,
      'NOT_FOUND'
    )
  )
}

/**
 * Middleware global de errores.
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(error, _req, res, _next) {
  if (res.headersSent) {
    return
  }

  if (error instanceof z.ZodError) {
    const formatted = fromError(error)

    res.status(400).json({
      error: formatted.message,
      code: 'VALIDATION_ERROR',
      details: error.issues,
    })
    return
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    })
    return
  }

  console.error('Error no controlado en la API:', error)

  res.status(500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  })
}

module.exports = {
  notFoundHandler,
  errorHandler,
}
