import './AlertSection.css';

export default function AlertSection() {
  return (
    <section className="section alert-section">
      <div className="section-label">The Output</div>
      <div className="alert-layout">
        {/* Slack mockup */}
        <div className="slack-mockup">
          <div className="slack-header">
            <span className="slack-channel">#</span>
            revenue-signals
          </div>
          <div className="slack-body">
            <div className="slack-msg">
              <div className="slack-avatar">TS</div>
              <div style={{ flex: 1 }}>
                <div>
                  <span className="slack-name">TicketSignal</span>
                  <span className="slack-time">Today at 2:14 PM</span>
                </div>
                <div className="slack-text">
                  🔔 <strong>Expansion signal detected</strong> — Acme Corp (@sarah.chen your account)
                </div>
                <div className="slack-attachment">
                  <div className="attach-title">Acme Corp — Expansion Opportunity</div>
                  <div className="attach-body">
                    Customer mentioned hiring ~40 people over the next two quarters and expects to need a larger plan.
                    Current plan: Growth (8 seats). Renewal in 47 days.
                  </div>
                  <div className="attach-fields">
                    <div className="attach-field"><label>Current ACV</label><span>$14,400</span></div>
                    <div className="attach-field"><label>Potential ACV</label><span>~$54,000</span></div>
                    <div className="attach-field"><label>Last AE Touch</label><span>38 days ago</span></div>
                    <div className="attach-field"><label>Urgency Score</label><span>9.1 / 10</span></div>
                  </div>
                  <div className="slack-actions">
                    <button className="slack-btn primary">Draft Outreach Email</button>
                    <button className="slack-btn">View Account</button>
                    <button className="slack-btn">Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="alert-copy">
          <h3>The right person, at the right moment, with the right context.</h3>
          <p>
            Signals don't go to a dashboard nobody checks. They land in Slack — where your team already lives —
            with everything needed to act immediately.
          </p>
          <ul className="feature-list">
            {[
              'Real-time alerts routed to the responsible AE or CSM',
              'Full account context pulled from your CRM automatically',
              'Urgency and revenue impact scoring per signal',
              'One-click personalised outreach email or call script',
              'Complete account signal history — every interaction, one view',
            ].map(f => (
              <li key={f}><span className="feature-arrow">→</span>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
