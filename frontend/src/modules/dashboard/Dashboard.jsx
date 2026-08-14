// src/modules/dashboard/Dashboard.jsx

import { useMemo, useState } from 'react'
import ModulePage from '../../components/ModulePage'
import QuickAccessCard from '../../components/QuickAccessCard'
import { getMenuModules } from '../../core/routes/modulesRegistry'
import { getCurrentUser } from '../../core/services/auth'
import { INTERNAL_NEWS, NEWS_SEGMENTS } from './data/internalNews'

const GROUP_ORDER = [
  'gerencia',
  'clientes',
  'operaciones',
  'finanzas',
  'tickets',
]

const GROUP_DESCRIPTIONS = {
  gerencia: 'Indicadores ejecutivos y visión gerencial.',
  clientes: 'Resumen diario y cierre mensual de clientes.',
  operaciones: 'SmartOLT, órdenes de servicio y operación técnica.',
  finanzas: 'Indicadores financieros del portal.',
  tickets: 'Tableros operacionales y gerenciales de Tickets.',
}

function getModuleDescription(moduleId) {
  switch (moduleId) {
    case 'gerencia':
      return 'Consultar tablero ejecutivo de indicadores de gestión.'

    case 'clientes':
      return 'Consultar indicadores consolidados de clientes.'

    case 'clientes-resumen-diario':
      return 'Consultar resumen diario operativo de clientes.'

    case 'clientes-cierre-mensual':
      return 'Consultar cierre mensual por zona, franquicia y servicio.'

    case 'operaciones':
      return 'Consultar indicadores operativos del portal.'

    case 'operaciones-dashboard':
      return 'Ver tablero integrado de SmartOLT y Órdenes de Servicio.'

    case 'operaciones-smartolt':
      return 'Consultar análisis técnico, estado, señal y capacidad SmartOLT.'

    case 'operaciones-ordenes-servicio':
      return 'Consultar órdenes operativas relacionadas desde TotalNet.'

    case 'finanzas':
      return 'Consultar métricas financieras del portal.'

    case 'tickets':
      return 'Consultar tableros operativos y gerenciales de Tickets.'

    case 'tickets-operacional':
      return 'Ver tickets operativos, backlog y compromisos.'

    case 'tickets-gerencial':
      return 'Consultar indicadores estratégicos de tickets.'

    default:
      return 'Entrar al módulo.'
  }
}

function normalizeAccessItem(item = {}, parent = {}) {
  const isChild = Boolean(parent?.id)
  const icon = item.icon || parent.icon

  return {
    id: item.id,
    name: item.name,
    path: item.path,
    icon,
    description: getModuleDescription(item.id),
    groupId: parent.id || item.id,
    groupName: parent.name || item.name,
    isChild,
  }
}

function buildDashboardGroups(modules = []) {
  if (!Array.isArray(modules)) {
    return []
  }

  const groups = modules
    .filter((module) => module?.id && module.id !== 'dashboard')
    .map((module) => {
      const visibleChildren = Array.isArray(module?.children)
        ? module.children.filter((child) => child?.path)
        : []

      const items =
        visibleChildren.length > 0
          ? visibleChildren.map((child) => normalizeAccessItem(child, module))
          : module?.path
            ? [normalizeAccessItem(module)]
            : []

      return {
        id: module.id,
        name: module.name,
        icon: module.icon,
        description: GROUP_DESCRIPTIONS[module.id] || '',
        items,
      }
    })
    .filter((group) => group.items.length > 0)

  return groups.sort((left, right) => {
    const leftIndex = GROUP_ORDER.indexOf(left.id)
    const rightIndex = GROUP_ORDER.indexOf(right.id)

    const safeLeftIndex =
      leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex

    const safeRightIndex =
      rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex

    if (safeLeftIndex !== safeRightIndex) {
      return safeLeftIndex - safeRightIndex
    }

    return String(left.name || '').localeCompare(String(right.name || ''), 'es', {
      sensitivity: 'base',
    })
  })
}

function getSegmentClassName(group = {}) {
  const itemCount = Array.isArray(group.items) ? group.items.length : 0

  return [
    'portal-card',
    'dashboard-access-group',
    `dashboard-access-group--${group.id}`,
    itemCount >= 3 ? 'dashboard-access-group--wide' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function DashboardAccessGroup({ group }) {
  const Icon = group.icon

  return (
    <section className={getSegmentClassName(group)}>
      <header className="portal-card__header dashboard-access-group__header">
        <div className="portal-card__heading">
          <div className="dashboard-access-group__title-row">
            {Icon ? (
              <span className="dashboard-access-group__icon" aria-hidden="true">
                <Icon
                  size={20}
                  strokeWidth={2.2}
                  color="var(--norte-orange)"
                  fill="none"
                />
              </span>
            ) : null}

            <div className="dashboard-access-group__heading">
              <h2 className="portal-card__title dashboard-access-group__title">
                {group.name}
              </h2>

              {group.description ? (
                <p className="portal-card__subtitle dashboard-access-group__subtitle">
                  {group.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="portal-card__body dashboard-access-group__body">
        <div className="quick-grid dashboard-access-group__grid">
          {group.items.map((item) => (
            <QuickAccessCard
              key={item.id}
              title={item.name}
              description={item.description}
              path={item.path}
              icon={item.icon}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function InternalNewsPanel() {
  const [selectedSegment, setSelectedSegment] = useState('general')

  const visibleNews = useMemo(() => {
    const filteredNews = INTERNAL_NEWS.filter(
      (news) => news.segment === selectedSegment,
    )

    return filteredNews.length > 0 ? filteredNews : INTERNAL_NEWS.slice(0, 3)
  }, [selectedSegment])

  return (
    <section className="portal-card dashboard-news-panel">
      <header className="portal-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h2 className="portal-card__title">Noticias internas</h2>
            <p className="portal-card__subtitle">
              Información segmentada para seguimiento interno.
            </p>
          </div>

          <div className="portal-card__actions">
            <button type="button" className="portal-action-button">
              Ver todas
            </button>
          </div>
        </div>
      </header>

      <div className="portal-card__body">
        <div className="dashboard-news-tabs" role="tablist">
          {NEWS_SEGMENTS.map((segment) => (
            <button
              type="button"
              key={segment.id}
              className={[
                'portal-action-button',
                selectedSegment === segment.id
                  ? 'portal-action-button--primary'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedSegment(segment.id)}
            >
              {segment.label}
            </button>
          ))}
        </div>

        <div className="quick-grid dashboard-news-grid">
          {visibleNews.slice(0, 3).map((news) => (
            <article className="quick-card dashboard-news-card" key={news.id}>
              <div className="quick-card__content">
                <div className="dashboard-news-card__meta">
                  <span>{news.date}</span>
                  <span>{news.segmentLabel}</span>
                </div>

                <h3>{news.title}</h3>
                <p>{news.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Dashboard() {
  const user = getCurrentUser()
  const visibleModules = getMenuModules(user?.role)
  const dashboardGroups = buildDashboardGroups(visibleModules)

  return (
    <ModulePage
      title={`Hola, ${user?.name || 'Usuario'}`}
      description="Selecciona un módulo para continuar."
    >
      <div className="dashboard-page-stack">
        {dashboardGroups.length === 0 ? (
          <div className="portal-feedback">
            No hay módulos disponibles para este usuario.
          </div>
        ) : (
          <div className="dashboard-segments-grid">
            {dashboardGroups.map((group) => (
              <DashboardAccessGroup key={group.id} group={group} />
            ))}
          </div>
        )}

        <InternalNewsPanel />
      </div>
    </ModulePage>
  )
}

export default Dashboard
