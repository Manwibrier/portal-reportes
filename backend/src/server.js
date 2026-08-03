const { app } = require('./app')
const { env } = require('./config/env')
const { closePool } = require('./config/database')

const server = app.listen(env.PORT, () => {
  console.log(`Servidor backend en http://localhost:${env.PORT}`)
})

let isShuttingDown = false

/**
 * Cierra servidor HTTP y pool de PostgreSQL de forma controlada.
 *
 * @param {string} signal Señal recibida por el proceso.
 */
async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`${signal} recibido. Cerrando servidor...`)

  server.close(async () => {
    try {
      await closePool()
      console.log('Pool de PostgreSQL cerrado correctamente')
      process.exit(0)
    } catch (error) {
      console.error('Error cerrando el pool de PostgreSQL:', error)
      process.exit(1)
    }
  })

  setTimeout(() => {
    console.error('Cierre forzado por timeout')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
