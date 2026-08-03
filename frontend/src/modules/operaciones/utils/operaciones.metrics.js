// src/modules/operaciones/utils/operaciones.metrics.js

import OPERACIONES_CHART_META from '../constants/operaciones.chart-meta.js'
import OPERACIONES_KPI_META from '../constants/operaciones.kpi-meta.js'
import {
  formatDecimal,
  formatNumber,
  normalizeNumber,
  normalizeText,
} from './operaciones.helpers.js'

const DEFAULT_KPI_META = {
  title: 'Indicador',
  description: '',
  format: 'number',
  decimals: 0,
  prefix: '',
  suffix: '',
  locale: 'es-VE',
}

const DEFAULT_CHART_META = {
  title: 'Gráfico',
  type: 'bar',
  xKey: 'name',
  yKey: 'value',
  valueKey: 'value',
  labelKey: 'name',
  colorToken: 'primary',
  height: 320,
}

export function resolveKpiMeta(key, overrides = {}) {
  const normalizedKey = normalizeText(key)
  const meta = normalizedKey
    ? OPERACIONES_KPI_META?.[normalizedKey]
    : null

  return {
    key: normalizedKey,
    ...DEFAULT_KPI_META,
    ...(meta || {}),
    ...(overrides || {}),
  }
}

export function findKpiMeta(key, overrides = {}) {
  return resolveKpiMeta(key, overrides)
}

export function resolveChartMeta(key, overrides = {}) {
  const normalizedKey = normalizeText(key)
  const meta = normalizedKey
    ? OPERACIONES_CHART_META?.[normalizedKey]
    : null

  return {
    key: normalizedKey,
    ...DEFAULT_CHART_META,
    ...(meta || {}),
    ...(overrides || {}),
  }
}

export function formatKpiValue(value, meta = {}) {
  const resolvedMeta = {
    ...DEFAULT_KPI_META,
    ...(meta || {}),
  }

  const numericValue = normalizeNumber(value, 0)
  const decimals = normalizeNumber(resolvedMeta.decimals, 0)
  const prefix = normalizeText(resolvedMeta.prefix)
  const suffix = normalizeText(resolvedMeta.suffix)
  const locale = normalizeText(resolvedMeta.locale, 'es-VE')

  if (resolvedMeta.format === 'text') {
    return normalizeText(value, resolvedMeta.emptyValue ?? '')
  }

  if (resolvedMeta.format === 'percent') {
    const formattedValue = formatDecimal(numericValue, decimals, { locale })
    const resolvedSuffix = suffix || '%'

    return `${prefix}${formattedValue}${resolvedSuffix}`
  }

  if (resolvedMeta.format === 'currency') {
    const formattedValue = formatDecimal(numericValue, decimals, { locale })

    return `${prefix}${formattedValue}${suffix}`
  }

  return `${prefix}${formatNumber(numericValue, {
    locale,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`
}