import './ProblemSection.css';

const PROBLEM_VIDEO_URL = 'https://files.catbox.moe/moa24l.mp4';

const TICKETS = [
  {
    id: '#TKT-4821',
    company: 'Acme Corp',
    age: '2 min ago',
    pill: 'pill-expansion',
    pillLabel: 'Expansion',
    text: (
      <>
        Hey, we <mark>plan to hire around 40 people</mark> over the next two quarters and I think
        we are going to need a bigger plan. Can you tell me what options we have?
      </>
    ),
  },
  {
    id: '#TKT-4819',
    company: 'Summit Group',
    age: '18 min ago',
    pill: 'pill-churn',
    pillLabel: 'Churn Risk',
    text: (
      <>
        Honestly at this point <mark>we are evaluating alternatives</mark>. The response times have
        been really frustrating and I do not think this is working for our team anymore.
      </>
    ),
  },
  {
    id: '#TKT-4815',
    company: 'Riverbend Co',
    age: '41 min ago',
    pill: 'pill-feature',
    pillLabel: 'Feature Gap',
    text: (
      <>
        The <mark>missing API webhook support is the one thing blocking us</mark> from upgrading to
        Enterprise. We have been asking for this for 6 months.
      </>
    ),
  },
];

export default function ProblemSection() {
  return (
    <section className="section problem-section">
      <div className="section-label">The Problem</div>
      <h2>
        The gap that costs you
        <br />
        money every week
      </h2>
      <p className="problem-intro mt-3 text-sm">
        Customers send their most honest, unfiltered signals through support tickets. The people
        who read them cannot act on them. The people who could act on them never see them.
      </p>

      <div className="gap-grid">
        <div className="gap-left">
          <div className="gap-col-label">What the support agent reads</div>

          {TICKETS.map((ticket) => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-meta">
                <span>
                  {ticket.id} - {ticket.company}
                </span>
                <span>{ticket.age}</span>
              </div>
              <span className={`signal-pill ${ticket.pill}`}>{ticket.pillLabel}</span>
              <p className="ticket-text">{ticket.text}</p>
            </div>
          ))}
        </div>

        <div className="gap-right">
          <div className="gap-video-shell">
            <video
              className="gap-video"
              src={PROBLEM_VIDEO_URL}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
