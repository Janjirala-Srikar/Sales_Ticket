import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
// import './utility-patterns.css';
// import './style.css';
import './Dashboard.css';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTheme, setSidebarTheme] = useState('brand'); // brand uses App.css palette; white keeps neutral

  return (
    <div className="dash-shell">
      <div className="dash-app">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          variant={sidebarTheme === 'white' ? 'white' : 'brand'}
        />

        <div className="dash-content">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="dash-main">
            <header className="dash-bar">
              <div>
                <p className="dash-kicker">TicketSignal</p>
                <h1>Revenue Signals Dashboard</h1>
              </div>
              <button
                type="button"
                className="dash-link"
                onClick={() => setSidebarTheme(sidebarTheme === 'white' ? 'brand' : 'white')}
              >
                {sidebarTheme === 'white' ? 'Use brand sidebar' : 'Use white sidebar'}
              </button>
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
          </main>
        </div>
      </div>
    </div>
  );
}
