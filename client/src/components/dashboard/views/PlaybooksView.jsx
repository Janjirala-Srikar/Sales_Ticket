import React from 'react';

export default function PlaybooksView() {
  return (
    <div className="content-card">
      <h2>AI-generated playbooks and drafts</h2>
      <p>Auto-drafted outreach and runbooks tailored to segment, persona, and recent activity.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>Personalized email or call scripts</li>
        <li>Risk mitigation plans with next best actions</li>
        <li>One-click editing to lock tone and brand guardrails</li>
      </ul>
    </div>
  );
}
