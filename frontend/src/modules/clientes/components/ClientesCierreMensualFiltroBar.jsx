// src/modules/clientes/components/ClientesCierreMensualFiltroBar.jsx

import { RotateCcw } from 'lucide-react'
import { CLIENTES_MONTH_OPTIONS } from '../constants'

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return []

  const deduped = []
  const seen = new Set()

  items.forEach((item) => {
    const value =
      typeof item === 'string' || typeof item === 'number'
        ? String(item).trim()
        : String(item?.value ?? item?.label ?? item?.name ?? '').trim()

    if (!value || seen.has(value)) return

    seen.add(value)
    deduped.push(value)
  })

  return deduped
}

function normalizeNumberItems(items = []) {
  if (!Array.isArray(items)) return []

  const deduped = []
  const seen = new Set()

  items.forEach((item) => {
    const numericValue = Number(item)

    if (!Number.isInteger(numericValue) || numericValue <= 0) return
    if (seen.has(numericValue)) return

    seen.add(numericValue)
    deduped.push(numericValue)
  })

  return deduped
}

function formatNumber(value) {
  const numericValue = Number(value)

  return new Intl.NumberFormat('es-VE').format(
    Number.isFinite(numericValue) ? numericValue : 0,
  )
}

function buildMonthOptions(meses = []) {
  const availableMonths = normalizeNumberItems(meses)
  const monthCatalog = Array.isArray(CLIENTES_MONTH_OPTIONS)
    ? CLIENTES_MONTH_OPTIONS
    : []

  if (availableMonths.length === 0) {
    return monthCatalog
  }

  return monthCatalog.filter((month) => availableMonths.includes(month.value))
}

function isActiveTextFilter(value) {
  return normalizeText(value) !== ''
}

function isActiveMonthFilter(value, options = []) {
  const numericValue = Number(value)

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return false
  }

  return options.some((option) => Number(option?.value) === numericValue)
}

function isActiveYearFilter(value, years = []) {
  const numericValue = Number(value)

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return false
  }

  return years.includes(numericValue)
}

