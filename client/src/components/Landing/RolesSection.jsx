import InfiniteMenu from './InfiniteMenu';
import './RolesSection.css';

const items = [
  {
    // title must match a key in LOGO_SVGS (lowercase) for the inline SVG path
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

export default function RolesSection() {
  return (
    <section className="roles-section" id="teams">
      <div className="roles-header">
        <div className="section-label">Roles and integrations</div>
        <h2 className="roles-heading">
          One menu.
          <br />
          <span className="roles-heading-accent">Every integration.</span>
        </h2>
        <p className="roles-copy">
          Drag the globe to explore connected tools.&nbsp;
          The active card surfaces instantly.
        </p>
      </div>

      <div className="roles-menu-host">
        <InfiniteMenu items={items} scale={1.1} />
      </div>
    </section>
  );
}