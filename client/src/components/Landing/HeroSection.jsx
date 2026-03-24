import './HeroSection.css';

const INTEGRATIONS = ['Zendesk', 'Intercom', 'Freshdesk', 'Salesforce', 'HubSpot', 'Slack'];

const TICKER_ITEMS = [
  { color: 'dot-green', text: 'Acme Corp · "we\'re planning to hire 40 people this quarter" → Expansion signal · $24k ARR' },
  { color: 'dot-red',   text: 'Northstar Inc · "seriously considering switching to a competitor" → Churn risk · $18k ARR' },
  { color: 'dot-blue',  text: 'Vertex Labs · "we evaluated Notion but came back for one reason" → Competitor mention' },
  { color: 'dot-amber', text: 'Riverbend Co · "this missing feature is why we haven\'t upgraded" → Feature gap · $8k blocked' },
  { color: 'dot-green', text: 'Cascade Media · "our team has grown 3x, we need more seats" → Expansion signal · $36k ARR' },
  { color: 'dot-red',   text: 'Summit Group · "if this isn\'t fixed by end of month we\'re cancelling" → Churn risk · $12k ARR' },
];

function DashboardPreview() {
  return (
    <div className="hero-dashboard-frame">
      <div className="dashboard-bar">
        <span className="db-dot" style={{ background: '#EF4444' }} />
        <span className="db-dot" style={{ background: '#F59E0B' }} />
        <span className="db-dot" style={{ background: '#10B981' }} />
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
          ticketsignal · revenue-signals
        </span>
      </div>
      <div className="dashboard-inner">
        {/* Card 1 */}
        <div className="db-card">
          <div className="db-card-label">Signals Today</div>
          <div className="db-card-val">47</div>
          <div className="db-card-sub">+12 from yesterday</div>
          <div className="db-card-tag tag-green">↑ 34%</div>
        </div>
        {/* Card 2 */}
        <div className="db-card">
          <div className="db-card-label">Revenue at Risk</div>
          <div className="db-card-val">$82k</div>
          <div className="db-card-sub">5 accounts flagged</div>
          <div className="db-card-tag tag-red">Churn risk</div>
        </div>
        {/* Card 3 */}
        <div className="db-card">
          <div className="db-card-label">Expansion Pipeline</div>
          <div className="db-card-val">$214k</div>
          <div className="db-card-sub">11 opportunities</div>
          <div className="db-card-tag tag-blue">Active</div>
        </div>
        {/* Wide card */}
        <div className="db-card db-wide">
          <div className="db-card-label">Recent Signals</div>
          <div className="db-row">
            {[
              { name: 'Acme Corp', tag: 'Expansion', val: '$54k potential', tagCls: 'tag-green' },
              { name: 'Summit Group', tag: 'Churn', val: '$18k at risk', tagCls: 'tag-red' },
              { name: 'Riverbend Co', tag: 'Feature Gap', val: '$8k blocked', tagCls: 'tag-amber' },
            ].map(r => (
              <div className="db-row-item" key={r.name}>
                <span className="db-row-item-name">{r.name}</span>
                <span className={`db-card-tag ${r.tagCls}`} style={{ margin: 0, fontSize: 10 }}>{r.tag}</span>
                <span className="db-row-item-val">{r.val}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Card 5 */}
        <div className="db-card">
          <div className="db-card-label">Feature Requests</div>
          <div className="db-card-val">23</div>
          <div className="db-card-sub">Across 14 accounts</div>
          <div className="db-card-tag tag-amber">This week</div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">TicketSignal</div>
        <div className="flex items-center gap-8">
          <a href="#how"     className="nav-link">How it works</a>
          <a href="#signals" className="nav-link">Signals</a>
          <a href="#teams"   className="nav-link">Teams</a>
          <a href="#cta"     className="nav-link nav-cta ml-4">Request Access</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          Revenue Intelligence Platform
        </div>
        <h1>Your customers are telling you<br /><em>everything.</em><br />Nobody's listening.</h1>
        <p className="hero-sub">
          Every support ticket is a business signal — expansion, churn risk, competitive threat.
          TicketSignal reads them all and routes the insight to the person who can act on it, in real time.
        </p>
        <div className="hero-actions">
          <a href="#cta" className="btn-primary">Request Early Access</a>
          <a href="#how" className="btn-ghost">
            See how it works <span className="btn-ghost-arrow">→</span>
          </a>
        </div>

        {/* Dashboard */}
        <div className="hero-dashboard-wrap w-full" style={{ maxWidth: 1000 }}>
          <DashboardPreview />
        </div>
      </section>

      {/* LOGO STRIP */}
      <div className="logo-strip-wrap">
        <p className="logo-strip-label">Works seamlessly with</p>
        <div className="logo-strip">
          {INTEGRATIONS.map(name => (
            <span key={name} className="logo-badge">{name}</span>
          ))}
        </div>
        <div className="logo-strip-fade" />
      </div>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className={`ticker-dot ${item.color}`} />
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
