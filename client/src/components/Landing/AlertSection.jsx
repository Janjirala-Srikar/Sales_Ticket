import FlowingMenu from './FlowingMenu';
import './AlertSection.css';

const FLOW_MENU_ITEMS = [
  {
    link: '#',
    icon: 'route',
    text: 'Real-time alerts routed to the AM or SDR',
    subtext: 'Routing logic by ownership and account tier',
    accentColor: '#2169AD',
    accentSoftColor: 'rgba(33, 105, 173, 0.14)',
    accentInkColor: '#0C447C',
    borderColor: '#BFD7EF',
    surfaceColor: '#F5FAFF',
    hoverSurfaceColor: '#EAF4FF',
    thumbBgColor: '#E6F2FF',
    thumbHoverBgColor: '#D8EAFE',
    thumbBorderColor: '#C2DBF4',
    thumbHoverBorderColor: '#6AA4D9',
    marqueeBgColor: '#EDF5FF',
    marqueeTextColor: '#0D4E8A',
    marqueeIconBgColor: 'rgba(33, 105, 173, 0.12)',
    marqueeIconColor: '#0D4E8A',
  },
  {
    link: '#',
    icon: 'context',
    text: 'Full account context pulled automatically',
    subtext: 'Live account state stitched into every signal',
    accentColor: '#0E8FA2',
    accentSoftColor: 'rgba(14, 143, 162, 0.14)',
    accentInkColor: '#0A5F6D',
    borderColor: '#BEE2E7',
    surfaceColor: '#F4FCFD',
    hoverSurfaceColor: '#E7F9FB',
    thumbBgColor: '#DFF5F8',
    thumbHoverBgColor: '#CFF0F5',
    thumbBorderColor: '#BFE5EA',
    thumbHoverBorderColor: '#5CB3C1',
    marqueeBgColor: '#EAF9FC',
    marqueeTextColor: '#0A5F6D',
    marqueeIconBgColor: 'rgba(14, 143, 162, 0.12)',
    marqueeIconColor: '#0A5F6D',
  },
  {
    link: '#',
    icon: 'scoring',
    text: 'Urgency and revenue impact scoring per signal',
    subtext: 'Priority score combines intent and account value',
    accentColor: '#335FB1',
    accentSoftColor: 'rgba(51, 95, 177, 0.15)',
    accentInkColor: '#1B488D',
    borderColor: '#C8D5EF',
    surfaceColor: '#F6F8FF',
    hoverSurfaceColor: '#ECF1FF',
    thumbBgColor: '#E7EDFF',
    thumbHoverBgColor: '#DCE6FF',
    thumbBorderColor: '#C9D6F3',
    thumbHoverBorderColor: '#7391D4',
    marqueeBgColor: '#EEF3FF',
    marqueeTextColor: '#1B488D',
    marqueeIconBgColor: 'rgba(51, 95, 177, 0.12)',
    marqueeIconColor: '#1B488D',
  },
  {
    link: '#',
    icon: 'action',
    text: 'One-click personalised outreach ',
    subtext: 'Suggested next step generated instantly',
    accentColor: '#1D9D8F',
    accentSoftColor: 'rgba(29, 157, 143, 0.14)',
    accentInkColor: '#136A61',
    borderColor: '#BEE5DF',
    surfaceColor: '#F4FCFA',
    hoverSurfaceColor: '#E9F9F5',
    thumbBgColor: '#E0F7F2',
    thumbHoverBgColor: '#D2F1EA',
    thumbBorderColor: '#BEE6DC',
    thumbHoverBorderColor: '#59B9A8',
    marqueeBgColor: '#ECFBF8',
    marqueeTextColor: '#136A61',
    marqueeIconBgColor: 'rgba(29, 157, 143, 0.12)',
    marqueeIconColor: '#136A61',
  },
  {
    link: '#',
    icon: 'history',
    text: 'Complete account signal history, ',
    subtext: 'Timeline is always available to sales and CS',
    accentColor: '#B47A23',
    accentSoftColor: 'rgba(180, 122, 35, 0.14)',
    accentInkColor: '#8B5B13',
    borderColor: '#E9D7B9',
    surfaceColor: '#FFFBF3',
    hoverSurfaceColor: '#FFF4E4',
    thumbBgColor: '#FFF0D8',
    thumbHoverBgColor: '#FFE7C2',
    thumbBorderColor: '#EFD3A5',
    thumbHoverBorderColor: '#D7A25F',
    marqueeBgColor: '#FFF6E7',
    marqueeTextColor: '#8B5B13',
    marqueeIconBgColor: 'rgba(180, 122, 35, 0.14)',
    marqueeIconColor: '#8B5B13',
  },
];

export default function AlertSection() {
  return (
    <section className="section alert-section" id = "features"> 
      <div className="section-label">The Output</div>

      <div className="output-lead">
        <h3>The right person, at the right moment, with the right context.</h3>
        <p>
          Signals do not disappear in a dashboard. They land in Slack where your team already
          works, with context and next action ready.
        </p>
      </div>

      <div className="alert-layout">
        <div className="slack-mockup">
          <div className="slack-header">
            <div className="slack-channel">
              <span className="slack-channel-hash">#</span>
              <span>revenue-signals</span>
            </div>
            <span className="slack-live">Live</span>
          </div>

          <div className="slack-body">
            <div className="slack-msg">
              <div className="slack-avatar">TS</div>
              <div className="slack-msg-main">
                <div className="slack-msg-top">
                  <span className="slack-name">TicketSignal</span>
                  <span className="slack-time">Today at 2:14 PM</span>
                </div>
                <p className="slack-text">
                  <strong>Expansion signal detected</strong> for Acme Corp. Hiring plan suggests
                  seat growth in the next quarter.
                </p>
              </div>
            </div>

            <div className="slack-brief">
              <p className="brief-intro">
                AI summary with account context and recommended next move.
              </p>
              <div className="brief-grid">
                <div className="brief-cell">
                  <label>Potential ACV</label>
                  <span>$54,000</span>
                </div>
                <div className="brief-cell">
                  <label>Urgency</label>
                  <span>9.1 / 10</span>
                </div>
                <div className="brief-cell">
                  <label>Owner</label>
                  <span>Sarah Chen</span>
                </div>
                <div className="brief-cell">
                  <label>Last Touch</label>
                  <span>38 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert-copy">
          <FlowingMenu
            items={FLOW_MENU_ITEMS}
            speed={12.5}
            textColor="var(--text-body)"
            bgColor="transparent"
            marqueeBgColor="#EDF5FF"
            marqueeTextColor="#0C447C"
            borderColor="#D6E2F0"
            accentColor="#185FA5"
            accentSoftColor="rgba(24, 95, 165, 0.14)"
            accentInkColor="#0C447C"
          />
        </div>
      </div>
    </section>
  );
}
