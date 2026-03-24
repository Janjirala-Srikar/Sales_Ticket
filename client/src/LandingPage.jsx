import './LandingPage.css';

/* ─── Data ─────────────────────────────────────────── */
const TICKER_ITEMS = [
  { color: 'dot-green', text: 'Acme Corp · "we\'re planning to hire 40 people this quarter" → Expansion signal · $24k ARR' },
  { color: 'dot-red',   text: 'Northstar Inc · "seriously considering switching to a competitor" → Churn risk · $18k ARR' },
  { color: 'dot-blue',  text: 'Vertex Labs · "we evaluated Notion but came back for one reason" → Competitor mention' },
  { color: 'dot-amber', text: 'Riverbend Co · "this missing feature is why we haven\'t upgraded" → Feature gap · $8k blocked' },
  { color: 'dot-green', text: 'Cascade Media · "our team has grown 3x, we need more seats" → Expansion signal · $36k ARR' },
  { color: 'dot-red',   text: 'Summit Group · "if this isn\'t fixed by end of month we\'re cancelling" → Churn risk · $12k ARR' },
];

const INTEGRATIONS = ['Zendesk', 'Intercom', 'Freshdesk', 'Salesforce', 'HubSpot', 'Slack'];

const TICKETS = [
  {
    id: '#TKT-4821', company: 'Acme Corp', age: '2 min ago', pill: 'pill-expansion', pillLabel: 'Expansion',
    text: <>Hey, we <mark>plan to hire around 40 people</mark> over the next two quarters and I think we're going to need a bigger plan. Can you tell me what options we have?</>,
  },
  {
    id: '#TKT-4819', company: 'Summit Group', age: '18 min ago', pill: 'pill-churn', pillLabel: 'Churn Risk',
    text: <>Honestly at this point <mark>we're evaluating alternatives</mark>. The response times have been really frustrating and I don't think this is working for our team anymore.</>,
  },
  {
    id: '#TKT-4815', company: 'Riverbend Co', age: '41 min ago', pill: 'pill-feature', pillLabel: 'Feature Gap',
    text: <>The <mark>missing API webhook support is the one thing blocking us</mark> from upgrading to Enterprise. We've been asking for this for 6 months.</>,
  },
];

const SIGNALS = [
  { pill: 'pill-expansion', pillLabel: 'Expansion',        num: '01', title: 'Growth Signals',      example: '"We\'re onboarding 3 new teams next month and I think we\'ll need additional seats."', exampleClass: 'example-expansion', desc: 'Customers who mention hiring, growing teams, adding use cases, or hitting limits on their current plan — teed up for an upgrade conversation before they even think to ask.' },
  { pill: 'pill-churn',     pillLabel: 'Churn Risk',       num: '02', title: 'Churn Risk',           example: '"I\'m not sure this is the right tool for us anymore. Our team keeps complaining about the same issues."', exampleClass: 'example-churn', desc: 'Dissatisfied customers, long-running frustrations, threats to cancel — detected the moment they land in a ticket so CS can intervene before it\'s too late.' },
  { pill: 'pill-competitor',pillLabel: 'Competitor',       num: '03', title: 'Competitive Intel',    example: '"We tried Linear briefly but our workflows didn\'t map to it. We\'re back but still on the fence."', exampleClass: 'example-competitor', desc: 'Any mention of a competitor — evaluating, comparing, switching to, or coming back from — captured and logged for your sales and product teams automatically.' },
  { pill: 'pill-feature',   pillLabel: 'Feature Gap',      num: '04', title: 'Blocked Revenue',      example: '"The bulk export feature would be the one thing that gets us onto the Enterprise plan immediately."', exampleClass: 'example-feature', desc: 'When a customer names a missing feature as the reason they haven\'t upgraded, that\'s not a support ticket — it\'s a prioritised input for your product roadmap.' },
];

const FLOW = [
  { num: '01', title: 'Ticket Arrives',        desc: 'A customer submits a support ticket through Zendesk, Intercom, or Freshdesk. Nothing changes for your support team.' },
  { num: '02', title: 'AI Reads & Classifies', desc: 'Our LLM instantly reads the ticket and identifies expansion, churn, competitor, or feature-gap signals with full context.' },
  { num: '03', title: 'CRM Context Pulled',    desc: 'The account\'s plan, renewal date, ACV, last touch, and ticket history are enriched automatically from your CRM.' },
  { num: '04', title: 'Routed & Scored',        desc: 'The signal is scored by urgency and revenue impact, then routed to the right person — AE, CSM, or PM — in Slack.' },
  { num: '05', title: 'Draft Action Ready',     desc: 'A suggested next action and a one-click personalised email or call script is included, based on what the customer actually said.' },
];

