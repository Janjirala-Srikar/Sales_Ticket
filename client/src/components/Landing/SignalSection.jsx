import { useRef } from 'react';
import './SignalSection.css';

const SIGNALS = [
  {
    pill: 'pill-expansion',
    pillLabel: 'Expansion',
    num: '01',
    tone: 'glow-expansion',
    title: 'Growth Momentum',
    desc: 'Hiring, team growth, or seat pressure tells your account team when an upgrade conversation should happen.',
    example: '"We are onboarding three new teams next month and need additional seats."',
    route: 'Route to AE',
    priority: 'High intent',
  },
  {
    pill: 'pill-churn',
    pillLabel: 'Churn Risk',
    num: '02',
    tone: 'glow-churn',
    title: 'Retention Risk',
    desc: 'Recurring frustration and drop-in sentiment gets flagged quickly, so CS can intervene before renewal risk grows.',
    example: '"I am not sure this is the right tool for us anymore. The same issues keep coming up."',
    route: 'Route to CSM',
    priority: 'Urgent follow-up',
  },
  {
    pill: 'pill-competitor',
    pillLabel: 'Competitor',
    num: '03',
    tone: 'glow-competitor',
    title: 'Competitive Intel',
    desc: 'Competitor mentions become structured context your GTM team can use in active deals and expansion motions.',
    example: '"We tried Linear briefly. We are back for now, but still evaluating alternatives."',
    route: 'Route to Sales',
    priority: 'Battlecard trigger',
  },
  {
    pill: 'pill-feature',
    pillLabel: 'Feature Gap',
    num: '04',
    tone: 'glow-feature',
    title: 'Revenue Blocker',
    desc: 'Feature requests tied to spending are prioritized automatically and surfaced as roadmap input with account context.',
    example: '"Bulk export is the one capability that would move us to Enterprise immediately."',
    route: 'Route to Product',
    priority: 'Revenue-linked',
  },
];

export default function SignalSection() {
  const cardsRef = useRef([]);

  const applyPointerState = (clientX, clientY) => {
    cardsRef.current.forEach((card) => {
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      const strength = Math.max(0, 1 - distance / 230);

      card.style.setProperty('--pointer-x', `${x}px`);
      card.style.setProperty('--pointer-y', `${y}px`);
      card.style.setProperty('--glow-strength', strength.toFixed(3));
    });
  };

  const handleSignalsMove = (event) => {
    applyPointerState(event.clientX, event.clientY);
  };

  const handleSignalsLeave = () => {
    cardsRef.current.forEach((card) => {
      if (!card) return;
      card.style.setProperty('--pointer-x', '50%');
      card.style.setProperty('--pointer-y', '50%');
      card.style.setProperty('--glow-strength', '0');
    });
  };

  return (
    <section className="section signal-section" id="signals">
      <div className="signals-head">
        <div className="signals-kicker-row">
          <div className="section-label">Four Signal Types</div>
          <span className="signals-kicker-pill">Auto-detected from tickets</span>
        </div>
        <h2 className="signals-title">
          Every ticket carries
          <br />
          one of four signals
        </h2>
        <p className="signals-subtitle">
          TicketSignal classifies every conversation by business impact, so sales, CS, and product teams can act fast without digging through raw threads.
        </p>
      </div>

      <div className="signals-grid" onMouseMove={handleSignalsMove} onMouseLeave={handleSignalsLeave}>
        {SIGNALS.map((signal, index) => (
          <article
            key={signal.num}
            className={`signal-card ${signal.tone}`}
            ref={(element) => {
              cardsRef.current[index] = element;
            }}
          >
            <div className="signal-card-head">
              <span className={`signal-pill ${signal.pill}`}>{signal.pillLabel}</span>
              <span className="signal-card-num">{signal.num}</span>
            </div>

            <h3>{signal.title}</h3>
            <p className="signal-desc">{signal.desc}</p>

            <div className="signal-example-wrap">
              <div className="signal-example-label">Ticket Excerpt</div>
              <blockquote className="signal-example">{signal.example}</blockquote>
            </div>

            <div className="signal-meta-row">
              <span>{signal.route}</span>
              <span className="signal-meta-dot" />
              <span>{signal.priority}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
