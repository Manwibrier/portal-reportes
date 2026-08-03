// src/modules/tickets/components/TicketsDepartmentFilter.jsx

import { RotateCcw } from 'lucide-react'

const TOTAL_VALUE = 'TOTAL'

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeCount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return []

  const normalized = items.map((item) => {
    const department = normalizeText(
      item?.department ?? item?.departamento ?? item?.label,
      TOTAL_VALUE,
    )

    const label = normalizeText(
      item?.label ?? item?.department ?? item?.departamento,
      department === TOTAL_VALUE ? 'Total' : department,
    )

    const count = normalizeCount(
      item?.count ?? item?.cantidad ?? item?.value,
    )

    return {
      department,
      label,
      count,
      cantidad: count,
      value: count,
    }
  })

  const deduped = []
  const seen = new Set()

  normalized.forEach((item) => {
    if (seen.has(item.department)) return

    seen.add(item.department)
    deduped.push(item)
  })

  return deduped
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-VE').format(normalizeCount(value))
}

function resolveIncomingValue({
  value,
  selectedDepartment,
  selectedDepartments,
}) {
  if (value !== undefined && value !== null && value !== '') {
    return normalizeText(value, TOTAL_VALUE)
  }

  if (
    selectedDepartment !== undefined &&
    selectedDepartment !== null &&
    selectedDepartment !== ''
  ) {
    return normalizeText(selectedDepartment, TOTAL_VALUE)
  }

  if (Array.isArray(selectedDepartments) && selectedDepartments.length > 0) {
    return normalizeText(selectedDepartments[0], TOTAL_VALUE)
  }

  return TOTAL_VALUE
}

function resolveSelectedValue(items = [], requestedValue = TOTAL_VALUE) {
  const requested = normalizeText(requestedValue, TOTAL_VALUE)

  if (items.some((item) => item.department === requested)) {
    return requested
  }

  if (items.some((item) => item.department === TOTAL_VALUE)) {
    return TOTAL_VALUE
  }

  return items[0]?.department || TOTAL_VALUE
}

function resolveTotalTickets(items = [], totalTickets = 0) {
  const explicitTotal = normalizeCount(totalTickets)

  if (explicitTotal > 0) {
    return explicitTotal
  }

  const totalItem = items.find((item) => item.department === TOTAL_VALUE)

  if (totalItem) {
    return normalizeCount(totalItem.count)
  }

  return items
    .filter((item) => item.department !== TOTAL_VALUE)
    .reduce((acc, item) => acc + normalizeCount(item.count), 0)
}

function getSelectClassName(isActive = false) {
  return [
    'tickets-filter-select__input',
    isActive ? 'tickets-filter-select__input--active' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function emitChange({
  nextValue,
  onChange,
  selectedDepartments,
}) {
  if (typeof onChange !== 'function') return

  if (Array.isArray(selectedDepartments)) {
    onChange(nextValue === TOTAL_VALUE ? [] : [nextValue])
    return
  }

  onChange(nextValue)
}

function TicketsDepartmentFilter({
  items = [],
  value,
  selectedDepartment,
  selectedDepartments,
  onChange,
  onReset,
  title = 'Filtrar por departamento',
  subtitle = '',
  totalTickets = 0,
  totalLabel = 'Total de Tickets',
  selectLabel = 'Departamento',
  emptyMessage = 'No hay departamentos disponibles.',
  id = 'tickets-department-filter',
  disabled = false,
}) {
  const normalizedItems = normalizeItems(items)
  const incomingValue = resolveIncomingValue({
    value,
    selectedDepartment,
    selectedDepartments,
  })

  const selectedValue = resolveSelectedValue(normalizedItems, incomingValue)
  const hasItems = normalizedItems.length > 0
  const hasActiveFilter = selectedValue !== TOTAL_VALUE
  const resolvedTotalTickets = resolveTotalTickets(
    normalizedItems,
    totalTickets,
  )

  const canReset = Boolean(
    hasActiveFilter &&
      !disabled &&
      (typeof onReset === 'function' || typeof onChange === 'function'),
  )

  function handleChange(event) {
    const nextValue = normalizeText(event?.target?.value, TOTAL_VALUE)

    emitChange({
      nextValue,
      onChange,
      selectedDepartments,
    })
  }

  function handleReset() {
    if (!canReset) return

    if (typeof onReset === 'function') {
      onReset()
      return
    }

    emitChange({
      nextValue: TOTAL_VALUE,
      onChange,
      selectedDepartments,
    })
  }

  return (
    <section className="tickets-filter-card portal-card">
      <header className="tickets-filter-card__header portal-card__header">
        <div className="portal-card__heading">
          <h3 className="tickets-filter-card__title portal-card__title">
            {title}
          </h3>

          {subtitle ? (
            <p className="portal-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div className="tickets-filter-card__body portal-card__body">
        <div className="portal-filter-grid portal-filter-grid--department">
          <article className="tickets-filter-panel tickets-filter-panel--summary">
            <span className="tickets-filter-panel__title">
              {totalLabel}
            </span>

            <strong className="tickets-filter-panel__value">
              {formatNumber(resolvedTotalTickets)}
            </strong>
          </article>

          <div className="tickets-filter-panel tickets-filter-panel--select">
            <label
              htmlFor={id}
              className="tickets-filter-panel__title"
            >
              {selectLabel}
            </label>

            {hasItems ? (
              <div className="tickets-filter-select__control">
                <select
                  id={id}
                  className={getSelectClassName(hasActiveFilter)}
                  value={selectedValue}
                  onChange={handleChange}
                  disabled={disabled}
                >
                  {normalizedItems.map((item) => (
                    <option
                      key={item.department}
                      value={item.department}
                    >
                      {`${item.label} (${formatNumber(item.count)})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="tickets-empty-state tickets-empty-state--compact">
                {emptyMessage}
              </div>
            )}
          </div>

          <div className="portal-filter-actions">
            <button
              type="button"
              className="portal-filter-action portal-filter-action--primary portal-filter-action--compact"
              onClick={handleReset}
              disabled={!canReset}
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TicketsDepartmentFilter