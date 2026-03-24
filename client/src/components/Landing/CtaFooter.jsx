import './CtaFooter.css';

export default function CtaFooter() {
  return (
    <>
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
