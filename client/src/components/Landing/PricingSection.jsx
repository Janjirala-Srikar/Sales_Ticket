import './PricingSection.css';

const PRICING_PLANS = [
  {
    name: 'Basic plan',
    price: 10,
    summary: 'Great for lean support and sales teams.',
    billing: 'Billed annually.',
    features: [
      'Access to all core signal detection',
      'Basic reporting and analytics',
      'Up to 10 individual users',
      '20 GB data per workspace',
      'Standard chat and email support',
    ],
  },
  {
    name: 'Business plan',
    price: 20,
    summary: 'Built for growing revenue operations.',
    billing: 'Billed annually.',
    popular: true,
    features: [
      '200+ integrations',
      'Advanced reporting and analytics',
      'Up to 20 individual users',
      '40 GB data per workspace',
      'Priority chat and email support',
    ],
  },
  {
    name: 'Enterprise plan',
    price: 40,
    summary: 'For high-volume, cross-functional teams.',
    billing: 'Billed annually.',
    features: [
      'Advanced custom fields',
      'Audit log and account history',
      'Unlimited individual users',
      'Unlimited data limits',
      'Dedicated success support',
    ],
  },
];

export default function PricingSection() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-shell">
        <header className="pricing-header">
          <p className="section-label">Pricing</p>
          <h2 className="pricing-title">Simple, transparent pricing for every team stage</h2>
          <p className="pricing-subtitle">
            Start small, scale fast, and keep your support-to-revenue workflow aligned as your ticket volume grows.
          </p>
        </header>

        <div className="pricing-grid">
          {PRICING_PLANS.map((plan, index) => (
            <article
              key={plan.name}
              className={`pricing-card${plan.popular ? ' is-popular' : ''}`}
              style={{ '--stagger-delay': `${index * 90}ms` }}
            >
              {plan.popular && <p className="pricing-badge">Most popular</p>}

              <div className="pricing-card-head">
                <p className="pricing-plan-name">{plan.name}</p>
                <p className="pricing-price">
                  <span className="pricing-currency">$</span>
                  {plan.price}
                  <span className="pricing-cycle">/mo</span>
                </p>
                <p className="pricing-summary">{plan.summary}</p>
                <p className="pricing-billing">{plan.billing}</p>
              </div>

              <ul className="pricing-features" aria-label={`${plan.name} features`}>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="pricing-check" aria-hidden="true">?</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pricing-actions">
                <a href="#cta" className="pricing-btn pricing-btn-primary">Get started</a>
                <a href="#cta" className="pricing-btn pricing-btn-secondary">Talk to sales</a>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="pricing-bottom-fade" aria-hidden="true" />
    </section>
  );
}
