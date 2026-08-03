// src/modules/operaciones/index.js

export { default as Operaciones } from './Operaciones.jsx'

export {
  OperacionesDashboard,
  OperacionesOrdenesServicio,
  OperacionesSmartOLT,
} from './pages/index.js'

export {
  OperacionesCapacityChart,
  OperacionesFilterBar,
  OperacionesKpiMosaic,
  OperacionesOrdersTable,
  OperacionesStatusDonut,
  OperacionesStatusSegment,
  OperacionesTechnicalTable,
} from './components/index.js'

export {
  createEmptyDashboard,
  normalizeOperacionesDashboard,
  OPERACIONES_CHART_META,
  OPERACIONES_KPI_META,
} from './constants/index.js'

export {
  getOperacionesDashboard,
  getOperacionesOrdenesServicio,
  getOperacionesSmartOLT,
} from './services/index.js'