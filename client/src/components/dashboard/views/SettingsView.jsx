import React from 'react';

export default function SettingsView() {
  return (
    <div className="content-card">
      <h2>Settings</h2>
      <p>Adjust preferences for notifications, data sources, and workspace defaults.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>Notification cadence and channels</li>
        <li>Connected integrations (CRM, support, product analytics)</li>
        <li>Workspace defaults for playbooks and digest timing</li>
      </ul>
    </div>
  );
}
