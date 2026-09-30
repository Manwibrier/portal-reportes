const { z } = require('zod')

/**
 * Normaliza req.query para que Zod pueda interpretar arrays repetidos y strings vacíos.
 *
 * @param {Record<string, unknown>} query Query original.
 * @returns {Record<string, unknown>}
 */
function normalizeQuery(query = {}) {
  return Object.entries(query).reduce((acc, [key, value]) => {
    if (value === '') {
      acc[key] = undefined
      return acc
    }

    acc[key] = value
    return acc
  }, {})
}

/**
 * Valida body/query/params y expone la data validada en req.validated.
 *
 * @param {{ body?: z.ZodTypeAny, query?: z.ZodTypeAny, params?: z.ZodTypeAny }} schemas
 * @returns {import('express').RequestHandler}
 */
function validateRequest(schemas = {}) {
  return function validate(req, _res, next) {
    req.validated = {
      body: req.body,
      query: req.query,
      params: req.params,
    }

    if (schemas.body) {
      req.validated.body = schemas.body.parse(req.body)
    }

    if (schemas.query) {
      req.validated.query = schemas.query.parse(normalizeQuery(req.query))
    }

    if (schemas.params) {
      req.validated.params = schemas.params.parse(req.params)
    }

    next()
  }
}

module.exports = {
  validateRequest,
}
