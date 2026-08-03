import {
  ensureArray,
  ensureObject,
  ensureString,
  firstNonEmpty,
  normalizarTexto,
  parseBoolean,
  parseNumber,
} from './tickets.helpers'

function normalizeLabel(value, fallback = 'SIN DATO') {
  return normalizarTexto(value, fallback)
}

function normalizeValue(value, fallback = 0) {
  return parseNumber(value, fallback)
}

function normalizePercent(value) {
  const number = parseNumber(value, 0)
  return Math.min(Math.max(number, 0), 100)
}

function toGroupedDatum(
  item = {},
  {
    labelKeys = ['departamento', 'label', 'name', 'motivo'],
    valueKeys = ['cantidad', 'value', 'total'],
    fallbackLabel = 'SIN DATO',
  } = {},
) {
  const label = firstNonEmpty(
    labelKeys.map((key) => item?.[key]),
    fallbackLabel,
  )

  const value = valueKeys.reduce((resolved, key) => {
    if (resolved !== null) return resolved

    const candidate = item?.[key]
    return candidate === undefined || candidate === null ? null : candidate
  }, null)

  return {
    label,
    value: normalizeValue(value),
  }
}

function normalizeToggleSeriesData(data = []) {
  return ensureArray(data)
    .map((item) => ({
      label: normalizeLabel(
        item?.label ?? item?.departamento ?? item?.name,
      ),
      value: normalizeValue(item?.value ?? item?.cantidad ?? item?.total),
    }))
    .filter((item) => item.value > 0)
}

export function toDepartmentChartData(data = [], config = {}) {
  const { labelKeys, valueKeys, fallbackLabel = 'SIN DATO' } =
    ensureObject(config)

  return ensureArray(data)
    .map((item) => {
      const datum = toGroupedDatum(item, {
        labelKeys:
          ensureArray(labelKeys).length > 0
            ? labelKeys
            : ['departamento', 'label', 'name', 'motivo'],
        valueKeys:
          ensureArray(valueKeys).length > 0
            ? valueKeys
            : ['cantidad', 'value', 'total'],
        fallbackLabel,
      })

      return {
        departamento: datum.label,
        label: datum.label,
        name: datum.label,
        cantidad: datum.value,
        value: datum.value,
      }
    })
    .filter((item) => item.cantidad > 0)
}

export function toGroupedValueData(data = [], config = {}) {
  const { labelKeys, valueKeys, fallbackLabel = 'SIN DATO' } =
    ensureObject(config)

  return ensureArray(data)
    .map((item) => {
      const datum = toGroupedDatum(item, {
        labelKeys:
          ensureArray(labelKeys).length > 0
            ? labelKeys
            : ['label', 'name', 'departamento', 'motivo'],
        valueKeys:
          ensureArray(valueKeys).length > 0
            ? valueKeys
            : ['value', 'cantidad', 'total'],
        fallbackLabel,
      })

      return {
        label: datum.label,
        name: datum.label,
        departamento: datum.label,
        value: datum.value,
        cantidad: datum.value,
      }
    })
    .filter((item) => item.value > 0)
}

export function toBacklogChartData(data = []) {
  return ensureArray(data).map((item) => {
    const periodo = firstNonEmpty(
      [item?.periodo, item?.label, item?.mes],
      'SIN DATO',
    )

    return {
      ...item,
      periodo,
      label: periodo,
      entradas: normalizeValue(item?.entradas),
      cerrados: normalizeValue(item?.cerrados),
      backlog: normalizeValue(item?.backlog),
    }
  })
}

export function toDonutChartData(data = []) {
  return ensureArray(data)
    .map((item) => ({
      name: normalizeLabel(item?.name ?? item?.label),
      label: normalizeLabel(item?.label ?? item?.name),
      value: normalizeValue(item?.value ?? item?.cantidad ?? item?.total),
      colorToken: ensureString(item?.colorToken || item?.color),
      color: ensureString(item?.color),
    }))
    .filter((item) => item.value > 0)
}

export function toTornadoChartData(data = []) {
  return ensureArray(data)
    .map((item) => {
      const leftValue = normalizeValue(
        item?.leftValue ??
          item?.recibidos ??
          item?.emitidos ??
          item?.entradas ??
          item?.left,
      )

      const rightValue = normalizeValue(
        item?.rightValue ??
          item?.finalizados ??
          item?.cerrados ??
          item?.salidas ??
          item?.right,
      )

      const total = normalizeValue(
        item?.total ?? leftValue + rightValue,
      )

      return {
        departamento: normalizeLabel(
          item?.departamento ??
            item?.department ??
            item?.label ??
            item?.name,
        ),
        label: normalizeLabel(
          item?.label ??
            item?.departamento ??
            item?.department ??
            item?.name,
        ),
        leftValue,
        rightValue,
        total,
      }
    })
    .filter((item) => item.leftValue > 0 || item.rightValue > 0)
}

