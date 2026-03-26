import React from 'react';

export default function AccountHealthView() {
  return (
    <div className="content-card">
      <h2>Account health score</h2>
      <p>
        Track risk and momentum with a composite score across product usage, support friction, and revenue signals.
      </p>

      <div className="dash-cards" style={{ marginTop: 18 }}>
        <div className="dash-card">
          <div className="dash-label">Health Score</div>
          <div className="dash-value">82</div>
          <div className="dash-note">Stable overall health with room to improve activation consistency.</div>
        </div>

        <div className="dash-card">
          <div className="dash-label">Risk Drivers</div>
          <div className="dash-note">Support delays, repeated workflow friction, and low feature adoption in one segment.</div>
        </div>

        <div className="dash-card">
          <div className="dash-label">Momentum</div>
          <div className="dash-note">Recent ticket activity suggests mixed sentiment, but no major churn spike right now.</div>
        </div>
      </div>
    </div>
  );
}
