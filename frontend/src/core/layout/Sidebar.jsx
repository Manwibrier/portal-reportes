import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getMenuModules } from '../routes/modulesRegistry'
import { getCurrentUser } from '../services/auth'
import norteConectaLogo from '../../../Imagenes/NorteConectaLogo-1.png'
import analistaDatosMascot from '../../../Imagenes/Nortico-login-premium.png'

function Sidebar({ onNavigate }) {
  const user = getCurrentUser()
  const location = useLocation()
  const visibleModules = getMenuModules(user?.role)

  return (
    <>
      <div className="sidebar__logo">
        <img
          src={norteConectaLogo}
          alt="Norte"
          className="sidebar__brand-image"
        />
      </div>

      <nav className="sidebar__nav">
        {visibleModules.map((module) => {
          const Icon = module.icon
          const visibleChildren = Array.isArray(module.children)
            ? module.children
            : []

          if (visibleChildren.length > 0) {
            const isGroupActive = visibleChildren.some((child) => {
              return (
                location.pathname === child.path ||
                location.pathname.startsWith(`${child.path}/`)
              )
            })

            return (
              <div
                key={module.id}
                className="sidebar__group"
                aria-current={isGroupActive ? 'page' : undefined}
              >
                <div className="sidebar__group-title">
                  <div className="sidebar__group-label">
                    {Icon ? (
                      <span className="sidebar__icon-wrap">
                        <Icon size={17} strokeWidth={2} />
                      </span>
                    ) : null}
                    <span>{module.name}</span>
                  </div>
                </div>

                <div className="sidebar__subnav">
                  {visibleChildren.map((child) => (
                    <NavLink
                      key={child.id}
                      to={child.path}
                      end
                      onClick={() => onNavigate?.()}
                      className={({ isActive }) =>
                        isActive
                          ? 'sidebar__sublink active'
                          : 'sidebar__sublink'
                      }
                    >
                      <span className="sidebar__sublink-marker">
                        <ChevronRight size={14} strokeWidth={2.1} />
                      </span>
                      <span>{child.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <NavLink
              key={module.id}
              to={module.path}
              end={module.path === '/' || module.path === '/dashboard'}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                isActive ? 'sidebar__link active' : 'sidebar__link'
              }
            >
              <span className="sidebar__link-content">
                {Icon ? (
                  <span className="sidebar__icon-wrap">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                ) : null}
                <span>{module.name}</span>
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar__mascot-panel" aria-hidden="true">
        <img
          src={analistaDatosMascot}
          alt=""
          className="sidebar__mascot-image"
          loading="lazy"
          draggable="false"
        />
      </div>
    </>
  )
}

export default Sidebar

