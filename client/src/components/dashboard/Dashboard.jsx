import { useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { DASH_LINKS, SETTINGS_LINK } from './navItems';
import AccountHealthView from './views/AccountHealthView';
import SignalsFeedView from './views/SignalsFeedView';
import AccountMemoryView from './views/AccountMemoryView';
import PlaybooksView from './views/PlaybooksView';
import AskIntelView from './views/AskIntelView';
import DigestView from './views/DigestView';
import VoiceView from './views/VoiceView';
import SettingsView from './views/SettingsView';
import './Dashboard.css';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const activeLink = useMemo(
    () => {
      const all = [...DASH_LINKS, SETTINGS_LINK];
      return all.find((link) => location.pathname.startsWith(link.path)) || DASH_LINKS[0];
    },
    [location.pathname]
  );

  return (
    <div className="dash-shell">
      <div className="dash-app">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />

        <div className="dash-content">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="dash-main">
            {/* <header className="dash-bar">
              <div>
                <p className="dash-kicker">TicketSignal</p>
                <h1>{activeLink?.label}</h1>
              </div>
            </header> */}

            <Routes>
              <Route index element={<Navigate to="health" replace />} />
              <Route path="health" element={<AccountHealthView />} />
              <Route path="signals" element={<SignalsFeedView />} />
              <Route path="memory" element={<AccountMemoryView />} />
              <Route path="playbooks" element={<PlaybooksView />} />
              <Route path="ask-intel" element={<AskIntelView />} />
              <Route path="digest" element={<DigestView />} />
              <Route path="voice" element={<VoiceView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="health" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