function getSelectClassName(isActive = false) {
  return [
    'tickets-filter-select__input',
    isActive ? 'tickets-filter-select__input--active' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function ClientesCierreMensualFiltroBar({
  zonas = [],
  franquicias = [],
  meses = [],
  anios = [],
  zonaActiva = '',
  franquiciaActiva = '',
  mesActivo = '',
  anioActivo = '',
  onZonaChange,
  onFranquiciaChange,
  onMesChange,
  onAnioChange,
  onReset,
  totalClientes = 0,
}) {
  const normalizedZonas = normalizeItems(zonas)
  const normalizedFranquicias = normalizeItems(franquicias)
  const normalizedYears = normalizeNumberItems(anios).sort(
    (left, right) => right - left,
  )
  const monthOptions = buildMonthOptions(meses)

  const hasZonas = normalizedZonas.length > 0
  const hasFranquicias = normalizedFranquicias.length > 0
  const hasMonths = monthOptions.length > 0
  const hasYears = normalizedYears.length > 0

  const zonaIsActive = isActiveTextFilter(zonaActiva)
  const franquiciaIsActive = isActiveTextFilter(franquiciaActiva)
  const mesIsActive = isActiveMonthFilter(mesActivo, monthOptions)
  const anioIsActive = isActiveYearFilter(anioActivo, normalizedYears)

  const hasActiveFilters = Boolean(
    zonaIsActive || franquiciaIsActive || mesIsActive || anioIsActive,
  )

  function handleZonaChange(event) {
    onZonaChange?.(event.target.value)
  }

  function handleFranquiciaChange(event) {
    onFranquiciaChange?.(event.target.value)
  }

  function handleMesChange(event) {
    onMesChange?.(event.target.value)
  }

  function handleAnioChange(event) {
    onAnioChange?.(event.target.value)
  }

  function handleReset() {
    if (typeof onReset === 'function') {
      onReset()
      return
    }

    onZonaChange?.('')
    onFranquiciaChange?.('')
    onMesChange?.('')
    onAnioChange?.('')
  }

  return (
    <section className="portal-card clientes-cierre-mensual-filtro-bar clientes-cierre-filter-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">Filtros de Cierre Mensual</h3>
          <p className="portal-card__subtitle">
            Segmenta por zona, franquicia, mes y año.
          </p>
        </div>
      </header>

      <div className="portal-card__body">
        <div className="clientes-cierre-filter-grid">
          <div className="tickets-filter-panel tickets-filter-panel--summary clientes-cierre-filter-panel clientes-cierre-filter-panel--total">
            <span className="tickets-filter-panel__title">
              Base total de clientes
            </span>

            <strong className="tickets-filter-panel__value clientes-cierre-filter-total">
              {formatNumber(totalClientes)}
            </strong>
          </div>

          <div className="tickets-filter-panel tickets-filter-panel--select clientes-cierre-filter-panel clientes-cierre-filter-panel--zona">
            <label
              htmlFor="clientes-cierre-zona-select"
              className="tickets-filter-panel__title"
            >
              Región / Zona
            </label>

            <div className="tickets-filter-select__control">
              <select
                id="clientes-cierre-zona-select"
                className={getSelectClassName(zonaIsActive)}
                value={zonaActiva}
                onChange={handleZonaChange}
                disabled={!hasZonas}
              >
                <option value="">
                  {hasZonas ? 'TODAS LAS ZONAS' : 'SIN ZONAS DISPONIBLES'}
                </option>

                {normalizedZonas.map((zona) => (
                  <option key={zona} value={zona}>
                    {zona}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tickets-filter-panel tickets-filter-panel--select clientes-cierre-filter-panel clientes-cierre-filter-panel--franquicia">
            <label
              htmlFor="clientes-cierre-franquicia-select"
              className="tickets-filter-panel__title"
            >
              Franquicia
            </label>

            <div className="tickets-filter-select__control">
              <select
                id="clientes-cierre-franquicia-select"
                className={getSelectClassName(franquiciaIsActive)}
                value={franquiciaActiva}
                onChange={handleFranquiciaChange}
                disabled={!hasFranquicias}
              >
                <option value="">
                  {hasFranquicias
                    ? 'TODAS LAS FRANQUICIAS'
                    : 'SIN FRANQUICIAS DISPONIBLES'}
                </option>

                {normalizedFranquicias.map((franquicia) => (
                  <option key={franquicia} value={franquicia}>
                    {franquicia}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tickets-filter-panel tickets-filter-panel--select clientes-cierre-filter-panel clientes-cierre-filter-panel--mes">
            <label
              htmlFor="clientes-cierre-mes-select"
              className="tickets-filter-panel__title"
            >
              Mes
            </label>

            <div className="tickets-filter-select__control">
              <select
                id="clientes-cierre-mes-select"
                className={getSelectClassName(mesIsActive)}
                value={mesIsActive ? mesActivo : ''}
                onChange={handleMesChange}
                disabled={!hasMonths}
              >
                <option value="">
                  {hasMonths ? 'SELECCIÓN' : 'SIN MESES'}
                </option>

                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tickets-filter-panel tickets-filter-panel--select clientes-cierre-filter-panel clientes-cierre-filter-panel--anio">
            <label
              htmlFor="clientes-cierre-anio-select"
              className="tickets-filter-panel__title"
            >
              Año
            </label>

            <div className="tickets-filter-select__control">
              <select
                id="clientes-cierre-anio-select"
                className={getSelectClassName(anioIsActive)}
                value={anioIsActive ? anioActivo : ''}
                onChange={handleAnioChange}
                disabled={!hasYears}
              >
                <option value="">
                  {hasYears ? 'SELECCIÓN' : 'SIN AÑOS'}
                </option>

                {normalizedYears.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="portal-filter-actions clientes-cierre-filter-actions">
            <button
              type="button"
              className="portal-filter-action portal-filter-action--primary portal-filter-action--compact clientes-cierre-filter-reset"
              onClick={handleReset}
              disabled={!hasActiveFilters}
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ClientesCierreMensualFiltroBar