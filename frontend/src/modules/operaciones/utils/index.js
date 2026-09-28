// src/modules/operaciones/utils/index.js

export {
  buildSmartOltKey,
  calculatePercentage,
  classifySignalBand,
  cloneValue,
  ensureArray,
  ensureObject,
  formatDateTime,
  formatDecimal,
  formatNumber,
  getField,
  normalizeCompare,
  normalizeInteger,
  normalizeNumber,
  normalizeSignalBand,
  normalizeStatus,
  normalizeText,
  round,
  unwrapRows,
} from './operaciones.helpers.js'

export {
  resolveChartMeta,
  resolveKpiMeta,
} from './operaciones.metrics.js'

export {
  buildDashboard,
  buildOrderStatusDistribution,
  buildStatusDistribution,
  transformOrdenesServicio,
  transformSmartOlt,
} from './operaciones.transformers.js'