import './StatsSection.css';

export default function StatsSection() {
  return (
    <section className="section">
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-num">$5M–$100M</div>
          <div className="stat-label">ARR range where this gap costs the most — and where enterprise tools don't fit</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">&lt;60 sec</div>
          <div className="stat-label">From ticket received to signal routed to the right person</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">Zero</div>
          <div className="stat-label">Changes required to your support team's existing workflow</div>
        </div>
      </div>
    </section>
  );
}