export function toFilterItems(items = []) {
  return ensureArray(items).map((item) => {
    const department = firstNonEmpty(
      [item?.department, item?.label, item?.departamento],
      'TOTAL',
    )

    const count = normalizeValue(
      item?.count ?? item?.cantidad ?? item?.value,
    )

    return {
      department,
      label: firstNonEmpty([item?.label, item?.department], department),
      count,
      cantidad: count,
      value: count,
    }
  })
}

export function toToggleChartOptions(rankings = {}, config = {}) {
  const rankingData = ensureObject(rankings)
  const normalizedConfig = Array.isArray(config)
    ? { options: config }
    : ensureObject(config)

  const backendOptions = ensureArray(normalizedConfig.options)

  if (backendOptions.length > 0) {
    return backendOptions.map((option, index) => {
      const key = ensureString(option?.key, `ranking-${index}`)
      const fallbackColorToken = key === 'resolutores' ? 'secondary' : 'primary'
      const data = normalizeToggleSeriesData(rankingData?.[key])

      return {
        key,
        label: firstNonEmpty([option?.label, option?.title], key),
        title:
          firstNonEmpty(
            [option?.title, option?.label],
            key === 'resolutores' ? 'Top resolutores' : 'Top requeridores',
          ),
        subtitle: ensureString(option?.subtitle),
        type: ensureString(option?.type),
        categoryKey: ensureString(option?.categoryKey, 'label'),
        valueKey: ensureString(option?.valueKey, 'value'),
        valueLabel: ensureString(option?.valueLabel, 'Total tickets'),
        colorToken:
          ensureString(option?.colorToken) ||
          ensureArray(option?.colorTokens)[0] ||
          ensureString(option?.barColor) ||
          fallbackColorToken,
        barColor: ensureString(option?.barColor),
        metric: ensureObject(option?.metric),
        data,
      }
    })
  }

  return [
    {
      key: 'requeridores',
      label: 'Requeridores',
      title: 'Top requeridores',
      categoryKey: 'label',
      valueKey: 'value',
      valueLabel: 'Total tickets',
      colorToken: 'primary',
      data: normalizeToggleSeriesData(rankingData?.requeridores),
    },
    {
      key: 'resolutores',
      label: 'Resolutores',
      title: 'Top resolutores',
      categoryKey: 'label',
      valueKey: 'value',
      valueLabel: 'Total tickets',
      colorToken: 'secondary',
      data: normalizeToggleSeriesData(rankingData?.resolutores),
    },
  ]
}

export function toCriticalRows(rows = []) {
  return ensureArray(rows).map((row, index) => {
    const nroTicket = firstNonEmpty(
      [row?.nroTicket, row?.nro_ticket, row?.ticket],
      '',
    )

    const diasParaVencimientoRaw =
      row?.diasParaVencimiento ??
      row?.dias_para_vencimiento ??
      row?.daysToDue ??
      row?.days_to_due ??
      null

    const diasParaVencimiento =
      diasParaVencimientoRaw == null
        ? null
        : normalizeValue(diasParaVencimientoRaw)

    const vencido =
      row?.vencido ??
      row?.is_overdue ??
      (diasParaVencimiento != null ? diasParaVencimiento < 0 : false)

    return {
      ...row,
      id: firstNonEmpty(
        [row?.id, nroTicket && `ticket-${nroTicket}`],
        `ticket-row-${index}`,
      ),
      nroTicket,
      tipoTicket: firstNonEmpty(
        [row?.tipoTicket, row?.tipo_ticket],
        'Sin tipo',
      ),
      departamento: firstNonEmpty(
        [row?.departamento, row?.department],
        'SIN DATO',
      ),
      departamentoEmite: firstNonEmpty(
        [row?.departamentoEmite, row?.departamento_emite],
        'SIN DATO',
      ),
      usuarioAsignado: firstNonEmpty(
        [row?.usuarioAsignado, row?.usuario_asignado, row?.assigned_to],
        'SIN ASIGNAR',
      ),
      prioridad: firstNonEmpty([row?.prioridad], 'Sin prioridad'),
      fechaRequerido:
        row?.fechaRequerido ??
        row?.fecha_requerido ??
        row?.required_date ??
        null,
      diasParaVencimiento,
      dias_para_vencimiento: diasParaVencimiento,
      vencido: parseBoolean(vencido, false),
      avance: normalizePercent(row?.avance),
      estatus: firstNonEmpty([row?.estatus, row?.status], 'SIN DATO'),
      categoria: firstNonEmpty([row?.categoria, row?.category], 'Sin categoría'),
    }
  })
}