// src/modules/clientes/components/ClientesFiltroBar.jsx

import { RotateCcw } from 'lucide-react'

const DEFAULT_FILTER_VALUES = new Set([
  '',
  'ALL',
  'TODOS',
  'TODAS',
  'TOTAL',
  'SELECCION',
  'SELECCIÓN',
])

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeCompare(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

function isDefaultFilterValue(value = '') {
  return DEFAULT_FILTER_VALUES.has(normalizeCompare(value))
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return []

  const deduped = []
  const seen = new Set()

  items.forEach((item) => {
    const value =
      typeof item === 'string' || typeof item === 'number'
        ? normalizeText(item)
        : normalizeText(
            item?.value ??
              item?.label ??
              item?.name ??
              item?.id ??
              item?.key,
          )

    if (!value || isDefaultFilterValue(value)) return

    const key = normalizeCompare(value)

    if (!key || seen.has(key)) return

    seen.add(key)
    deduped.push(value)
  })

  return deduped.sort((left, right) =>
    left.localeCompare(right, 'es', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function formatNumber(value) {
  const numericValue = Number(value)

  return new Intl.NumberFormat('es-VE').format(
    Number.isFinite(numericValue) ? numericValue : 0,
  )
}

function optionExists(value = '', options = []) {
  const normalizedValue = normalizeCompare(value)

  if (!normalizedValue) return false

  return options.some((option) => normalizeCompare(option) === normalizedValue)
}

function isActiveSelectValue(value = '', options = []) {
  if (isDefaultFilterValue(value)) return false

  return optionExists(value, options)
}

function getResolvedSelectValue(value = '', options = []) {
  return isActiveSelectValue(value, options) ? value : ''
}

function getSelectClassName(isActive = false) {
  return [
    'tickets-filter-select__input',
    isActive ? 'tickets-filter-select__input--active' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function SelectFilter({
  id,
  label,
  value = '',
  options = [],
  allLabel = 'TODAS',
  disabledLabel = 'SIN OPCIONES DISPONIBLES',
  onChange,
}) {
  const hasOptions = options.length > 0
  const isActive = isActiveSelectValue(value, options)
  const resolvedValue = getResolvedSelectValue(value, options)

  return (
    <div className="tickets-filter-panel tickets-filter-panel--select">
      <label htmlFor={id} className="tickets-filter-panel__title">
        {label}
      </label>

      <div className="tickets-filter-select__control">
        <select
          id={id}
          className={getSelectClassName(isActive)}
          value={resolvedValue}
          disabled={!hasOptions}
          onChange={(event) => onChange?.(event.target.value)}
        >
          <option value="">
            {hasOptions ? allLabel : disabledLabel}
          </option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ClientesFiltroBar({
  zonas = [],
  franquicias = [],
  zonaActiva = '',
  franquiciaActiva = '',
  onZonaChange,
  onFranquiciaChange,
  onReset,
  totalClientes = 0,
}) {
  const normalizedZonas = normalizeItems(zonas)
  const normalizedFranquicias = normalizeItems(franquicias)

  const zonaIsActive = isActiveSelectValue(zonaActiva, normalizedZonas)
  const franquiciaIsActive = isActiveSelectValue(
    franquiciaActiva,
    normalizedFranquicias,
  )

  const hasActiveFilters = Boolean(zonaIsActive || franquiciaIsActive)

  function handleZonaChange(value) {
    onZonaChange?.(value)
  }

  function handleFranquiciaChange(value) {
    onFranquiciaChange?.(value)
  }

  function handleReset() {
    if (!hasActiveFilters) return

    if (typeof onReset === 'function') {
      onReset()
      return
    }

    onZonaChange?.('')
    onFranquiciaChange?.('')
  }

  return (
    <section className="tickets-filter-card portal-card clientes-filter-bar">
      <header className="tickets-filter-card__header portal-card__header">
        <div className="portal-card__heading">
          <h3 className="tickets-filter-card__title portal-card__title">
            Filtros de Segmentación
          </h3>

          <p className="portal-card__subtitle">
            Segmenta por zona y franquicia.
          </p>
        </div>
      </header>

      <div className="tickets-filter-card__body portal-card__body">
        <div className="portal-filter-grid">
          <article className="tickets-filter-panel tickets-filter-panel--summary">
            <span className="tickets-filter-panel__title">
              Universo de clientes
            </span>

            <strong className="tickets-filter-panel__value">
              {formatNumber(totalClientes)}
            </strong>
          </article>

          <SelectFilter
            id="clientes-zona-select"
            label="Región / Zona"
            value={zonaActiva}
            options={normalizedZonas}
            allLabel="TODAS LAS ZONAS"
            disabledLabel="SIN ZONAS DISPONIBLES"
            onChange={handleZonaChange}
          />

          <SelectFilter
            id="clientes-franquicia-select"
            label="Franquicia"
            value={franquiciaActiva}
            options={normalizedFranquicias}
            allLabel="TODAS LAS FRANQUICIAS"
            disabledLabel="SIN FRANQUICIAS DISPONIBLES"
            onChange={handleFranquiciaChange}
          />

          <div className="portal-filter-actions">
            <button
              type="button"
              className="portal-filter-action portal-filter-action--primary portal-filter-action--compact"
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

export default ClientesFiltroBar