// src/components/QuickAccessCard.jsx

import { Link } from 'react-router-dom'

function buildClassName(...classes) {
  return classes.filter(Boolean).join(' ')
}

function QuickAccessCard({
  title,
  description = '',
  path = '',
  icon: Icon,
  className = '',
  badge = '',
  meta = '',
  disabled = false,
  ariaLabel = '',
}) {
  const safeTitle = title || 'Módulo'
  const safePath = path || '#'
  const hasDescription = Boolean(description)
  const hasBadge = Boolean(badge)
  const hasMeta = Boolean(meta)

  function handleClick(event) {
    if (disabled || !path) {
      event.preventDefault()
    }
  }

  return (
    <Link
      to={safePath}
      className={buildClassName(
        'quick-card',
        hasDescription ? 'quick-card--with-description' : '',
        disabled ? 'quick-card--disabled' : '',
        className,
      )}
      aria-label={ariaLabel || `Abrir ${safeTitle}`}
      aria-disabled={disabled || !path}
      onClick={handleClick}
    >
      {Icon ? (
        <div className="quick-card__icon" aria-hidden="true">
          <Icon
            size={28}
            strokeWidth={2.2}
            color="var(--norte-orange)"
            fill="none"
          />
        </div>
      ) : null}

      <div className="quick-card__content">
        <div className="quick-card__header">
          <h3 className="quick-card__title">{safeTitle}</h3>

          {hasBadge ? (
            <span className="quick-card__badge">{badge}</span>
          ) : null}
        </div>

        {hasDescription ? (
          <p className="quick-card__description">{description}</p>
        ) : null}

        {hasMeta ? (
          <span className="quick-card__meta">{meta}</span>
        ) : null}
      </div>
    </Link>
  )
}

export default QuickAccessCard