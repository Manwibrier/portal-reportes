// src/modules/operaciones/components/OperacionesFilterBar.jsx

import { RotateCcw } from 'lucide-react'
import { ensureArray, formatNumber, normalizeText } from '../utils'

const DEFAULT_FILTER_VALUES = new Set([
  '',
  'ALL',
  'TODOS',
  'TODAS',
  'TOTAL',
  'SELECCION',
  'SELECCIÓN',
])

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

function normalizeOption(item = '') {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const value = normalizeText(
      item.value ??
        item.id ??
        item.key ??
        item.oltId ??
        item.oltLabel ??
        item.oltName ??
        item.label,
    )

    const label = normalizeText(
      item.label ??
        item.name ??
        item.oltLabel ??
        item.oltName ??
        item.value,
      value,
    )

    const count = item.count ?? item.total ?? item.totalOnus ?? item.valueCount

    return value
      ? {
          value,
          label,
          count,
        }
      : null
  }

  const value = normalizeText(item)

  return value
    ? {
        value,
        label: value,
        count: undefined,
      }
    : null
}

function normalizeOptions(items = []) {
  const seen = new Set()
  const options = []

  ensureArray(items).forEach((item) => {
    const option = normalizeOption(item)

    if (!option) return
    if (isDefaultFilterValue(option.value)) return

    const key = normalizeCompare(option.value)

    if (!key || seen.has(key)) return

    seen.add(key)
    options.push(option)
  })

  return options.sort((left, right) =>
    left.label.localeCompare(right.label, 'es', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function renderOptionLabel(option) {
  if (option.count === undefined || option.count === null) {
    return option.label
  }

  return `${option.label} (${formatNumber(option.count)})`
}

function optionExists(value = '', options = []) {
  const normalizedValue = normalizeCompare(value)

  if (!normalizedValue) return false

  return options.some((option) => normalizeCompare(option.value) === normalizedValue)
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
  allLabel = 'TODOS',
  disabledLabel = 'SIN OPCIONES DISPONIBLES',
  onChange,
}) {
  const normalizedOptions = normalizeOptions(options)
  const hasOptions = normalizedOptions.length > 0
  const isActive = isActiveSelectValue(value, normalizedOptions)
  const resolvedValue = getResolvedSelectValue(value, normalizedOptions)

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

          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {renderOptionLabel(option)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function hasActiveValue(value = '', options = []) {
  return isActiveSelectValue(value, normalizeOptions(options))
}

function OperacionesFilterBar({
  olts = [],
  statuses = [],
  statusSegments = [],
  signalBands = [],
  zonas = [],
  franquicias = [],
  servicios = [],

  selectedOlt = '',
  selectedStatus = '',
  activeStatus = '',
  selectedSignalBand = '',
  selectedZona = '',
  selectedFranquicia = '',
  selectedServicio = '',

  totalRegistros = 0,
  totalOlts = 0,

  onOltChange,
  onStatusChange,
  onSignalBandChange,
  onZonaChange,
  onFranquiciaChange,
  onServicioChange,
  onReset,

  title = 'Filtros de Operaciones',
  subtitle = 'Segmenta la información operacional por fuente, estado y atributos disponibles.',
  summaryLabel = 'Registros visibles',

  showOltFilter = true,
  showStatusFilter = true,
  showSignalBandFilter = true,
  showTotalNetFilters = true,
  showSummary = true,
  compact = false,
}) {
  const resolvedStatus = selectedStatus || activeStatus
  const resolvedStatuses = ensureArray(statuses).length > 0
    ? statuses
    : statusSegments

  const hasActiveFilters = Boolean(
    hasActiveValue(selectedOlt, olts) ||
      hasActiveValue(resolvedStatus, resolvedStatuses) ||
      hasActiveValue(selectedSignalBand, signalBands) ||
      hasActiveValue(selectedZona, zonas) ||
      hasActiveValue(selectedFranquicia, franquicias) ||
      hasActiveValue(selectedServicio, servicios),
  )

  const resolvedTotal = Number(totalRegistros || totalOlts || 0)

  const rootClassName = [
    'tickets-filter-card',
    'portal-card',
    'operaciones-filter-card',
    compact ? 'operaciones-filter-card--compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function handleReset() {
    if (!hasActiveFilters) return
    onReset?.()
  }

  return (
    <section className={rootClassName}>
      {title || subtitle ? (
        <header className="tickets-filter-card__header portal-card__header">
          <div className="portal-card__heading">
            {title ? (
              <h3 className="tickets-filter-card__title portal-card__title">
                {title}
              </h3>
            ) : null}

            {subtitle ? (
              <p className="portal-card__subtitle">
                {subtitle}
              </p>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="tickets-filter-card__body portal-card__body">
        <div className="portal-filter-grid">
          {showSummary ? (
            <article className="tickets-filter-panel tickets-filter-panel--summary">
              <span className="tickets-filter-panel__title">
                {summaryLabel}
              </span>

              <strong className="tickets-filter-panel__value">
                {formatNumber(Number.isFinite(resolvedTotal) ? resolvedTotal : 0)}
              </strong>
            </article>
          ) : null}

          {showOltFilter ? (
            <SelectFilter
              id="operaciones-olt-select"
              label="OLT"
              value={selectedOlt}
              options={olts}
              allLabel="TODAS LAS OLT"
              disabledLabel="SIN OLT DISPONIBLES"
              onChange={onOltChange}
            />
          ) : null}

          {showStatusFilter ? (
            <SelectFilter
              id="operaciones-status-select"
              label="Status"
              value={resolvedStatus}
              options={resolvedStatuses}
              allLabel="TODOS LOS STATUS"
              disabledLabel="SIN STATUS DISPONIBLES"
              onChange={onStatusChange}
            />
          ) : null}

          {showSignalBandFilter ? (
            <SelectFilter
              id="operaciones-signal-band-select"
              label="Banda de señal"
              value={selectedSignalBand}
              options={signalBands}
              allLabel="TODAS LAS BANDAS"
              disabledLabel="SIN BANDAS DISPONIBLES"
              onChange={onSignalBandChange}
            />
          ) : null}

          {showTotalNetFilters ? (
            <>
              <SelectFilter
                id="operaciones-zona-select"
                label="Zona"
                value={selectedZona}
                options={zonas}
                allLabel="TODAS LAS ZONAS"
                disabledLabel="SIN ZONAS DISPONIBLES"
                onChange={onZonaChange}
              />

              <SelectFilter
                id="operaciones-franquicia-select"
                label="Franquicia"
                value={selectedFranquicia}
                options={franquicias}
                allLabel="TODAS LAS FRANQUICIAS"
                disabledLabel="SIN FRANQUICIAS DISPONIBLES"
                onChange={onFranquiciaChange}
              />

              <SelectFilter
                id="operaciones-servicio-select"
                label="Servicio"
                value={selectedServicio}
                options={servicios}
                allLabel="TODOS LOS SERVICIOS"
                disabledLabel="SIN SERVICIOS DISPONIBLES"
                onChange={onServicioChange}
              />
            </>
          ) : null}

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

export default OperacionesFilterBar