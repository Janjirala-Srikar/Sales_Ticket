import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiZendesk, SiIntercom, SiSalesforce, SiHubspot, SiSlack } from 'react-icons/si';
import './HeroSection.css';

const INTEGRATION_ICONS = [
  { name: 'Zendesk', Icon: SiZendesk, color: '#03363d' },
  { name: 'Intercom', Icon: SiIntercom, color: '#1f8ded' },
  { name: 'Salesforce', Icon: SiSalesforce, color: '#00a1e0' },
  { name: 'HubSpot', Icon: SiHubspot, color: '#ff7a59' },
  { name: 'Slack', Icon: SiSlack, color: '#4a154b' },
];

const TICKER_ITEMS = [
  { color: 'dot-green', text: 'Acme Corp - "we\'re planning to hire 40 people this quarter" -> Expansion signal - $24k ARR' },
  { color: 'dot-red',   text: 'Northstar Inc - "seriously considering switching to a competitor" -> Churn risk - $18k ARR' },
  { color: 'dot-blue',  text: 'Vertex Labs - "we evaluated Notion but came back for one reason" -> Competitor mention' },
  { color: 'dot-amber', text: 'Riverbend Co - "this missing feature is why we haven\'t upgraded" -> Feature gap - $8k blocked' },
  { color: 'dot-green', text: 'Cascade Media - "our team has grown 3x, we need more seats" -> Expansion signal - $36k ARR' },
  { color: 'dot-red',   text: 'Summit Group - "if this isn\'t fixed by end of month we\'re cancelling" -> Churn risk - $12k ARR' },
];

function DashboardPreview() {
  return (
    <div className="hero-dashboard-frame">
      <div className="dashboard-bar">
        <span className="db-dot" style={{ background: '#EF4444' }} />
        <span className="db-dot" style={{ background: '#F59E0B' }} />
        <span className="db-dot" style={{ background: '#10B981' }} />
        <span style={{ flex: 1, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
          ticketsignal - revenue-signals
        </span>
      </div>
      <div className="dashboard-inner">
        <div className="db-card">
          <div className="db-card-label">Signals Today</div>
          <div className="db-card-val">47</div>
          <div className="db-card-sub">+12 from yesterday</div>
          <div className="db-card-tag tag-green">^ 34%</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Revenue at Risk</div>
          <div className="db-card-val">$82k</div>
          <div className="db-card-sub">5 accounts flagged</div>
          <div className="db-card-tag tag-red">Churn risk</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Expansion Pipeline</div>
          <div className="db-card-val">$214k</div>
          <div className="db-card-sub">11 opportunities</div>
          <div className="db-card-tag tag-blue">Active</div>
        </div>
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
  const navigate = useNavigate();
  const [ctaEmail, setCtaEmail] = useState('');

  const handleCtaSubmit = (e) => {
    e.preventDefault();
    navigate('/register', { state: { prefillEmail: ctaEmail } });
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-pill">
          <div className="nav-logo">TicketSignal</div>
          <div className="nav-links">
            <Link to="/#how"     className="nav-link">How it works</Link>
            <Link to="/#signals" className="nav-link">Signals</Link>
            <Link to="/#teams"   className="nav-link">Teams</Link>
          </div>
          <div className="nav-auth">
            <Link to="/login" className="nav-register">Login / Register</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          Revenue Intelligence Platform
        </div>
        <h1>Turn every support ticket into <em>revenue intelligence.</em></h1>
        <p className="hero-sub">
          Capture churn risks, expansion signals, and competitor mentions straight from support threads, then route each to the owner in seconds.
        </p>
        <div className="hero-actions">
          <form className="hero-email-pill" onSubmit={handleCtaSubmit}>
            <input
              type="email"
              placeholder="Enter your work email"
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
              required
            />
            <button type="submit" className="hero-cta-btn">
              Get Access
            </button>
          </form>
        </div>

        <div className="hero-dashboard-wrap w-full" style={{ maxWidth: 1000 }}>
          <DashboardPreview />
        </div>
      </section>

      <div className="logo-strip-wrap">
        <p className="logo-strip-label">Works seamlessly with</p>
        <div className="logo-strip">
          {INTEGRATION_ICONS.map(({ name, Icon, color }) => (
            <span key={name} className="logo-badge" aria-label={name} title={name}>
              <Icon className="logo-icon" style={{ color }} />
              <span className="logo-name" style={{ color }}>{name}</span>
            </span>
          ))}
        </div>
        <div className="logo-strip-fade" />
      </div>

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