const ROLES = [
  {
    role: 'Account Executives', title: 'Never miss an expansion window again',
    desc: 'Expansion opportunities surface before the customer even thinks to request a plan change. You get a personalised email draft and full account context — ready to send in minutes.',
    benefits: ['Real-time expansion & churn alerts per account', 'AI-drafted personalised outreach', 'Full commercial history in one view', 'Renewal risk visibility 60+ days out'],
  },
  {
    role: 'Customer Success', title: 'Intervene before it becomes a cancellation',
    desc: 'A live health score for every account updates in real time as tickets arrive. Automatic alerts when churn-risk signals cross a threshold — so you\'re never the last to know.',
    benefits: ['Live account health scores from ticket signals', 'Churn risk alerts before the cancellation email', 'Silence detection — flagged when accounts go quiet', 'Full ticket sentiment timeline per account'],
  },
  {
    role: 'Product Management', title: 'A roadmap input ranked by blocked revenue',
    desc: 'Every feature request across all accounts, aggregated weekly and ranked by how much revenue is blocked by each missing capability. Your backlog, now justified by dollars.',
    benefits: ['Weekly feature-gap digest across all accounts', 'Revenue impact score per missing capability', 'Competitive intelligence from real customer tickets', 'Trend tracking — rising vs. fading requests'],
  },
];

/* ─── Sub-components ─────────────────────────────────── */
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

/* ─── Main component ─────────────────────────────────── */
export default function LandingPage() {
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

      {/* GAP SECTION */}
      <section className="section">
        <div className="section-label">The Problem</div>
        <h2>The gap that costs you<br />money every week</h2>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-body)', maxWidth: 520 }}>
          Customers send their most honest, unfiltered signals through support tickets.
          The people who read them can't act on them. The people who could act on them never see them.
        </p>
        <div className="gap-grid">
          <div className="gap-left">
            <div className="gap-col-label">What the support agent reads</div>
            {TICKETS.map(t => (
              <div key={t.id} className="ticket-card">
                <div className="ticket-meta">
                  <span>{t.id} · {t.company}</span>
                  <span>{t.age}</span>
                </div>
                <span className={`signal-pill ${t.pill}`}>{t.pillLabel}</span>
                <p className="ticket-text">{t.text}</p>
              </div>
            ))}
          </div>
          <div className="gap-right">
            <div className="dead-zone">
              <div className="dead-zone-icon">◌</div>
              <p className="gap-col-label" style={{ marginBottom: 12 }}>What reaches sales, CS, and product</p>
              <p>Nothing. The ticket gets answered and closed. The signal disappears.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SIGNALS */}
      <section className="section" id="signals" style={{ paddingTop: 0 }}>
        <div className="section-label">Four Signal Types</div>
        <h2>Every ticket carries<br />one of four signals</h2>
        <div className="signals-grid">
          {SIGNALS.map(s => (
            <div key={s.num} className="signal-card">
              <span className={`signal-pill ${s.pill}`}>{s.pillLabel}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className={`signal-example ${s.exampleClass}`}>{s.example}</div>
              <div className="signal-card-num">{s.num}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="flow-section" id="how">
        <div className="section-label">How It Works</div>
        <h2>Silent, automatic,<br />no new tools to adopt</h2>
        <p className="mt-3" style={{ color: 'var(--text-body)', maxWidth: 500, fontSize: 15 }}>
          TicketSignal sits on top of your existing support stack. Your team works exactly as before.
          The intelligence flows automatically to the people who need it.
        </p>
        <div className="flow-steps">
          {FLOW.map(f => (
            <div key={f.num} className="flow-step">
              <div className="step-num">{f.num}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ALERT PREVIEW */}
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
                    🟢 <strong>Expansion signal detected</strong> — Acme Corp (@sarah.chen your account)
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

      {/* ROLES */}
      <section className="roles-section" id="teams">
        <div className="section-label">Built for every revenue team</div>
        <h2>One system.<br />Three teams served.</h2>
        <div className="roles-grid">
          {ROLES.map(r => (
            <div key={r.role} className="role-card">
              <div className="role-title">{r.role}</div>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
              <ul className="role-benefits">
                {r.benefits.map(b => (
                  <li key={b}><span className="benefit-check">✓</span>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-num">$5M–$100M</div>
            <div className="stat-label">ARR range where this gap costs the most — and where enterprise tools don't fit</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">&lt;60 sec</div>
            <div className="stat-label">From ticket received to signal routed to the right person</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">Zero</div>
            <div className="stat-label">Changes required to your support team's existing workflow</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="cta">
        <div className="cta-glow" />
        <h2>Stop letting revenue signals<br />close as support tickets.</h2>
        <p>Join the early access list. We're onboarding a limited cohort of B2B teams to build this together.</p>
        <div className="cta-form">
          <input type="email" placeholder="your@company.com" />
          <a href="#" className="btn-primary">Get Access</a>
        </div>
        <p className="cta-note">Works with Zendesk, Intercom &amp; Freshdesk. Setup in under a day.</p>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">TicketSignal</div>
        <p>© 2025 TicketSignal. Turning support conversations into revenue intelligence.</p>
      </footer>
    </>
  );
}