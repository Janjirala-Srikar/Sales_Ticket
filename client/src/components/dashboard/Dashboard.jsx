import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dash-shell">
      <header className="dash-bar">
        <div>
          <p className="dash-kicker">TicketSignal</p>
          <h1>Revenue Signals Dashboard</h1>
        </div>
        <div className="dash-user">
          <span className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
          <div className="details">
            <strong>{user?.email || 'User'}</strong>
            <button type="button" onClick={logout} className="dash-link">Logout</button>
          </div>
        </div>
      </header>

      <section className="dash-cards">
        {[
          { label: 'Signals Today', value: '47', note: '+12 vs yesterday' },
          { label: 'Revenue at Risk', value: '$82k', note: '5 accounts flagged' },
          { label: 'Expansion Pipeline', value: '$214k', note: '11 opportunities' },
        ].map((item) => (
          <div key={item.label} className="dash-card">
            <p className="dash-label">{item.label}</p>
            <p className="dash-value">{item.value}</p>
            <p className="dash-note">{item.note}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
