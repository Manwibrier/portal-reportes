/**
 * Pruebas de carga (stress) del Portal de Reportes.
 *
 * Mide latencia real por endpoint con N workers concurrentes y reporta
 * percentiles. Sin dependencias externas: usa el `fetch` global de Node 18+.
 *
 * Uso:
 *   npm run perf:stress -- --selftest
 *   npm run perf:stress -- --base-url http://192.168.30.51:8083 \
 *     --email analistadedatos@norteconecta.net --password 12345678 \
 *     --requests 20 --concurrency 10 --json /tmp/after.json
 *
 * OJO con las dos cachés, no son lo mismo:
 *   - `--cache-bust`   : añade ?_=<rand>  -> solo rompe cachés HTTP/nginx.
 *   - `--vary`         : cicla un FILTRO real -> rompe la caché en memoria del
 *                        backend (buildCacheKey usa solo los filtros).
 *                        Ej: --vary windowMonths=1-24
 *
 * El limitador global del backend es 1000 req / 15 min por IP: usa `--requests`
 * y/o `--min-gap-ms`. Al primer 429 el script aborta para no quemar la ventana.
 *
 * Variables de entorno equivalentes: BASE_URL, PORTAL_TOKEN, EMAIL, PASSWORD.
 */
const fs = require('node:fs')
const http = require('node:http')

// Default local a proposito: apuntar al servidor compartido debe ser explicito.
const DEFAULT_BASE_URL = 'http://127.0.0.1:3100'

const DEFAULT_PATHS = [
  '/api/health',
  '/api/tickets?page=1&perPage=1',
  '/api/clientes/dashboard',
  '/api/cobranza/dashboard',
  '/api/finanzas/dashboard?year=2026',
  '/api/gerencia/dashboard?windowMonths=12',
  '/api/operaciones/dashboard',
  '/api/operaciones/ordenes-servicio',
]

const SAFE_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '0.0.0.0'])

function parseArgs(argv) {
  const args = { _: [] }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]

    if (next === undefined || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

/**
 * Percentil nearest-rank sobre un array ya ordenado de forma ascendente:
 * rank = ceil(p/100 * n), convertido a indice 0-based.
 */
function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0

  const rank = Math.ceil((p / 100) * sortedAsc.length)
  const index = Math.min(Math.max(rank, 1), sortedAsc.length) - 1

  return sortedAsc[index]
}

function summarize(latenciesMs, statusCodes, errorCount, elapsedMs) {
  const sorted = [...latenciesMs].sort((left, right) => left - right)
  const sum = latenciesMs.reduce((acc, value) => acc + value, 0)
  const total = latenciesMs.length + errorCount

  return {
    count: latenciesMs.length,
    errors: errorCount,
    statusCodes,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted.length ? sorted[sorted.length - 1] : 0,
    mean: latenciesMs.length ? sum / latenciesMs.length : 0,
    rps: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
  }
}

function withCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatMs(value) {
  if (!Number.isFinite(value) || value === 0) return '0ms'
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`
}

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`login fallo con HTTP ${response.status}`)
  }

  const payload = await response.json()

  if (!payload?.token) {
    throw new Error('login no devolvio token')
  }

  return payload.token
}

class RateLimitError extends Error {
  constructor() {
    super('el backend respondio 429 (limitador global 1000 req / 15 min por IP)')
    this.name = 'RateLimitError'
  }
}

/** "windowMonths=1-24" -> { name, from, to } */
function parseVary(spec) {
  if (!spec) return null

  const match = String(spec).match(/^([A-Za-z_][A-Za-z0-9_]*)=(-?\d+)-(-?\d+)$/)

  if (!match) {
    throw new Error(`--vary invalido: "${spec}". Formato esperado: nombre=min-max`)
  }

  return { name: match[1], from: Number(match[2]), to: Number(match[3]) }
}

/** Cicla el valor de un filtro real: es lo unico que cambia buildCacheKey(). */
function applyVary(url, vary, counter) {
  if (!vary) return url

  const span = vary.to - vary.from + 1
  const value = vary.from + (counter % span)
  // Base falsa para tolerar tambien rutas relativas (pruebas).
  const isAbsolute = /^https?:\/\//i.test(url)
  const parsed = new URL(url, 'http://localhost')

  parsed.searchParams.set(vary.name, String(value))

  return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}`
}

