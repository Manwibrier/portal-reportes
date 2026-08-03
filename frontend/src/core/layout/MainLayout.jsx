import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './layout.css'
import Sidebar from './Sidebar'
import Header from './Header'
import { logoutCurrentSession } from '../services/auth'

function MainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const location = useLocation()
  const content = children ?? <Outlet />

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logoutCurrentSession()
    } finally {
      window.location.replace('/login')
    }
  }

  return (
    <div className="layout">
      {menuOpen ? (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="layout__content">
        <Header
          menuOpen={menuOpen}
          onMenuClick={() => setMenuOpen((prev) => !prev)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        <main className="main-content">
          {content}
        </main>
      </div>
    </div>
  )
}

export default MainLayout
