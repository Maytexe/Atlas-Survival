import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { messages } from '@/i18n/pt-BR'
import { FirstSyncNotice } from './FirstSyncNotice'
import { PwaUpdateNotice } from './PwaUpdateNotice'
import { StorageNotice } from './StorageNotice'
import { SyncBadge } from './SyncBadge'

const navigation = [
  ['/', messages.dashboard],
  ['/estoque', messages.inventory],
  ['/pessoas', messages.people],
  ['/categorias', messages.categories],
  ['/alertas', messages.alerts],
  ['/sincronizacao', messages.synchronization],
  ['/configuracoes', messages.settings],
  ['/ficha', messages.emergencySheet],
] as const

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="app-shell">
      <button
        className="menu-toggle button button-secondary"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? messages.closeMenu : messages.openMenu}
      </button>
      <aside
        id="primary-navigation"
        className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}
        aria-label={messages.navigationLabel}
      >
        <NavLink className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>{messages.appName}</strong>
            <small>{messages.tagline}</small>
          </span>
        </NavLink>
        <nav className="main-navigation" aria-label={messages.menuDescription}>
          {navigation.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `navigation-link${isActive ? ' navigation-link-active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">{messages.offlineSource}</div>
      </aside>
      {menuOpen && (
        <button
          className="drawer-backdrop"
          type="button"
          aria-label={messages.closeMenu}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <SyncBadge />
        </header>
        <div className="global-notices">
          <FirstSyncNotice />
          <StorageNotice />
          <PwaUpdateNotice />
        </div>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
