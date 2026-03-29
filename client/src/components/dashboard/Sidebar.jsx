import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LuChevronDown, LuLogOut, LuUserCog } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { DASH_LINKS, SETTINGS_GROUP_LINKS, SETTINGS_LINK } from './navItems';
import SidebarLinkGroup from './SidebarLinkGroup';
import './SidebarTheme.css';
import './Dashboard.css';

function formatRoleLabel(value) {
  if (!value) return '';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'User');
  const role = user?.role;
  const roleLabel = formatRoleLabel(role) || 'Root User';
  const isRootUser = !role;
  const settingsActive = location.pathname.startsWith(SETTINGS_LINK.path);

  const handleLogoClick = () => {
    if (collapsed) onToggleCollapse();
  };

  const settingsLinks = isRootUser
    ? SETTINGS_GROUP_LINKS
    : SETTINGS_GROUP_LINKS.filter((item) => item.key !== 'add-team');

  return (
    <div className="min-w-fit">
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 md:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      <div
        id="sidebar"
        className={`sidebar-theme sidebar-theme--white sidebar-slim ${collapsed ? 'sidebar-collapsed' : ''} flex flex-col fixed z-50 left-0 top-0 h-[100dvh] overflow-hidden no-scrollbar w-64 shrink-0 p-4 transition-all duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'} md:static md:translate-x-0`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-8`}>
          <button
            type="button"
            className="flex items-center gap-2 focus:outline-none"
            onClick={handleLogoClick}
            aria-label="Expand sidebar"
            style={{ cursor: 'pointer' }}
          >
            <svg className="fill-violet-500" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
              <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
            </svg>
            {!collapsed && <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>TicketSignal</span>}
          </button>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={onToggleCollapse}
                aria-label="Toggle collapse sidebar"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.3 5.3 9.7 6.7 5.4 11H18v2H5.4l4.3 4.3-1.4 1.4L1.6 12z" />
                </svg>
              </button>
              <button
                className="md:hidden text-gray-500 hover:text-gray-700"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.225 4.811 4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586Z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-scroll">
          <nav className="sidebar-list mt-2">
            {DASH_LINKS.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.Icon size={20} />
                {!collapsed && <span className="sidebar-label">{item.label}</span>}
              </NavLink>
            ))}

            <SidebarLinkGroup activecondition={settingsActive}>
              {(handleClick, open) => (
                <div className="sidebar-group">
                  <button
                    type="button"
                    className={`sidebar-link sidebar-group__toggle ${settingsActive ? 'sidebar-link--active' : ''}`}
                    onClick={handleClick}
                  >
                    <SETTINGS_LINK.Icon size={20} />
                    {!collapsed && (
                      <span className="sidebar-group__content">
                        <span className="sidebar-label">{SETTINGS_LINK.label}</span>
                        <LuChevronDown
                          size={18}
                          className={`sidebar-group__chevron ${open ? 'sidebar-group__chevron--open' : ''}`}
                        />
                      </span>
                    )}
                  </button>

                  {!collapsed && open && (
                    <div className="sidebar-group__links">
                      {settingsLinks.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.path}
                          className={({ isActive }) => `sidebar-sublink ${isActive ? 'sidebar-sublink--active' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.Icon size={16} />
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </SidebarLinkGroup>
          </nav>
        </div>

        <div className="sidebar-bottom sidebar-account">
          <div className="sidebar-account__card">
            <div className="sidebar-account__avatar" title={roleLabel} aria-label={roleLabel}>{(displayName || 'U')[0]?.toUpperCase()}</div>
            {!collapsed && (
              <div className="sidebar-account__meta" title={roleLabel}>
                <div className="sidebar-account__name" title={roleLabel}>{displayName}</div>
                {role && <div className="sidebar-account__role" title={roleLabel}>{roleLabel}</div>}
              </div>
            )}
           
            {!collapsed && (
              <button
                type="button"
                className="sidebar-account__logout"
                onClick={logout}
                aria-label="Logout"
                title="Logout"
              >
                <LuLogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
