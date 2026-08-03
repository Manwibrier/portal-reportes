// src/modules/clientes/constants/clientes.contract.js

import {
  CLIENTES_REGIONES_META,
  getClientesRegionKeys,
} from './clientes-regiones-meta'

const EMPTY_BUCKET = Object.freeze({
  activos: 0,
  exonerados: 0,
  porInstalar: 0,
  suspendidos: 0,
  cortados: 0,
  total: 0,
})

const EMPTY_STATUS_SUMMARY = Object.freeze({
  activos: 0,
  exonerados: 0,
  porInstalar: 0,
  suspendidos: 0,
  cortados: 0,
  total: 0,
})

const EMPTY_PRODUCT_SUMMARY = Object.freeze({
  internet: 0,
  internetTv: 0,
  total: 0,
})

const EMPTY_AVAILABLE_FILTERS = Object.freeze({
  zonas: [],
  franquicias: [],
})

const EMPTY_APPLIED_FILTERS = Object.freeze({
  zona: '',
  franquicia: '',
})

function toSafeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalizedValue = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
    .trim()

  if (!normalizedValue) return fallback

  const numericValue = Number(normalizedValue)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function toSafeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringArray(value) {
  return toSafeArray(value)
    .map((item) => toSafeText(item))
    .filter(Boolean)
}

