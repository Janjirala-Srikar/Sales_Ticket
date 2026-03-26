import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';

function Header({ sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'User');
  const email = user?.email || '';
  const role = user?.role;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const viewportPadding = 12;
      const left = Math.max(viewportPadding, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding));

      setMenuPos({
        top: rect.bottom + 8,
        left,
      });
    };

    const handlePointerDown = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div>
        <div className="flex items-center justify-between h-16">
          <div className="flex">
            <button
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(event) => {
                event.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>
          </div>

          <div className="relative flex items-center">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full px-2 py-1 transition"
              style={{
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: 'var(--blue-primary)' }}
              >
                {(displayName || 'U')[0]?.toUpperCase()}
              </span>
              <span className="text-sm font-semibold hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </span>
              <svg
                className={`w-4 h-4 transition ${menuOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.127l3.71-3.9a.75.75 0 1 1 1.08 1.04l-4.24 4.46a.75.75 0 0 1-1.08 0l-4.24-4.46a.75.75 0 0 1 .02-1.06Z" />
              </svg>
            </button>

            {menuOpen &&
              createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed w-60 rounded-xl shadow-lg ring-1 ring-black/5"
                  role="menu"
                  style={{
                    top: menuPos.top,
                    left: menuPos.left,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    zIndex: 9999,
                  }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {displayName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {email}
                    </p>
                    {role && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Role: {role}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm"
                    style={{ color: 'var(--error-text)', cursor: 'pointer' }}
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
