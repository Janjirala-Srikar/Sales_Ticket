import './ProblemSection.css';

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

export default function ProblemSection() {
  return (
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
  );
}
