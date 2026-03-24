import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CtaFooter.css';

export default function CtaFooter() {
  const [ctaEmail, setCtaEmail] = useState('');
  const navigate = useNavigate();

  const handleCta = (e) => {
    e.preventDefault();
    navigate('/register', { state: { prefillEmail: ctaEmail } });
  };

  return (
    <>
      {/* CTA */}
      <section className="cta-section" id="cta">
        <div className="cta-glow" />
        <h2>Stop letting revenue signals<br />close as support tickets.</h2>
        <p>Join the early access list. We're onboarding a limited cohort of B2B teams to build this together.</p>
        <form className="cta-form" onSubmit={handleCta}>
          <input
            type="email"
            placeholder="your@company.com"
            value={ctaEmail}
            onChange={(e) => setCtaEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">Get Access</button>
        </form>
        <p className="cta-note">Works with Zendesk, Intercom &amp; Freshdesk. Setup in under a day.</p>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">TicketSignal</div>
        <p>(c) 2025 TicketSignal. Turning support conversations into revenue intelligence.</p>
      </footer>
    </>
  );
}
