export const GERENCIA_CHART_META = Object.freeze({
  estadoClientes: {
    key: 'estadoClientes',
    title: 'Estado de la base',
    subtitle: 'Distribución actual por condición comercial.',
    metric: {
      format: 'number',
      decimals: 0,
      locale: 'es-VE',
    },
    valueLabel: 'Clientes',
  },
  distribucionServicios: {
    key: 'distribucionServicios',
    title: 'Base por servicio',
    subtitle: 'Composición del universo comercial.',
    metric: {
      format: 'number',
      decimals: 0,
      locale: 'es-VE',
    },
    valueLabel: 'Clientes',
    colorToken: 'primary',
  },
  operacionMensual: {
    key: 'operacionMensual',
    title: 'Operación mensual',
    subtitle: 'Ventas, instalaciones y reclamos por período.',
    metric: {
      format: 'number',
      decimals: 0,
      locale: 'es-VE',
    },
    valueLabel: 'Total',
  },
  facturacionMensual: {
    key: 'facturacionMensual',
    title: 'Facturación mensual',
    subtitle: 'Bruta, descuentos y neta.',
    metric: {
      format: 'currency',
      decimals: 2,
      locale: 'es-VE',
      prefix: '$',
    },
    valueLabel: 'Monto',
  },
  recaudoMensual: {
    key: 'recaudoMensual',
    title: 'Recaudo mensual',
    subtitle: 'Ingreso cobrado consolidado.',
    metric: {
      format: 'currency',
      decimals: 2,
      locale: 'es-VE',
      prefix: '$',
    },
    valueLabel: 'Monto',
    colorToken: 'success',
  },
  facturacionPorServicio: {
    key: 'facturacionPorServicio',
    title: 'Facturación por servicio',
    subtitle: 'Distribución de facturación del período.',
    metric: {
      format: 'currency',
      decimals: 2,
      locale: 'es-VE',
      prefix: '$',
    },
    valueLabel: 'Facturación',
    colorToken: 'secondary',
  },
  recaudoPorFormaPago: {
    key: 'recaudoPorFormaPago',
    title: 'Recaudo por forma de pago',
    subtitle: 'Composición del recaudo consolidado.',
    metric: {
      format: 'currency',
      decimals: 2,
      locale: 'es-VE',
      prefix: '$',
    },
    valueLabel: 'Recaudo',
    colorToken: 'success',
  },
})

export default GERENCIA_CHART_META