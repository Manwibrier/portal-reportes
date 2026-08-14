const path = require('path')
const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env'),
})

const booleanString = (defaultValue = 'false') => z
  .string()
  .trim()
  .toLowerCase()
  .default(defaultValue)
  .transform((value) => value === 'true')

const trimmedString = (defaultValue = '') =>
  z
    .string()
    .trim()
    .default(defaultValue)

const requiredString = (name) =>
  z.string().trim().min(1, `${name} es requerido`)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: trimmedString('*'),

  DB_HOST: requiredString('DB_HOST'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: requiredString('DB_NAME'),
  DB_USER: requiredString('DB_USER'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: booleanString(),
  DB_READ_ONLY: booleanString('true'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  DB_APP_NAME: trimmedString('portal-reportes-backend'),
  DEFAULT_WINDOW_MONTHS: z.coerce.number().int().min(1).max(24).default(12),

  POCKETBASE_URL: requiredString('POCKETBASE_URL'),
  POCKETBASE_ADMIN_EMAIL: requiredString('POCKETBASE_ADMIN_EMAIL'),
  POCKETBASE_ADMIN_PASSWORD: requiredString('POCKETBASE_ADMIN_PASSWORD'),
  POCKETBASE_USERS_COLLECTION: trimmedString('users'),
  POCKETBASE_SESSIONS_COLLECTION: trimmedString('sessions'),
  POCKETBASE_SESSION_AUDITS_COLLECTION: trimmedString('session_audits'),
  POCKETBASE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().int().positive().max(168).default(12),

  SMARTOLT_BASE_URL: requiredString('SMARTOLT_BASE_URL'),
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

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n- ')

  throw new Error(`Configuracion invalida de entorno:\n- ${issues}`)
}

module.exports = {
  env: parsedEnv.data,
}