async function runPath({
  baseUrl,
  path,
  token,
  concurrency,
  durationMs,
  timeoutMs,
  cacheBust,
  requests,
  minGapMs,
  vary,
  abortOn429,
}) {
  const latencies = []
  const statusCodes = {}
  let errorCount = 0
  let rateLimited = 0
  let issued = 0
  const deadline = Date.now() + durationMs

  async function worker() {
    while (true) {
      // El incremento debe ser sincrono respecto al await para no emitir de mas.
      if (requests > 0) {
        if (issued >= requests) return
        issued += 1
      } else if (Date.now() >= deadline) {
        return
      }

      let url = applyVary(baseUrl + path, vary, issued)
      if (cacheBust) url = withCacheBust(url)

      const started = performance.now()

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        })

        // Se consume el cuerpo para medir la transferencia completa, no solo los headers.
        await response.arrayBuffer()

        latencies.push(performance.now() - started)
        statusCodes[response.status] = (statusCodes[response.status] || 0) + 1

        if (response.status === 429) {
          rateLimited += 1
          if (abortOn429) throw new RateLimitError()
        }
      } catch (error) {
        if (error instanceof RateLimitError) throw error

        errorCount += 1

        const label =
          error?.name === 'TimeoutError'
            ? `timeout>${timeoutMs}ms`
            : error?.cause?.code || error?.name || 'error'

        statusCodes[label] = (statusCodes[label] || 0) + 1
      }

      if (minGapMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, minGapMs))
      }
    }
  }

  const startedAt = Date.now()
  await Promise.all(Array.from({ length: concurrency }, worker))
  const elapsedMs = Date.now() - startedAt

  return {
    path,
    concurrency,
    cacheBust,
    vary: vary ? `${vary.name}=${vary.from}-${vary.to}` : null,
    rateLimited,
    elapsedMs,
    ...summarize(latencies, statusCodes, errorCount, elapsedMs),
  }
}


function printTable(results) {
  const head = ['ENDPOINT', 'n', 'err', 'p50', 'p95', 'p99', 'max', 'rps', 'codigos']
  const rows = results.map((item) => [
    item.path,
    String(item.count),
    String(item.errors),
    formatMs(item.p50),
    formatMs(item.p95),
    formatMs(item.p99),
    formatMs(item.max),
    item.rps.toFixed(2),
    Object.entries(item.statusCodes).map(([code, n]) => `${code}:${n}`).join(' '),
  ])

  const widths = head.map((title, index) =>
    Math.max(title.length, ...rows.map((row) => row[index].length)))

  const line = (cells) => cells.map((cell, i) => cell.padEnd(widths[i])).join('  ')

  console.log(`[perf:stress] ${line(head)}`)
  rows.forEach((row) => console.log(`[perf:stress] ${line(row)}`))
}

