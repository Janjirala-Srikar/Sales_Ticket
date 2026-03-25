import { useEffect, useRef } from 'react';
import './FlowSection.css';

const FLOW = [
  { num: '01', title: 'Ticket Arrives',        desc: 'A customer submits a support ticket through Zendesk, Intercom, or Freshdesk. Nothing changes for your support team.' },
  { num: '02', title: 'AI Reads & Classifies', desc: 'Our LLM instantly reads the ticket and identifies expansion, churn, competitor, or feature-gap signals with full context.' },
  { num: '03', title: 'CRM Context Pulled',    desc: 'The account\'s plan, renewal date, ACV, last touch, and ticket history are enriched automatically from your CRM.' },
  { num: '04', title: 'Routed & Scored',        desc: 'The signal is scored by urgency and revenue impact, then routed to the right person — AE, CSM, or PM — in Slack.' },
  { num: '05', title: 'Draft Action Ready',     desc: 'A suggested next action and a one-click personalised email or call script is included, based on what the customer actually said.' },
];

export default function FlowSection() {
  const sectionRef = useRef(null);
  const stickyRef  = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky  = stickyRef.current;
    if (!section || !sticky) return;

    const steps    = Array.from(sticky.querySelectorAll('.flow-step'));
    const numbers  = Array.from(sticky.querySelectorAll('.step-num'));
    const lineFill = sticky.querySelector('.flow-line-fill');
    const lineGlow = sticky.querySelector('.flow-line-glow');
    const total    = steps.length;

    const onScroll = () => {
      const rect      = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress  = Math.min(Math.max(-rect.top / scrollable, 0), 1);

      // Line grows left → right
      const pct = progress * 100;
      lineFill.style.width = pct + '%';
      lineGlow.style.width = pct + '%';

      steps.forEach((step, i) => {
        // Each step activates over its own 1/total slice of progress
        const start = i / total;
        const end   = (i + 1) / total;
        const frac  = Math.min(Math.max((progress - start) / (end - start), 0), 1);

        // Clip reveal: slide content from left (clipPath + translateX)
        step.style.clipPath  = `inset(0 ${Math.round((1 - frac) * 100)}% 0 0)`;
        step.style.transform = `translateX(${(1 - frac) * 32}px)`;
        step.style.opacity   = frac;

        // Number circle brightness: dim → vivid as step activates
        const brightness = 0.4 + frac * 0.6;
        numbers[i].style.opacity = brightness;
        if (frac >= 0.98) {
          numbers[i].classList.add('step-num--active');
        } else {
          numbers[i].classList.remove('step-num--active');
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="flow-section" id="how" ref={sectionRef}>
      <div className="flow-sticky" ref={stickyRef}>
        <div className="section-label">How It Works</div>
        <h2>Silent, automatic,<br />no new tools to adopt</h2>
        <p className="flow-subtitle">
          TicketSignal sits on top of your existing support stack. Your team works exactly as before.
          The intelligence flows automatically to the people who need it.
        </p>

        <div className="flow-track">
          {/* Static dim baseline */}
          <div className="flow-line-bg" />
          {/* Solid growing fill */}
          <div className="flow-line-fill" />
          {/* Glowing layer on top */}
          <div className="flow-line-glow" />

          <div className="flow-steps">
            {FLOW.map((f) => (
              <div key={f.num} className="flow-step">
                <div className="step-num">{f.num}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}