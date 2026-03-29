import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

function formatRoleLabel(value) {
  if (!value) return 'Root User';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const fieldStyle = {
  display: 'grid',
  gap: 8,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%',
  minHeight: 44,
  border: '1px solid var(--input-border)',
  borderRadius: 'var(--input-radius)',
  background: 'var(--input-bg)',
  color: 'var(--input-text)',
  padding: '0 14px',
  font: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const helperCardStyle = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
};

export default function EditDetailsView() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      username: user?.username || '',
    });
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSaved(false);
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateUser({
      name: form.name.trim(),
      email: form.email.trim(),
      username: form.username.trim() || form.name.trim(),
    });
    setSaved(true);
  };

  const handleReset = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      username: user?.username || '',
    });
    setSaved(false);
  };

  return (
    <div className="ticket-health-layout">
      <div className="content-card ticket-health-summary">
        <h2>Edit Details</h2>
        <p>Update the profile information shown across the dashboard workspace.</p>

        <div className="ticket-summary-grid">
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Display Name</span>
            <strong style={summaryValueStyle}>{user?.name || 'Not set'}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Username</span>
            <strong style={summaryValueStyle}>{user?.username || 'Not set'}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Email</span>
            <strong style={{ ...summaryValueStyle, fontSize: 18 }}>{user?.email || 'Not set'}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Role</span>
            <strong style={{ ...summaryValueStyle, fontSize: 18 }}>{formatRoleLabel(user?.role)}</strong>
          </div>
        </div>
      </div>

      <div className="content-card">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Full Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Username</span>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Username"
                style={inputStyle}
              />
            </label>
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              style={inputStyle}
            />
          </label>

          <div style={helperCardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Role Access
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{formatRoleLabel(user?.role)}</div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>
              Role access is managed separately and is shown here for reference only.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" style={primaryButtonStyle}>
              Save Details
            </button>
            <button type="button" onClick={handleReset} style={secondaryButtonStyle}>
              Reset
            </button>
            {saved && <span style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>Details updated for this session.</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

const summaryCardStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  display: 'grid',
  gap: 4,
};

const summaryLabelStyle = {
  color: 'var(--text-muted)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const summaryValueStyle = {
  color: 'var(--blue-primary)',
  fontSize: 22,
  lineHeight: 1.1,
};

const primaryButtonStyle = {
  border: '1px solid var(--blue-primary)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--blue-primary)',
  color: 'var(--text-on-blue)',
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--bg-surface)',
  color: 'var(--text-body)',
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};
