import React from 'react';

export default function VoiceView() {
  return (
    <div className="content-card">
      <h2>Voice of customer reporting</h2>
      <p>Aggregate themes from feedback, tickets, and interviews to prioritize roadmap and enablement.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>Theme clustering with volume and severity</li>
        <li>Product gaps highlighted with revenue at risk</li>
        <li>Sharable reports with charts and excerpts</li>
      </ul>
    </div>
  );
}
