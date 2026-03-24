import './FlowSection.css';

const FLOW = [
  { num: '01', title: 'Ticket Arrives',        desc: 'A customer submits a support ticket through Zendesk, Intercom, or Freshdesk. Nothing changes for your support team.' },
  { num: '02', title: 'AI Reads & Classifies', desc: 'Our LLM instantly reads the ticket and identifies expansion, churn, competitor, or feature-gap signals with full context.' },
  { num: '03', title: 'CRM Context Pulled',    desc: 'The account\'s plan, renewal date, ACV, last touch, and ticket history are enriched automatically from your CRM.' },
  { num: '04', title: 'Routed & Scored',        desc: 'The signal is scored by urgency and revenue impact, then routed to the right person — AE, CSM, or PM — in Slack.' },
  { num: '05', title: 'Draft Action Ready',     desc: 'A suggested next action and a one-click personalised email or call script is included, based on what the customer actually said.' },
];

export default function FlowSection() {
  return (
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
  );
}
