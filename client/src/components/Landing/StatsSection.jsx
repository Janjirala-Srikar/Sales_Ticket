import './StatsSection.css';
import CardSwap, { Card } from './CardSwap';

/* ── Icons ── */
const TrendIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="card-icon">
    <path d="M3 19L9 12L13 16L19 8L23 11" stroke="url(#t1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 8H23V13" stroke="url(#t1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="t1" x1="3" y1="8" x2="23" y2="19" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8"/>
        <stop offset="1" stopColor="#7dd3fc"/>
      </linearGradient>
    </defs>
  </svg>
);

const SpeedIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="card-icon">
    <circle cx="13" cy="13" r="10" stroke="url(#s1)" strokeWidth="1.8" fill="none"/>
    <path d="M13 6V8M13 18V20M6 13H8M18 13H20" stroke="url(#s1)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M13 13L17 9" stroke="url(#s1)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="13" cy="13" r="1.5" fill="#a78bfa"/>
    <defs>
      <linearGradient id="s1" x1="3" y1="3" x2="23" y2="23" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a78bfa"/>
        <stop offset="1" stopColor="#c4b5fd"/>
      </linearGradient>
    </defs>
  </svg>
);

const PlugIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="card-icon">
    <rect x="9" y="3" width="3" height="6" rx="1" fill="url(#p1)"/>
    <rect x="14" y="3" width="3" height="6" rx="1" fill="url(#p1)"/>
    <path d="M7 9H19V14C19 17.3 16.3 20 13 20C9.7 20 7 17.3 7 14V9Z" stroke="url(#p1)" strokeWidth="1.8" fill="none"/>
    <line x1="13" y1="20" x2="13" y2="23" stroke="url(#p1)" strokeWidth="1.8" strokeLinecap="round"/>
    <defs>
      <linearGradient id="p1" x1="7" y1="3" x2="19" y2="23" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34d399"/>
        <stop offset="1" stopColor="#6ee7b7"/>
      </linearGradient>
    </defs>
  </svg>
);

/* ── Mini sparkline for card 1 ── */
const Sparkline = () => (
  <svg width="80" height="28" viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline
      points="0,22 13,16 26,18 39,10 52,12 65,5 80,8"
      stroke="url(#sp1)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <defs>
      <linearGradient id="sp1" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" stopOpacity="0.4"/>
        <stop offset="1" stopColor="#38bdf8"/>
      </linearGradient>
    </defs>
  </svg>
);

export default function StatsSection() {
  return (
    <section className="section">
      <div className="stats-section-container">

        {/* ── Left: copy ── */}
        <div className="stats-content-left">
          <p className="stats-eyebrow">Why teams choose</p>
          <h2 className="stats-title">Sales Ticket</h2>
          <p className="stats-subtitle">
            Support tickets are a goldmine of buying signals — upsell readiness,
            churn risk, competitor mentions. We route them straight to your sales team.
          </p>
          <div className="stats-list">
            <div className="stat-item">
              <div className="stat-num">$5M–$100M</div>
              <div className="stat-label">ARR sweet spot — too big for spreadsheets, too small for Gainsight</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">&lt;60 sec</div>
              <div className="stat-label">From ticket received to signal in the CRM with AI-written next action</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">Zero</div>
              <div className="stat-label">Changes to your support team's existing workflow</div>
            </div>
          </div>
        </div>

        {/* ── Right: card swap ── */}
        <div className="stats-content-right">
          <div style={{ height: '600px', position: 'relative' }}>
            <CardSwap
              cardDistance={60}
              verticalDistance={70}
              delay={4500}
              pauseOnHover={true}
              
            >

              {/* Card 1 — Revenue range */}
              <Card className="card-type-1">
                <div className="card-icon-wrapper">
                  <TrendIcon />
                </div>
                <div className="card-stat">$5M–$100M</div>
                <p className="card-description">ARR — the expansion gap</p>
                <p className="card-detail">
                  Enterprise RevOps tools don't fit. Point solutions don't connect.
                  We bridge support signals directly to account expansion workflows.
                </p>
                <div className="card-divider" />
                <div className="card-footer">
                  <span className="badge">Perfect Fit</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkline />
                    <div className="pulse-dot" />
                  </div>
                </div>
              </Card>

              {/* Card 2 — Speed */}
              <Card className="card-type-2">
                <div className="card-icon-wrapper">
                  <SpeedIcon />
                </div>
                <div className="card-stat">&lt;60 sec</div>
                <p className="card-description">Signal-to-CRM latency</p>
                <p className="card-detail">
                  Classifies tickets by type — expansion opportunity, churn risk,
                  feature gap, competitor mention — and pushes an AI-written next
                  action to the account manager instantly.
                </p>
                <div className="card-divider" />
                <div className="card-footer">
                  <span className="badge">Lightning Fast</span>
                  <div className="pulse-dot" />
                </div>
              </Card>

              {/* Card 3 — Zero disruption */}
              <Card className="card-type-3">
                <div className="card-icon-wrapper">
                  <PlugIcon />
                </div>
                <div className="card-stat">Zero</div>
                <p className="card-description">Workflow disruption</p>
                <p className="card-detail">
                  Sits on top of Zendesk, Intercom, or Freshdesk. Your support team
                  keeps working exactly as before — we just listen and route signals
                  to the people who can act on them.
                </p>
                <div className="card-divider" />
                <div className="card-footer">
                  <span className="badge">Plug &amp; Play</span>
                  <div className="pulse-dot" />
                </div>
              </Card>

            </CardSwap>
          </div>
        </div>

      </div>
    </section>
  );
}