// src/modules/operaciones/components/OperacionesStatusSegment.jsx

import { ensureArray, normalizeText } from '../utils'

const DEFAULT_OPTIONS = [
  {
    value: '',
    label: 'Todos',
  },
  {
    value: 'Online',
    label: 'Online',
  },
  {
    value: 'Offline',
    label: 'Offline',
  },
  {
    value: 'LOS',
    label: 'LOS',
  },
  {
    value: 'Power Fail',
    label: 'Power Fail',
  },
]

function normalizeStatusValue(value = '') {
  const normalized = normalizeText(value)

  if (
    normalized.toLowerCase() === 'all' ||
    normalized.toLowerCase() === 'todos'
  ) {
    return ''
  }

  return normalized
}

function normalizeOption(item = {}, index = 0) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const value = normalizeStatusValue(
      item.value ??
        item.id ??
        item.key ??
        item.status ??
        item.label,
    )

    const label = normalizeText(
      item.label ??
        item.name ??
        item.status ??
        item.value,
      value || 'Todos',
    )

    const count = item.count ?? item.total ?? item.valueCount

    return {
      key: normalizeText(item.key ?? item.id, `status-option-${index}`),
      value,
      label,
      count,
    }
  }

  const value = normalizeStatusValue(item)

  return {
    key: `status-option-${index}`,
    value,
    label: value || 'Todos',
    count: undefined,
  }
}

function buildOptions(options = []) {
  const source = ensureArray(options).length > 0 ? options : DEFAULT_OPTIONS
  const seen = new Set()
  const normalizedOptions = []

  source.forEach((item, index) => {
    const option = normalizeOption(item, index)
    const key = option.value.toLowerCase() || '__all__'

    if (seen.has(key)) return

    seen.add(key)
    normalizedOptions.push(option)
  })

  const hasAllOption = normalizedOptions.some((option) => option.value === '')

  if (!hasAllOption) {
    normalizedOptions.unshift({
      key: 'status-option-all',
      value: '',
      label: 'Todos',
      count: undefined,
    })
  }

  return normalizedOptions
}

function OperacionesStatusSegment({
  options = [],
  activeStatus = '',
  onStatusChange,
  title = 'Estado',
  className = '',
}) {
  const normalizedActiveStatus = normalizeStatusValue(activeStatus)
  const normalizedOptions = buildOptions(options)

  const rootClassName = [
    'operaciones-status-segment',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  function handleStatusChange(value) {
    onStatusChange?.(normalizeStatusValue(value))
  }

  return (
    <section className={rootClassName}>
      {title ? (
        <header className="operaciones-status-segment__header">
          <h3 className="operaciones-status-segment__title">{title}</h3>
        </header>
      ) : null}

      <div className="operaciones-status-segment__buttons" role="group">
        {normalizedOptions.map((option) => {
          const isActive = option.value === normalizedActiveStatus

          return (
            <button
              key={option.key}
              type="button"
              className={
                isActive
                  ? 'operaciones-status-segment__button operaciones-status-segment__button--active'
                  : 'operaciones-status-segment__button'
              }
              aria-pressed={isActive}
              onClick={() => handleStatusChange(option.value)}
            >
              <span>{option.label}</span>

              {option.count !== undefined && option.count !== null ? (
                <strong className="operaciones-status-segment__count">
                  {option.count}
                </strong>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default OperacionesStatusSegment