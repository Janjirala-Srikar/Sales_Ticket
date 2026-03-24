import './RolesSection.css';

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

export default function RolesSection() {
  return (
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
  );
}
