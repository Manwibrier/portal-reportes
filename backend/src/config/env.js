const path = require('path')
const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env'),
})

const booleanString = z
  .string()
  .trim()
  .toLowerCase()
  .default('false')
  .transform((value) => value === 'true')

const trimmedString = (defaultValue = '') =>
  z
    .string()
    .trim()
    .default(defaultValue)

const rawEnv = {
  ...process.env,

  /**
   * Compatibilidad:
   * PocketBase ahora usa el concepto "superuser", pero en el backend
   * mantenemos el nombre POCKETBASE_ADMIN_* para no romper servicios existentes.
   */
  POCKETBASE_ADMIN_EMAIL:
    process.env.POCKETBASE_ADMIN_EMAIL ||
    process.env.POCKETBASE_SUPERUSER_EMAIL ||
    process.env.PB_ADMIN_EMAIL ||
    '',

  POCKETBASE_ADMIN_PASSWORD:
    process.env.POCKETBASE_ADMIN_PASSWORD ||
    process.env.POCKETBASE_SUPERUSER_PASSWORD ||
    process.env.PB_ADMIN_PASSWORD ||
    '',
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: trimmedString('*'),

  DB_HOST: z.string().trim().min(1, 'DB_HOST es requerido'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().trim().min(1, 'DB_NAME es requerido'),
  DB_USER: z.string().trim().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: booleanString,
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  DB_APP_NAME: trimmedString('portal-reportes-backend'),
  DEFAULT_WINDOW_MONTHS: z.coerce.number().int().min(1).max(24).default(12),

  POCKETBASE_URL: trimmedString('http://127.0.0.1:8090'),
  POCKETBASE_ADMIN_EMAIL: trimmedString(''),
  POCKETBASE_ADMIN_PASSWORD: z.string().trim().default(''),
  POCKETBASE_USERS_COLLECTION: trimmedString('users'),
  POCKETBASE_SESSION_AUDITS_COLLECTION: trimmedString('session_audits'),

  SMARTOLT_BASE_URL: trimmedString('https://cablenorte.smartolt.com/'),
  SMARTOLT_STATUS_PATH: trimmedString('api/onu/get_onus_statuses'),
  SMARTOLT_DETAILS_PATH: trimmedString(''),
  SMARTOLT_SIGNALS_PATH: trimmedString('api/onu/get_onus_signals'),
  SMARTOLT_OLTS_PATH: trimmedString(''),
  SMARTOLT_API_TOKEN: z.string().trim().default(''),
  SMARTOLT_AUTH_HEADER: trimmedString('X-Token'),
  SMARTOLT_AUTH_SCHEME: trimmedString(''),
  SMARTOLT_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),

  OPERACIONES_ORDENES_SCHEMA: trimmedString('powerbi'),
  OPERACIONES_ORDENES_TABLE: trimmedString('ordenes_servicio'),
})

const parsedEnv = envSchema.safeParse(rawEnv)

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n- ')

  throw new Error(`Configuración inválida de entorno:\n- ${issues}`)
}

module.exports = {
  env: parsedEnv.data,
}