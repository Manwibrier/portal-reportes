function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeSegments(segments = []) {
  const normalized = Array.isArray(segments)
    ? segments
        .map((segment) => normalizeText(segment).toUpperCase())
        .filter(Boolean)
    : []

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : ['HOGAR', 'JURIDICO', 'GOBIERNO']
}

function formatSegmentLabel(value) {
  const normalized = normalizeText(value).toUpperCase()

  if (normalized === 'JURIDICO') return 'Jurídico'
  if (normalized === 'HOGAR') return 'Hogar'
  if (normalized === 'GOBIERNO') return 'Gobierno'

  return normalized || 'Segmento'
}

function GerenciaSegmentTabs({
  segments = [],
  activeSegment = 'HOGAR',
  onChange,
}) {
  const safeSegments = normalizeSegments(segments)
  const currentSegment = normalizeText(activeSegment, 'HOGAR').toUpperCase()

  return (
    <section className="portal-insights-section">
      <header className="portal-insights-header">
        <h2 className="portal-insights-title">Corte ejecutivo por segmento</h2>
        <p className="portal-insights-subtitle">
          Alcance inicial controlado: Hogar, Jurídico y Gobierno.
        </p>
      </header>

      <div className="portal-card">
        <div className="portal-card__body">
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {safeSegments.map((segment) => {
              const isActive = currentSegment === segment

              return (
                <button
                  key={segment}
                  type="button"
                  onClick={() => onChange?.(segment)}
                  className={
                    isActive
                      ? 'portal-filter-action portal-filter-action--primary'
                      : 'portal-filter-action'
                  }
                  aria-pressed={isActive}
                >
                  <span>{formatSegmentLabel(segment)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default GerenciaSegmentTabs
