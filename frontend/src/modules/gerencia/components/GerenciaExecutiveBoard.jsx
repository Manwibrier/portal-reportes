// src/modules/gerencia/components/GerenciaExecutiveBoard.jsx

import { useMemo } from 'react'
import { buildGerenciaKpiItems, GERENCIA_SECTION_META } from '../constants'
import GerenciaExecutiveMetric from './GerenciaExecutiveMetric'

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function buildClassName(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatPeriodLabel(period) {
  if (typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) {
    return 'Período no disponible'
  }

  const [year, month] = period.split('-')
  const monthIndex = Number(month) - 1
  const monthLabel = MONTH_LABELS[monthIndex] || month

  return `Cierre mes ${monthLabel} ${year}`
}

function normalizeSection(section = {}, fallback = {}) {
  const safeSection = ensureObject(section)
  const safeFallback = ensureObject(fallback)

  const key = normalizeText(
    safeSection.key ??
      safeSection.id ??
      safeFallback.key ??
      safeFallback.id,
  )

  const defaultMeta = ensureObject(GERENCIA_SECTION_META[key])

  return {
    ...defaultMeta,
    ...safeFallback,
    ...safeSection,
    key,
    title: normalizeText(
      safeSection.title ??
        safeSection.name ??
        safeFallback.title ??
        defaultMeta.title,
      'Indicadores',
    ),
    subtitle: normalizeText(
      safeSection.subtitle ??
        safeSection.description ??
        safeFallback.subtitle ??
        defaultMeta.subtitle,
    ),
    tone: normalizeText(
      safeSection.tone ??
        safeFallback.tone ??
        defaultMeta.tone,
      'blue',
    ),
  }
}

function resolveDashboardSections(dashboard = {}) {
  const defaultSections = Object.values(GERENCIA_SECTION_META)
  const uiSections = ensureArray(dashboard?.ui?.sections)

  const uiSectionsByKey = new Map(
    uiSections
      .map((section) => {
        const key = normalizeText(section?.key ?? section?.id)
        return key ? [key, section] : null
      })
      .filter(Boolean),
  )

  const resolvedDefaults = defaultSections.map((section) => {
    const override = uiSectionsByKey.get(section.key)

    return normalizeSection(override, section)
  })

  const extraSections = uiSections
    .filter((section) => {
      const key = normalizeText(section?.key ?? section?.id)
      return key && !GERENCIA_SECTION_META[key]
    })
    .map((section) => normalizeSection(section))
    .filter((section) => section.key)

  return [...resolvedDefaults, ...extraSections]
}

function buildSectionMetrics(section = {}, kpis = {}) {
  if (!section?.key) {
    return []
  }

  return buildGerenciaKpiItems(section.key, kpis).map((metric) => ({
    ...metric,
    key: normalizeText(metric.key, `${section.key}-${metric.label}`),
    label: normalizeText(metric.label, 'Indicador'),
    description: normalizeText(metric.description),
    meta: normalizeText(metric.meta),
    tone: normalizeText(metric.tone || section.tone),
  }))
}

function GerenciaExecutiveBoard({ dashboard = {} }) {
  const currentPeriod = dashboard?.meta?.currentPeriod || ''
  const kpis = ensureObject(dashboard?.kpis)

  const sections = useMemo(() => {
    return resolveDashboardSections(dashboard)
      .map((section) => ({
        ...section,
        metrics: buildSectionMetrics(section, kpis),
      }))
      .filter((section) => section.key)
  }, [dashboard, kpis])

  return (
    <section className="gerencia-board">
      <header className="gerencia-board__header">
        <div className="gerencia-board__heading">
          <h2 className="gerencia-board__title">
            Indicadores de gestión
          </h2>

          <p className="gerencia-board__subtitle">
            {formatPeriodLabel(currentPeriod)}
          </p>
        </div>
      </header>

      <div className="gerencia-board__grid">
        {sections.map((section) => (
          <article
            key={section.key}
            className={buildClassName(
              'portal-card',
              'gerencia-board__card',
              section.tone ? `gerencia-board__card--${section.tone}` : '',
            )}
          >
            <header className="portal-card__header gerencia-board__card-header">
              <div className="portal-card__heading">
                <h3 className="portal-card__title gerencia-board__card-title">
                  {section.title}
                </h3>

                {section.subtitle ? (
                  <p className="portal-card__subtitle gerencia-board__card-subtitle">
                    {section.subtitle}
                  </p>
                ) : null}
              </div>
            </header>

            <div className="portal-card__body gerencia-board__card-body">
              {section.metrics.length === 0 ? (
                <div className="tickets-empty-state tickets-empty-state--compact">
                  No hay indicadores disponibles para esta sección.
                </div>
              ) : (
                <div className="gerencia-board__metrics kpi-grid">
                  {section.metrics.map((metric) => (
                    <GerenciaExecutiveMetric
                      key={`${section.key}-${metric.key}`}
                      label={metric.label}
                      value={metric.value}
                      format={metric.format}
                      decimals={metric.decimals}
                      locale={metric.locale}
                      prefix={metric.prefix}
                      suffix={metric.suffix}
                      emptyValue={metric.emptyValue}
                      description={metric.description}
                      meta={metric.meta}
                      tone={metric.tone}
                    />
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default GerenciaExecutiveBoard