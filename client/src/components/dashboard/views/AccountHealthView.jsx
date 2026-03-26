import React from 'react';

export default function AccountHealthView() {
  return (
    <div className="content-card">
      <h2>Account health score</h2>
      <p>Track risk and momentum with a composite score across product usage, sentiment, and revenue signals.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>Usage trends vs prior period</li>
        <li>Support friction and escalation history</li>
        <li>Expansion likelihood based on engagement</li>
      </ul>
    </div>
  );
}
