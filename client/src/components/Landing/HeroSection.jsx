import { useEffect, useState } from 'react';
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

const ROTATING_HEADLINE_TEXTS = [
  'revenue intelligence.',
  'churn risk alerts.',
  'expansion signals.',
  'competitor insights.',
];

function RotatingText({ texts, rotationInterval = 2500 }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentText = texts[activeIndex] ?? '';

  useEffect(() => {
    if (texts.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, rotationInterval);

    return () => window.clearInterval(intervalId);
  }, [texts, rotationInterval]);

  return (
    <span className="hero-rotating-shell" aria-live="polite" aria-atomic="true">
      <span className="hero-rotating-a11y">{currentText}</span>
      <span key={currentText} className="hero-rotating-word" aria-hidden="true">
        {currentText.split('').map((char, charIndex) => (
          <span
            key={`${currentText}-${charIndex}`}
            className={`hero-rotating-char${char === ' ' ? ' is-space' : ''}`}
            style={{ '--char-index': charIndex }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    </span>
  );
}

function DashboardPreview() {
  const handleFrameMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--frame-cursor-x', `${Math.max(0, Math.min(100, x))}%`);
    event.currentTarget.style.setProperty('--frame-cursor-y', `${Math.max(0, Math.min(100, y))}%`);
  };

  const handleFrameMouseLeave = (event) => {
    event.currentTarget.style.setProperty('--frame-cursor-x', '50%');
    event.currentTarget.style.setProperty('--frame-cursor-y', '50%');
  };

  return (
    <div
      className="hero-dashboard-frame"
      onMouseMove={handleFrameMouseMove}
      onMouseLeave={handleFrameMouseLeave}
    >
      <div className="dashboard-bar">
        <div className="db-window-controls" aria-label="window controls">
          <button type="button" className="db-dot db-dot-red" aria-label="Close" />
          <button type="button" className="db-dot db-dot-amber" aria-label="Minimize" />
          <button type="button" className="db-dot db-dot-green" aria-label="Maximize" />
        </div>
        <span className="db-bar-title">
          ticketsignal - revenue-signals
        </span>
        <span className="db-live-pill">
          <span className="db-live-dot" />
          Live
        </span>
      </div>
      <div className="dashboard-inner">
        <div className="db-card">
          <div className="db-card-label">Signals Today</div>
          <div className="db-card-val">47</div>
          <div className="db-card-sub">+12 from yesterday</div>
          <div className="db-card-tag tag-green">^ 34%</div>
          <div className="db-card-meter" style={{ '--fill': '72%' }} />
        </div>
        <div className="db-card">
          <div className="db-card-label">Revenue at Risk</div>
          <div className="db-card-val">$82k</div>
          <div className="db-card-sub">5 accounts flagged</div>
          <div className="db-card-tag tag-red">Churn risk</div>
          <div className="db-card-meter" style={{ '--fill': '45%' }} />
        </div>
        <div className="db-card">
          <div className="db-card-label">Expansion Pipeline</div>
          <div className="db-card-val">$214k</div>
          <div className="db-card-sub">11 opportunities</div>
          <div className="db-card-tag tag-blue">Active</div>
          <div className="db-card-meter" style={{ '--fill': '84%' }} />
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
          <div className="db-sparkline" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Feature Requests</div>
          <div className="db-card-val">23</div>
          <div className="db-card-sub">Across 14 accounts</div>
          <div className="db-card-tag tag-amber">This week</div>
          <div className="db-card-meter" style={{ '--fill': '61%' }} />
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const navigate = useNavigate();
  const [ctaEmail, setCtaEmail] = useState('');

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

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
            <button type="button" className="nav-link nav-link-btn" onClick={() => scrollToSection('how')}>
              How it works
            </button>
            <button type="button" className="nav-link nav-link-btn" onClick={() => scrollToSection('features')}>
              Features
            </button>
            <button type="button" className="nav-link nav-link-btn" onClick={() => scrollToSection('pricing')}>
              Pricing
            </button>
          </div>
          <div className="nav-auth">
            <Link to="/login" className="nav-register">Login / Register</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-aurora" />
        <div className="hero-glow" />

        <h1 className="hero-title">
          <span className="hero-title-static">Turn every support ticket into</span>
          <span className="hero-title-dynamic">
            <RotatingText texts={ROTATING_HEADLINE_TEXTS} />
          </span>
        </h1>
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
