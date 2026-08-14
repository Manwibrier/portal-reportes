const { app } = require('./app')
const { env } = require('./config/env')
const { closePool } = require('./config/database')
const { closeAuthDatabase } = require('./config/auth-database')

const server = app.listen(env.PORT, () => {
  console.log(`Servidor backend en http://localhost:${env.PORT}`)
})

let isShuttingDown = false

async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`${signal} recibido. Cerrando servidor...`)

  server.close(async () => {
    try {
      await closePool()
      closeAuthDatabase()
      console.log('Recursos del backend cerrados correctamente')
      process.exit(0)
    } catch (error) {
      console.error('Error cerrando recursos del backend:', error)
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
