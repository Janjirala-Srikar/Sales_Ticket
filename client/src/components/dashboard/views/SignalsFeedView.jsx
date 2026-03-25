import React from 'react';

export default function SignalsFeedView() {
  return (
    <div className="content-card">
      <h2>Signals feed</h2>
      <p>Unified stream of positive and negative signals pulled from product events, CRM, and comms.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>New feature adoption and milestone unlocks</li>
        <li>Churn risks triggered by inactivity or errors</li>
        <li>Buying intent signals from stakeholders</li>
      </ul>
    </div>
  );
}
