export const CLIENTES_CHART_META = Object.freeze({
  estatus: {
    key: 'estatus',
    title: 'Distribución por Estatus',
    subtitle:
      'Lectura consolidada de la base de clientes según el estatus operativo visible.',
    metric: {
      format: 'number',
      decimals: 0,
    },
    valueLabel: 'Clientes',
    colorTokens: ['success', 'warning', 'danger', 'neutral'],
  },
  producto: {
    key: 'producto',
    title: 'Distribución por Producto',
    subtitle:
      'Segmentación comercial de clientes por tipo de producto contratado.',
    metric: {
      format: 'number',
      decimals: 0,
    },
    valueLabel: 'Clientes',
    colorTokens: ['primary', 'secondary', 'tertiary'],
  },
})