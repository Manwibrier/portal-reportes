// src/modules/operaciones/constants/operaciones.chart-meta.js

/**
* Metadatos de gráficos del módulo Operaciones.
* Se usa para renderizar charts en dashboard y SmartOLT.
*/
const OPERACIONES_CHART_META = {
clientesPorZona: {
title: 'Clientes por Zona',
type: 'bar',
xKey: 'zona',
yKey: 'totalClientesActivos',
colorToken: 'primary',
height: 320,
},
clientesPorFranquicia: {
title: 'Clientes por Franquicia',
type: 'bar',
xKey: 'franquicia',
yKey: 'totalClientesActivos',
colorToken: 'secondary',
height: 320,
},
instalacionPorServicio: {
title: 'Instalaciones por Servicio',
type: 'stackedBar',
xKey: 'servicio',
yKeys: ['totalInstalacionesFinalizadas', 'totalInstalacionesPendientes'],
colors: ['success', 'warning'],
height: 340,
},
clientesChurn: {
title: 'Churn Operacional',
type: 'donut',
valueKey: 'totalClientesCortados',
labelKey: 'zona',
height: 300,
},
ventasPorZona: {
title: 'Ventas por Zona',
type: 'bar',
xKey: 'zona',
yKey: 'totalVenta',
colorToken: 'tertiary',
height: 320,
},
ordenesPorEstatus: {
title: 'Órdenes de Servicio por Estatus',
type: 'pie',
valueKey: 'count',
labelKey: 'estatus',
height: 300,
},
smartOltStatus: {
title: 'Status ONUs',
type: 'donut',
valueKey: 'count',
labelKey: 'status',
height: 320,
},
smartOltSignalBand: {
title: 'Signal Band ONUs',
type: 'donut',
valueKey: 'count',
labelKey: 'signalBand',
height: 320,
},
}

export default OPERACIONES_CHART_META