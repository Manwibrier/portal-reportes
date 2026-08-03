export const DEFAULT_SEGMENTS = Object.freeze([
  'HOGAR',
  'JURIDICO',
  'GOBIERNO',
])

export const GERENCIA_SECTION_META = Object.freeze({
  crecimiento: {
    key: 'crecimiento',
    title: 'Indicadores de crecimiento',
    tone: 'blue',
  },
  clientes: {
    key: 'clientes',
    title: 'Clientes',
    tone: 'blue',
  },
  recuperacion: {
    key: 'recuperacion',
    title: 'Recuperación',
    tone: 'blue',
  },
  corte: {
    key: 'corte',
    title: 'Corte',
    tone: 'blue',
  },
  churn: {
    key: 'churn',
    title: 'Churn',
    tone: 'blue',
  },
  ventas: {
    key: 'ventas',
    title: 'Ventas',
    tone: 'blue',
  },
  recaudo: {
    key: 'recaudo',
    title: 'Recaudo',
    tone: 'green',
  },
  arpu: {
    key: 'arpu',
    title: 'ARPU',
    tone: 'green',
  },
  cmc15: {
    key: 'cmc15',
    title: 'CMC al 15 de mes',
    tone: 'green',
  },
  calidad: {
    key: 'calidad',
    title: 'Calidad de servicio',
    tone: 'green',
  },
  reclamos: {
    key: 'reclamos',
    title: 'Reclamos',
    tone: 'green',
  },
  instalaciones: {
    key: 'instalaciones',
    title: 'Instalaciones',
    tone: 'green',
  },
})

export const GERENCIA_KPI_META = Object.freeze({
  crecimiento: [
    {
      key: 'metaFacturacion20Pct',
      label: 'Meta',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
    {
      key: 'facturacionMes',
      label: 'Cierre mes',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
    {
      key: 'crecimientoFacturacionPct',
      label: 'Crecimiento',
      format: 'percent',
      decimals: 2,
      emptyValue: 'N/D',
    },
  ],
  clientes: [
    {
      key: 'clientesHogar',
      label: 'Hogar',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'clientesJuridico',
      label: 'Jurídico',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'clientesGobierno',
      label: 'Gobierno',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
  recuperacion: [
    {
      key: 'clientesCortados',
      label: 'Cortados',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'clientesRecuperados',
      label: 'Recuperados',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'cortadosMesAnterior',
      label: 'Cortados mes anterior',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
  corte: [
    {
      key: 'metaCorte',
      label: 'Meta',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'clientesCortados',
      label: 'Cierre mes',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'cortadosMesAnterior',
      label: 'Cortados mes anterior',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
  churn: [
    {
      key: 'metaChurn',
      label: 'Meta',
      format: 'percent',
      decimals: 2,
      emptyValue: 'N/D',
    },
    {
      key: 'churnMes',
      label: 'Cierre mes',
      format: 'percent',
      decimals: 2,
      emptyValue: 'N/D',
    },
    {
      key: 'churnMesAnterior',
      label: 'Churn mes anterior',
      format: 'percent',
      decimals: 2,
      emptyValue: 'N/D',
    },
  ],
  ventas: [
    {
      key: 'metaVentas',
      label: 'Meta',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'ventasMes',
      label: 'Resultado',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'ventasMesAnterior',
      label: 'Mes anterior',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
  recaudo: [
    {
      key: 'metaRecaudo20Pct',
      label: 'Meta',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
    {
      key: 'recaudoMes',
      label: 'Cierre mes',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
    {
      key: 'recaudoMesAnterior',
      label: 'Recaudo mes anterior',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
  ],
  arpu: [
    {
      key: 'arpuHogar',
      label: 'Hogar',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
    {
      key: 'arpuJuridico',
      label: 'Jurídico',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
    {
      key: 'arpuGobierno',
      label: 'Gobierno',
      format: 'currency',
      decimals: 2,
      prefix: '$',
      emptyValue: 'N/D',
    },
  ],
  cmc15: [
    {
      key: 'metaCmc15',
      label: 'Meta',
      format: 'text',
      emptyValue: 'N/D',
    },
    {
      key: 'cmc15Mes',
      label: 'Cierre mes',
      format: 'text',
      emptyValue: 'N/D',
    },
    {
      key: 'cmc15MesAnterior',
      label: 'CMC mes anterior',
      format: 'text',
      emptyValue: 'N/D',
    },
  ],
  calidad: [
    {
      key: 'metaCalidadServicio',
      label: 'Meta',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'calidadServicioMes',
      label: 'Resultado',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'calidadServicioMesAnterior',
      label: 'Mes anterior',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
  reclamos: [
    {
      key: 'reclamosEjecutados',
      label: 'Ejecutadas',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
      fallbackKey: 'reclamosFinalizados',
    },
    {
      key: 'reclamosPendientes',
      label: 'Pendientes',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'reclamosEnSla',
      label: 'Atendidos dentro SLA',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
  instalaciones: [
    {
      key: 'instalacionesFinalizadas',
      label: 'Ejecutadas',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'instalacionesPendientes',
      label: 'Pendientes',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
    {
      key: 'instalacionesEnSla',
      label: 'Atendidos dentro SLA',
      format: 'number',
      decimals: 0,
      emptyValue: 'N/D',
    },
  ],
})

function normalizeMetricValue(value, fallback = 'N/D') {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return value
}

export function buildGerenciaKpiItems(section, kpis = {}) {
  const config = GERENCIA_KPI_META[section]

  if (!Array.isArray(config)) {
    return []
  }

  return config.map((item) => {
    const emptyValue = item.emptyValue || 'N/D'

    const primaryValue = normalizeMetricValue(kpis?.[item.key], emptyValue)

    const fallbackValue =
      item.fallbackKey != null
        ? normalizeMetricValue(kpis?.[item.fallbackKey], emptyValue)
        : primaryValue

    return {
      key: item.key,
      label: item.label,
      value:
        primaryValue === emptyValue && item.fallbackKey
          ? fallbackValue
          : primaryValue,
      format: item.format || 'number',
      decimals: Number.isFinite(Number(item.decimals))
        ? Number(item.decimals)
        : 0,
      prefix: item.prefix || '',
      suffix: item.suffix || '',
      locale: item.locale || 'es-VE',
      emptyValue,
      fallbackKey: item.fallbackKey || '',
    }
  })
}