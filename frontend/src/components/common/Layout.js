import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, Milk, DollarSign, Package,
  BarChart3, Bell, Settings, LogOut, ChevronLeft,
  ChevronRight, Menu, UserCog, Tag
} from 'lucide-react';
import { useAuthStore, useUIStore } from '../../store';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'agent', 'farmer'] },
  { key: 'farmers', path: '/farmers', icon: Users, roles: ['admin', 'agent'] },
  { key: 'milkEntry', path: '/milk-entry', icon: Milk, roles: ['admin', 'agent'] },
  { key: 'milkPrices', path: '/milk-prices', icon: Tag, roles: ['admin'] },
  { key: 'debt', path: '/debt', icon: DollarSign, roles: ['admin', 'agent', 'farmer'] },
  { key: 'inventory', path: '/inventory', icon: Package, roles: ['admin', 'agent'] },
  { key: 'reports', path: '/reports', icon: BarChart3, roles: ['admin', 'agent'] },
  { key: 'users', path: '/users', icon: UserCog, roles: ['admin'] },
  { key: 'notifications', path: '/notifications', icon: Bell, roles: ['admin', 'agent', 'farmer'] },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleLangChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🐄</div>
          <div>
            <div className="logo-text">DairyPro</div>
            <div className="logo-sub">Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarOpen && <div className="nav-section-label">Main Menu</div>}
          {visibleItems.map(item => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? t(item.key) : undefined}
            >
              <item.icon size={18} />
              <span className="nav-label">{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="nav-item" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={18} />
            <span className="nav-label">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className={`header ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
          <div className="header-left">
            <button className="header-btn" onClick={toggleSidebar}>
              {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
          </div>
          <div className="header-right">
            <select className="lang-select" onChange={handleLangChange} value={i18n.language}>
              <option value="en">🇬🇧 EN</option>
              <option value="te">🇮🇳 TE</option>
              <option value="ta">🇮🇳 TA</option>
            </select>
            <div
              className="user-avatar"
              title={user?.name}
              onClick={() => navigate('/users')}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {user?.name}
            </span>
          </div>
        </header>

        {/* Page */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
