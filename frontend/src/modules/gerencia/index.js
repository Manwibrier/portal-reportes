export { default as Gerencia } from './Gerencia'
export { getGerenciaDashboard } from './services'

export {
  GerenciaDistributionChart,
  GerenciaExecutiveBoard,
  GerenciaExecutiveMetric,
  GerenciaFiltroBar,
  GerenciaKpiSection,
  GerenciaMonthlyChart,
  GerenciaSegmentTabs,
} from './components'

export {
  buildGerenciaKpiItems,
  createEmptyAppliedFilters,
  createEmptyCharts,
  createEmptyDashboard,
  createEmptyFilters,
  createEmptyKpis,
  DEFAULT_SEGMENTS,
  GERENCIA_CHART_META,
  GERENCIA_KPI_META,
  GERENCIA_SECTION_META,
  getUniverseTotal,
  normalizeAppliedFilters,
  normalizeCharts,
  normalizeFilters,
  normalizeGerenciaDashboard,
  normalizeKpis,
} from './constants'