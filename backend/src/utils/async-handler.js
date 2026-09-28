/**
 * Envuelve handlers async para reenviar errores al middleware global.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} handler
 * @returns {import('express').RequestHandler}
 */
function asyncHandler(handler) {
  return function asyncRouteHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

module.exports = {
  asyncHandler,
}
