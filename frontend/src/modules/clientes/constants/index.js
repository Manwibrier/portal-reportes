export {
  CLIENTES_REGIONES_META,
  CLIENTES_REGION_LOOKUP,
  getClientesRegionKeys,
  getClientesRegionMeta,
} from './clientes-regiones-meta'

export {
  buildClientesRegionalRows,
  createEmptyAppliedFilters,
  createEmptyBucket,
  createEmptyDashboard,
  createEmptyFilters,
  createEmptyFranchiseSummary,
  createEmptyProductSummary,
  createEmptyRegionSummary,
  createEmptyRegionsSummary,
  createEmptyStatusSummary,
  getTotalClientes,
  normalizeAppliedFilters,
  normalizeBucket,
  normalizeClientesDashboard,
  normalizeFilters,
  normalizeFranchiseSummary,
  normalizeProductSummary,
  normalizeRegionSummary,
  normalizeRegionsSummary,
  normalizeStatusSummary,
} from './clientes.contract'

export {
  CLIENTES_CHART_META,
  CLIENTES_DEFAULT_KPI_ORDER,
  CLIENTES_SECTION_META,
  CLIENTES_KPI_META,
  buildClientesDonutItems,
  buildClientesKpiItems,
} from './clientes.kpi-meta'

export {
  CLIENTES_CIERRE_MENSUAL_DEFAULT_KPI_ORDER,
  CLIENTES_CIERRE_MENSUAL_KPI_META,
  CLIENTES_CIERRE_MENSUAL_SECTION_META,
  buildClientesCierreMensualKpiItems,
} from './clientes-cierre-mensual.kpi-meta'

export {
  createEmptyCierreMensualDashboard,
  normalizeClientesCierreMensualDashboard,
} from './clientes-cierre-mensual.contract'

export { CLIENTES_MONTH_OPTIONS } from './clientes-meses'
