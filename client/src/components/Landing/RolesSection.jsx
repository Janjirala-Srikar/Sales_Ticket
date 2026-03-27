import { useEffect, useMemo, useState } from 'react';
import InfiniteMenu from './InfiniteMenu';
import './RolesSection.css';

const INTEGRATIONS = [
  {
    image: null,
    link: 'https://www.zendesk.com/in/',
    title: 'Zendesk',
    description: 'Ticket stream and escalation context.',
  },
  {
    image: null,
    link: 'https://www.intercom.com',
    title: 'Intercom',
    description: 'Conversation intent and support activity.',
  },
  {
    image: null,
    link: 'https://www.salesforce.com',
    title: 'Salesforce',
    description: 'CRM sync for account-level signals.',
  },
  {
    image: null,
    link: 'https://www.hubspot.com',
    title: 'HubSpot',
    description: 'Lifecycle updates from support behavior.',
  },
  {
    image: null,
    link: 'https://www.slack.com',
    title: 'Slack',
    description: 'Route urgent account signals instantly.',
  },
];

const BENEFITS = [
  {
    title: 'Real-time sync',
    description: 'Automatic data flow from your existing tools.',
  },
  {
    title: 'Unified view',
    description: 'All signals in one dashboard with no scattered data.',
  },
  {
    title: 'Zero config',
    description: 'Connect quickly and start pulling insights immediately.',
  },
];

export default function RolesSection() {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const onChange = (event) => setIsCompact(event.matches);

    setIsCompact(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const canvasItems = useMemo(() => {
    if (!isCompact) return INTEGRATIONS;

    return INTEGRATIONS.map((item) => ({
      ...item,
      description: '',
    }));
  }, [isCompact]);

  return (
    <section className="roles-section" id="teams">
      <div className="roles-header">
        <div className="section-label">Integrations</div>

        <div className="roles-title-block">
          <h2 className="roles-heading">
            Connect all your
            <br />
            <span className="roles-heading-accent">favorite tools.</span>
          </h2>
          <p className="roles-subtitle">
            TicketSignal works with the platforms your team already uses, so you can route signals without switching tabs.
          </p>
        </div>

        <ul className="roles-benefits" aria-label="Integration benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="benefit-item">
              <div className="benefit-icon" aria-hidden="true">&#10003;</div>
              <div className="benefit-content">
                <p className="benefit-title">{benefit.title}</p>
                <p className="benefit-desc">{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="roles-cta-text">
          Drag the globe to explore integrations or scroll to view all supported platforms.
        </p>
      </div>

      <div className="roles-menu-host">
        <InfiniteMenu items={canvasItems} scale={1.1} />
      </div>
    </section>
  );
}
