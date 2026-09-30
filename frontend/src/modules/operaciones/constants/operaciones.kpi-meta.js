// src/modules/operaciones/constants/operaciones.kpi-meta.js

/**
* Metadatos de KPIs de Operaciones.
* Se usa para renderizar indicadores en el dashboard.
*/
const OPERACIONES_KPI_META = {
totalClientesActivos: {
title: 'Clientes Activos',
description: 'Número total de clientes activos en la zona o franquicia.',
format: 'number',
decimals: 0,
prefix: '',
suffix: '',
},
totalClientesCortados: {
title: 'Clientes Cortados',
description: 'Clientes cuya conexión ha sido cortada.',
format: 'number',
decimals: 0,
prefix: '',
suffix: '',
},
totalClientesPorCortar: {
title: 'Clientes por Cortar',
description: 'Clientes próximos a ser cortados.',
format: 'number',
decimals: 0,
},
totalClientesExonerados: {
title: 'Clientes Exonerados',
description: 'Clientes exonerados de corte.',
format: 'number',
decimals: 0,
},
totalVenta: {
title: 'Ventas',
description: 'Número total de ventas registradas.',
format: 'number',
decimals: 0,
},
totalInstalacionesFinalizadas: {
title: 'Instalaciones Finalizadas',
description: 'Número total de instalaciones completadas.',
format: 'number',
decimals: 0,
},
totalInstalacionesPendientes: {
title: 'Instalaciones Pendientes',
description: 'Número de instalaciones pendientes.',
format: 'number',
decimals: 0,
},
totalReclamosFinalizados: {
title: 'Reclamos Finalizados',
description: 'Número de reclamos cerrados exitosamente.',
format: 'number',
decimals: 0,
},
efectividadInstalacionPct: {
title: '% Efectividad Instalación',
description: 'Porcentaje de instalaciones efectivas sobre total.',
format: 'percent',
decimals: 2,
suffix: '%',
},
tasaCortePct: {
title: '% Corte',
description: 'Porcentaje de clientes cortados sobre base total.',
format: 'percent',
decimals: 2,
suffix: '%',
},
churnRateOperacionalPct: {
title: '% Churn Operacional',
description: 'Porcentaje de clientes cortados o por cortar.',
format: 'percent',
decimals: 2,
suffix: '%',
},
}

export default OPERACIONES_KPI_META