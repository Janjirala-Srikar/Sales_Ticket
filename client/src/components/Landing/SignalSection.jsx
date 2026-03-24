import './SignalSection.css';

const SIGNALS = [
  { pill: 'pill-expansion', pillLabel: 'Expansion',        num: '01', title: 'Growth Signals',      example: '"We\'re onboarding 3 new teams next month and I think we\'ll need additional seats."', exampleClass: 'example-expansion', desc: 'Customers who mention hiring, growing teams, adding use cases, or hitting limits on their current plan — teed up for an upgrade conversation before they even think to ask.' },
  { pill: 'pill-churn',     pillLabel: 'Churn Risk',       num: '02', title: 'Churn Risk',           example: '"I\'m not sure this is the right tool for us anymore. Our team keeps complaining about the same issues."', exampleClass: 'example-churn', desc: 'Dissatisfied customers, long-running frustrations, threats to cancel — detected the moment they land in a ticket so CS can intervene before it\'s too late.' },
  { pill: 'pill-competitor',pillLabel: 'Competitor',       num: '03', title: 'Competitive Intel',    example: '"We tried Linear briefly but our workflows didn\'t map to it. We\'re back but still on the fence."', exampleClass: 'example-competitor', desc: 'Any mention of a competitor — evaluating, comparing, switching to, or coming back from — captured and logged for your sales and product teams automatically.' },
  { pill: 'pill-feature',   pillLabel: 'Feature Gap',      num: '04', title: 'Blocked Revenue',      example: '"The bulk export feature would be the one thing that gets us onto the Enterprise plan immediately."', exampleClass: 'example-feature', desc: 'When a customer names a missing feature as the reason they haven\'t upgraded, that\'s not a support ticket — it\'s a prioritised input for your product roadmap.' },
];

export default function SignalSection() {
  return (
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
  );
}
