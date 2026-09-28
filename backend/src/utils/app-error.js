class AppError extends Error {
  /**
   * @param {string} message Mensaje legible para el cliente.
   * @param {number} [statusCode=500] Código HTTP.
   * @param {string} [code='INTERNAL_ERROR'] Código interno del error.
   * @param {unknown} [details] Detalles serializables para diagnóstico.
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

module.exports = {
  AppError,
}