function getFirstAvailableField(source = {}, fields = []) {
  const safeSource = toSafeObject(source)

  for (const field of fields) {
    const value = safeSource[field]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function getFirstNumber(source = {}, fields = [], fallback = 0) {
  const value = getFirstAvailableField(source, fields)

  return toSafeNumber(value, fallback)
}

function resolveTotal(source = {}, fields = [], fallback = 0) {
  const explicitTotal = getFirstAvailableField(source, fields)

  if (explicitTotal !== undefined) {
    return toSafeNumber(explicitTotal, fallback)
  }

  return fallback
}

function buildRegionSummaryBase(region = {}) {
  return {
    key: toSafeText(region?.key),
    title: toSafeText(region?.title),
    description: toSafeText(region?.description),
    internet: createEmptyBucket(),
    television: createEmptyBucket(),
    franquicias: [],
  }
}

export function createEmptyBucket() {
  return {
    ...EMPTY_BUCKET,
  }
}

export function createEmptyStatusSummary() {
  return {
    ...EMPTY_STATUS_SUMMARY,
  }
}

export function createEmptyProductSummary() {
  return {
    ...EMPTY_PRODUCT_SUMMARY,
  }
}

export function createEmptyFilters() {
  return {
    zonas: [...EMPTY_AVAILABLE_FILTERS.zonas],
    franquicias: [...EMPTY_AVAILABLE_FILTERS.franquicias],
  }
}

export function createEmptyAppliedFilters() {
  return {
    ...EMPTY_APPLIED_FILTERS,
  }
}

export function createEmptyFranchiseSummary() {
  return {
    id: '',
    nombre: '',
    internet: createEmptyBucket(),
    television: createEmptyBucket(),
  }
}

export function createEmptyRegionSummary(region = {}) {
  const regionBase = buildRegionSummaryBase(region)

  return {
    ...regionBase,
    franquicias: [],
  }
}

export function createEmptyRegionsSummary() {
  return CLIENTES_REGIONES_META.reduce((accumulator, region) => {
    accumulator[region.key] = createEmptyRegionSummary(region)
    return accumulator
  }, {})
}

export function createEmptyDashboard() {
  return {
    internet: createEmptyBucket(),
    television: createEmptyBucket(),
    segmentacionEstatus: createEmptyStatusSummary(),
    segmentacionProducto: createEmptyProductSummary(),
    filtrosDisponibles: createEmptyFilters(),
    filtrosAplicados: createEmptyAppliedFilters(),
    regiones: createEmptyRegionsSummary(),
  }
}

export function normalizeBucket(bucket = {}) {
  const safeBucket = toSafeObject(bucket)

  const activos = getFirstNumber(safeBucket, [
    'activos',
    'activo',
    'clientesActivos',
    'totalActivos',
    'totalClientesActivos',
    'clientes_activos',
    'total_activos',
  ])

  const exonerados = getFirstNumber(safeBucket, [
    'exonerados',
    'exonerado',
    'clientesExonerados',
    'totalExonerados',
    'totalClientesExonerados',
    'clientes_exonerados',
    'total_exonerados',
  ])

  const porInstalar = getFirstNumber(safeBucket, [
    'porInstalar',
    'por_instalar',
    'clientesPorInstalar',
    'totalPorInstalar',
    'totalClientesPorInstalar',
  ])

  const suspendidos = getFirstNumber(safeBucket, [
    'suspendidos',
    'suspendido',
    'clientesSuspendidos',
    'totalSuspendidos',
    'totalClientesSuspendidos',
    'clientes_suspendidos',
    'total_suspendidos',
  ])

  const cortados = getFirstNumber(safeBucket, [
    'cortados',
    'cortado',
    'clientesCortados',
    'totalCortados',
    'totalClientesCortados',
    'clientes_cortados',
    'total_cortados',
  ])

  const calculatedTotal =
    activos + exonerados + porInstalar + suspendidos + cortados

  return {
    activos,
    exonerados,
    porInstalar,
    suspendidos,
    cortados,
    total: resolveTotal(
      safeBucket,
      [
        'total',
        'totalClientes',
        'clientesTotal',
        'total_clientes',
        'universo',
      ],
      calculatedTotal,
    ),
  }
}

export function normalizeStatusSummary(summary = {}) {
  const safeSummary = toSafeObject(summary)

  const activos = getFirstNumber(safeSummary, [
    'activos',
    'activo',
    'clientesActivos',
    'totalActivos',
    'totalClientesActivos',
  ])

  const exonerados = getFirstNumber(safeSummary, [
    'exonerados',
    'exonerado',
    'clientesExonerados',
    'totalExonerados',
    'totalClientesExonerados',
  ])

  const porInstalar = getFirstNumber(safeSummary, [
    'porInstalar',
    'por_instalar',
    'clientesPorInstalar',
    'totalPorInstalar',
    'totalClientesPorInstalar',
  ])

  const suspendidos = getFirstNumber(safeSummary, [
    'suspendidos',
    'suspendido',
    'clientesSuspendidos',
    'totalSuspendidos',
    'totalClientesSuspendidos',
  ])

  const cortados = getFirstNumber(safeSummary, [
    'cortados',
    'cortado',
    'clientesCortados',
    'totalCortados',
    'totalClientesCortados',
  ])

  const calculatedTotal =
    activos + exonerados + porInstalar + suspendidos + cortados

  return {
    activos,
    exonerados,
    porInstalar,
    suspendidos,
    cortados,
    total: resolveTotal(
      safeSummary,
      [
        'total',
        'totalClientes',
        'clientesTotal',
        'total_clientes',
      ],
      calculatedTotal,
    ),
  }
}

export function normalizeProductSummary(summary = {}) {
  const safeSummary = toSafeObject(summary)

  const internet = getFirstNumber(safeSummary, [
    'internet',
    'clientesInternet',
    'totalInternet',
    'clientes_internet',
  ])

  const internetTv = getFirstNumber(safeSummary, [
    'internetTv',
    'internetTV',
    'internet_tv',
    'clientesInternetTv',
    'clientesInternetTV',
    'totalInternetTv',
    'totalInternetTV',
  ])

  return {
    internet,
    internetTv,
    total: resolveTotal(
      safeSummary,
      [
        'total',
        'totalClientes',
        'clientesTotal',
        'total_clientes',
      ],
      internet + internetTv,
    ),
  }
}

export function normalizeFilters(filters = {}) {
  const safeFilters = toSafeObject(filters)

  return {
    zonas: normalizeStringArray(safeFilters.zonas),
    franquicias: normalizeStringArray(safeFilters.franquicias),
  }
}

export function normalizeAppliedFilters(filters = {}) {
  const safeFilters = toSafeObject(filters)

  return {
    zona: toSafeText(safeFilters.zona),
    franquicia: toSafeText(safeFilters.franquicia),
  }
}

export function normalizeFranchiseSummary(franchise = {}) {
  const safeFranchise = toSafeObject(franchise)
  const fallback = createEmptyFranchiseSummary()

  return {
    ...fallback,
    id:
      toSafeText(safeFranchise.id) ||
      toSafeText(safeFranchise.key) ||
      toSafeText(safeFranchise.codigo) ||
      toSafeText(safeFranchise.nombre) ||
      fallback.id,
    nombre:
      toSafeText(safeFranchise.nombre) ||
      toSafeText(safeFranchise.name) ||
      toSafeText(safeFranchise.franquicia) ||
      fallback.nombre,
    internet: normalizeBucket(safeFranchise.internet),
    television: normalizeBucket(safeFranchise.television),
  }
}

export function normalizeRegionSummary(region = {}, defaults = {}) {
  const safeRegion = toSafeObject(region)
  const fallback = createEmptyRegionSummary(defaults)

  return {
    ...fallback,
    key: toSafeText(safeRegion.key) || fallback.key,
    title:
      toSafeText(safeRegion.title) ||
      toSafeText(safeRegion.nombre) ||
      fallback.title,
    description:
      toSafeText(safeRegion.description) ||
      toSafeText(safeRegion.descripcion) ||
      fallback.description,
    internet: normalizeBucket(safeRegion.internet),
    television: normalizeBucket(safeRegion.television),
    franquicias: toSafeArray(safeRegion.franquicias).map((item) =>
      normalizeFranchiseSummary(item),
    ),
  }
}

export function normalizeRegionsSummary(regions = {}) {
  const sourceRegions = toSafeObject(regions)
  const normalizedRegions = createEmptyRegionsSummary()

  CLIENTES_REGIONES_META.forEach((region) => {
    normalizedRegions[region.key] = normalizeRegionSummary(
      sourceRegions[region.key],
      region,
    )
  })

  Object.entries(sourceRegions).forEach(([key, value]) => {
    const normalizedKey = toSafeText(key).toLowerCase()

    if (!normalizedKey || normalizedRegions[normalizedKey]) return

    normalizedRegions[normalizedKey] = normalizeRegionSummary(value, {
      key: normalizedKey,
      title:
        toSafeText(value?.title) ||
        toSafeText(value?.nombre) ||
        normalizedKey,
      description:
        toSafeText(value?.description) ||
        toSafeText(value?.descripcion),
    })
  })

  return normalizedRegions
}

export function normalizeClientesDashboard(payload = {}) {
  const safePayload = toSafeObject(payload)

  return {
    internet: normalizeBucket(safePayload.internet),
    television: normalizeBucket(safePayload.television),
    segmentacionEstatus: normalizeStatusSummary(
      safePayload.segmentacionEstatus,
    ),
    segmentacionProducto: normalizeProductSummary(
      safePayload.segmentacionProducto,
    ),
    filtrosDisponibles: normalizeFilters(safePayload.filtrosDisponibles),
    filtrosAplicados: normalizeAppliedFilters(safePayload.filtrosAplicados),
    regiones: normalizeRegionsSummary(safePayload.regiones),
  }
}

export function buildClientesRegionalRows(dashboard = {}) {
  const regions = normalizeRegionsSummary(dashboard?.regiones)

  return getClientesRegionKeys().map((regionKey) => ({
    key: regionKey,
    ...regions[regionKey],
  }))
}

export function getTotalClientes(dashboard = {}) {
  const internetTotal = toSafeNumber(dashboard?.internet?.total)
  const televisionTotal = toSafeNumber(dashboard?.television?.total)

  return internetTotal + televisionTotal
}