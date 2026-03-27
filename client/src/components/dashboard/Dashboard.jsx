import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatbotWidget from './ChatbotWidget';
import AllTickets from './views/AllTickets';
import AccountHealthView from './views/AccountHealthView';
import SignalsFeedView from './views/SignalsFeedView';
import AccountMemoryView from './views/AccountMemoryView';
import PlaybooksView from './views/PlaybooksView';
import AskIntelView from './views/AskIntelView';
import DigestView from './views/DigestView';
import VoiceView from './views/VoiceView';
import SettingsView from './views/SettingsView';
import AddTeamView from './views/AddTeamView';
import EditDetailsView from './views/EditDetailsView';
import './Dashboard.css';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isAskIntelRoute = location.pathname.includes('/dashboard/ask-intel');

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
          <main className="dash-main">
            {!sidebarOpen && (
              <button
                type="button"
                className="dash-mobile-toggle dash-mobile-toggle--floating"
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
                onClick={() => {
                  setSidebarCollapsed(false);
                  setSidebarOpen(true);
                }}
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="5" width="16" height="2" />
                  <rect x="4" y="11" width="16" height="2" />
                  <rect x="4" y="17" width="16" height="2" />
                </svg>
              </button>
            )}
            <div className="mt-3"></div>

            <Routes>
              <Route index element={<Navigate to="all-tickets" replace />} />
              <Route path="all-tickets" element={<AllTickets />} />
              <Route path="health" element={<AccountHealthView />} />
              <Route path="signals" element={<SignalsFeedView />} />
              <Route path="memory" element={<AccountMemoryView />} />
              <Route path="playbooks" element={<PlaybooksView />} />
              <Route path="ask-intel" element={<AskIntelView />} />
              <Route path="digest" element={<DigestView />} />
              <Route path="voice" element={<VoiceView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="settings/add-team" element={<AddTeamView />} />
              <Route path="settings/edit-details" element={<EditDetailsView />} />
              <Route path="*" element={<Navigate to="all-tickets" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      {!isAskIntelRoute && <ChatbotWidget />}
    </div>
  );
}
