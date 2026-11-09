import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { messages } from '@/i18n/pt-BR'
import { FirstSyncNotice } from './FirstSyncNotice'
import { PwaUpdateNotice } from './PwaUpdateNotice'
import { StorageNotice } from './StorageNotice'
import { SyncBadge } from './SyncBadge'

const navigation = [
  { to: '/', label: messages.dashboard, Icon: LayoutDashboard },
  { to: '/estoque', label: messages.inventory, Icon: Boxes },
  { to: '/pessoas', label: messages.people, Icon: Users },
  { to: '/categorias', label: messages.categories, Icon: Tags },
  { to: '/alertas', label: messages.alerts, Icon: Bell },
  {
    to: '/sincronizacao',
    label: messages.synchronization,
    Icon: ClipboardList,
  },
  { to: '/configuracoes', label: messages.settings, Icon: Settings },
  { to: '/ficha', label: messages.emergencySheet, Icon: ClipboardList },
] as const

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="app-shell">
      <button
        className="menu-toggle button button-secondary"
        type="button"
        aria-label={menuOpen ? messages.closeMenu : messages.openMenu}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
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
          {navigation.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `navigation-link${isActive ? ' navigation-link-active' : ''}`
              }
            >
              <Icon size={19} aria-hidden="true" />
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