async function selftest() {
  const assert = require('node:assert/strict')
  const sample = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  // nearest-rank: p50 -> rank 5 -> 50 | p95 -> rank 10 -> 100
  assert.equal(percentile(sample, 50), 50)
  assert.equal(percentile(sample, 95), 100)
  assert.equal(percentile(sample, 100), 100)
  assert.equal(percentile([], 50), 0)

  const summary = summarize([10, 20, 30, 40], { 200: 4 }, 0, 1000)
  assert.equal(summary.count, 4)
  assert.equal(summary.errors, 0)
  assert.equal(summary.p50, 20)
  assert.equal(summary.p95, 40)
  assert.equal(summary.max, 40)
  assert.equal(summary.mean, 25)
  assert.equal(summary.rps, 4)

  assert.ok(withCacheBust('/api/x').startsWith('/api/x?_='))
  assert.ok(withCacheBust('/api/x?a=1').startsWith('/api/x?a=1&_='))

  // --vary cicla un filtro real: es lo unico que cambia buildCacheKey().
  const vary = parseVary('windowMonths=1-3')
  assert.deepEqual(vary, { name: 'windowMonths', from: 1, to: 3 })
  assert.equal(applyVary('/api/x', vary, 0), '/api/x?windowMonths=1')
  assert.equal(applyVary('/api/x', vary, 3), '/api/x?windowMonths=1')
  assert.equal(applyVary('/api/x', vary, 5), '/api/x?windowMonths=3')
  assert.equal(
    applyVary('http://x/api/x?year=2026', vary, 1),
    'http://x/api/x?year=2026&windowMonths=2',
    'debe conservar la query string existente'
  )
  assert.throws(() => parseVary('basura'), /--vary invalido/)
  assert.equal(parseVary(undefined), null)

  // Integracion real contra un servidor efimero (sin red externa ni BD).
  const server = http.createServer((_req, res) => {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    }, 5)
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  const result = await runPath({
    baseUrl: `http://127.0.0.1:${port}`,
    path: '/api/health',
    token: 'test',
    concurrency: 3,
    durationMs: 300,
    timeoutMs: 5000,
    cacheBust: false,
  })

  const bounded = await runPath({
    baseUrl: `http://127.0.0.1:${port}`,
    path: '/api/health',
    token: 'test',
    concurrency: 3,
    durationMs: 60000,
    timeoutMs: 5000,
    cacheBust: false,
    requests: 5,
    minGapMs: 0,
    vary: parseVary('windowMonths=1-2'),
    abortOn429: true,
  })

  server.close()

  assert.ok(result.count >= 3, 'esperaba al menos 3 respuestas')
  assert.equal(result.errors, 0)
  assert.equal(result.statusCodes[200], result.count)

  // requests es un tope global: con 3 workers no puede emissions de mas.
  assert.equal(bounded.count, 5, 'debe emitir exactamente `requests` peticiones')
  assert.equal(bounded.errors, 0)
  assert.equal(bounded.vary, 'windowMonths=1-2')

  console.log('[perf:stress] selftest OK')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.selftest) {
    await selftest()
    return
  }

  const baseUrl = String(args['base-url'] || process.env.BASE_URL || DEFAULT_BASE_URL)
    .replace(/\/+$/, '')
  const concurrency = Number(args.concurrency || process.env.CONCURRENCY || 1)
  const durationMs = Number(args.duration || 30) * 1000
  const timeoutMs = Number(args.timeout || 200000)
  const cacheBust = Boolean(args['cache-bust'])
  const requests = Number(args.requests || 0)
  const minGapMs = Number(args['min-gap-ms'] || 0)
  const vary = parseVary(args.vary)
  const abortOn429 = !args['no-abort-on-429']
  const paths = args.paths
    ? String(args.paths).split(',').map((item) => item.trim()).filter(Boolean)
    : DEFAULT_PATHS

  const host = new URL(baseUrl).hostname

  if (!SAFE_HOSTS.has(host) && concurrency > 5) {
    console.warn(
      `[perf:stress] AVISO: ${concurrency} workers contra ${baseUrl} (host compartido). ` +
        'Los endpoints lentos retienen conexion hasta 3 min; otros usuarios pueden ver 500.'
    )
  }

  let token = args.token || process.env.PORTAL_TOKEN || ''

  if (!token && args['token-file']) {
    token = fs.readFileSync(String(args['token-file']), 'utf8').trim()
  }

  if (!token) {
    const email = args.email || process.env.EMAIL
    const password = args.password || process.env.PASSWORD

    if (!email || !password) {
      throw new Error('Falta credencial: usa --token/--token-file o --email y --password.')
    }

    console.log(`[perf:stress] login en ${baseUrl}`)
    token = await login(baseUrl, email, password)
  }

  console.log(
    `[perf:stress] target=${baseUrl} workers=${concurrency} ` +
      `modo=${requests > 0 ? `${requests} req/ruta` : `${durationMs / 1000}s`} ` +
      `timeout=${timeoutMs}ms cacheBust=${cacheBust} ` +
      `vary=${vary ? `${vary.name}=${vary.from}-${vary.to}` : 'no'} endpoints=${paths.length}`
  )

  const results = []

  for (const path of paths) {
    console.log(`[perf:stress] midiendo ${path} ...`)

    try {
      results.push(
        await runPath({
          baseUrl,
          path,
          token,
          concurrency,
          durationMs,
          timeoutMs,
          cacheBust,
          requests,
          minGapMs,
          vary,
          abortOn429,
        })
      )
    } catch (error) {
      if (!(error instanceof RateLimitError)) throw error

      console.error(`[perf:stress] ABORTADO: ${error.message}`)
      console.error(
        '[perf:stress] Espera a que expire la ventana de 15 min o reduce --requests.'
      )
      process.exitCode = 1
      return
    }
  }

  console.log('')
  printTable(results)

  if (args.json) {
    const payload = {
      baseUrl,
      concurrency,
      cacheBust,
      durationMs,
      timeoutMs,
      requests,
      minGapMs,
      vary: vary ? `${vary.name}=${vary.from}-${vary.to}` : null,
      startedAt: new Date().toISOString(),
      results,
    }

    fs.writeFileSync(String(args.json), `${JSON.stringify(payload, null, 2)}\n`)
    console.log(`\n[perf:stress] JSON escrito en ${args.json}`)
  }

  const failed = results.filter((item) => item.errors > 0)

  if (failed.length > 0) {
    console.log(
      `\n[perf:stress] endpoints con errores: ${failed.map((item) => item.path).join(', ')}`
    )
  }
}

main().catch((error) => {
  console.error('[perf:stress] fallo:', error.message)
  process.exitCode = 1
})



