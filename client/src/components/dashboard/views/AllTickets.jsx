import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';

const priorityToneMap = {
  high: { bg: 'var(--error-bg)', border: 'var(--error-border)', text: 'var(--error-text)' },
  urgent: { bg: 'var(--error-bg)', border: 'var(--error-border)', text: 'var(--error-text)' },
  normal: { bg: 'var(--info-bg)', border: 'var(--info-border)', text: 'var(--info-text)' },
  low: { bg: 'var(--bg-subtle)', border: 'var(--border-subtle)', text: 'var(--text-body)' },
};

const statusToneMap = {
  open: { bg: 'var(--success-bg)', border: 'var(--success-border)', text: 'var(--success-text)' },
  pending: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', text: 'var(--warning-text)' },
  solved: { bg: 'var(--info-bg)', border: 'var(--info-border)', text: 'var(--info-text)' },
  closed: { bg: 'var(--bg-subtle)', border: 'var(--border-subtle)', text: 'var(--text-body)' },
};

const fallbackTone = {
  bg: 'var(--bg-subtle)',
  border: 'var(--border-subtle)',
  text: 'var(--text-body)',
};

function formatTicketDate(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatLabel(value) {
  if (!value) return 'Not available';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTone(map, value, fallback) {
  if (!value) return fallback;
  return map[String(value).toLowerCase()] || fallback;
}

function normalizeSignal(signal) {
  return {
    ...signal,
    type: signal?.type || signal?.signal_type || '',
    headline: signal?.headline || '',
    summary: signal?.summary || '',
    assigned_to: signal?.assigned_to || '',
  };
}

function formatDescription(value) {
  if (!value) return 'No description provided.';

  const cleaned = String(value)
    .replace(/^-{5,}\s*/g, '')
    .replace(/\r/g, '')
    .trim();

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return cleaned;

  const bodyStartIndex = lines.findIndex((line, index) => {
    if (index === 0 && /,\s*[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/.test(line)) return false;
    return /^hi\b/i.test(line) || /^hello\b/i.test(line) || /^dear\b/i.test(line);
  });

  const bodyLines = bodyStartIndex >= 0 ? lines.slice(bodyStartIndex) : lines.slice(1);
  return bodyLines.join('\n\n');
}

function getPreviewText(value, limit = 180) {
  const normalized = formatDescription(value).replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function isOpenStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'open' || normalized === 'pending';
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getBadgeStyle(tone) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 'var(--radius-pill)',
    background: tone.bg,
    border: `1px solid ${tone.border}`,
    color: tone.text,
    fontSize: 12,
    fontWeight: 700,
  };
}

function DetailModal({ item, onClose, isTeamLogin }) {
  if (!item) return null;

  return createPortal(
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div className="ticket-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ticket-modal__header">
          <div>
            <div className="ticket-card__eyebrow ticket-card__eyebrow--row">
              <span>{isTeamLogin ? formatLabel(item.type || 'signal') : `Ticket #${item.id}`}</span>
              {!isTeamLogin && <span className="ticket-card__eyebrow-date">{formatTicketDate(item.created_at)}</span>}
            </div>
            <h2>{isTeamLogin ? item.headline || 'Untitled signal' : item.subject || 'Untitled ticket'}</h2>
          </div>
        </div>

        <div className="ticket-card__badges">
          {isTeamLogin ? (
            <>
              <span className="ticket-badge" style={getBadgeStyle(fallbackTone)}>
                Type: {formatLabel(item.type)}
              </span>
              <span className="ticket-badge" style={getBadgeStyle(fallbackTone)}>
                Assigned To: {item.assigned_to || 'Not available'}
              </span>
            </>
          ) : (
            <>
              <span className="ticket-badge" style={getBadgeStyle(getTone(priorityToneMap, item.priority, fallbackTone))}>
                Priority: {formatLabel(item.priority)}
              </span>
              <span className="ticket-badge" style={getBadgeStyle(getTone(statusToneMap, item.status, fallbackTone))}>
                Status: {formatLabel(item.status)}
              </span>
            </>
          )}
        </div>

        <div className="ticket-detail-grid">
          <div className="ticket-detail-card">
            <span className="ticket-detail-card__label">{isTeamLogin ? 'Owner Role' : 'Receiver Email'}</span>
            <strong className="ticket-detail-card__value">
              {isTeamLogin ? item.assigned_to || 'Not available' : item.receiver_email || 'Not available'}
            </strong>
          </div>
        </div>

        <div className="ticket-message">
          <div className="ticket-message__label">{isTeamLogin ? 'Summary' : 'Message'}</div>
          <div className="ticket-message__body">{isTeamLogin ? item.summary || 'No summary provided.' : formatDescription(item.description)}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AllTickets() {
  const { API_BASE, user } = useAuth();
  const [selectedItem, setSelectedItem] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const userId = user?.id || user?.userId || 30001;
  const userRole = user?.role || '';
  const isTeamLogin = Boolean(userRole);
  const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'User');

  const ticketsQuery = useQuery({
    queryKey: ['all-tickets', API_BASE, userId, userRole],
    queryFn: async () => {
      if (isTeamLogin) {
        const response = await axios.post(`${API_BASE}/signals`, {
          user_id: userId,
          role: userRole,
        });
        console.log('All tickets team signals response:', response);
        const payload = response.data;
        if (Array.isArray(payload)) return payload.map(normalizeSignal);
        if (Array.isArray(payload?.signals)) return payload.signals.map(normalizeSignal);
        if (Array.isArray(payload?.tickets)) return payload.tickets.map(normalizeSignal);
        return [];
      }

      const response = await axios.get(`${API_BASE}/tickets/${userId}`);
      console.log('All tickets response:', response);
      const { data } = response;
      return Array.isArray(data?.tickets) ? data.tickets : [];
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const items = ticketsQuery.data || [];
  const tickets = isTeamLogin ? [] : items;
  const signals = isTeamLogin ? items : [];

  const priorityOptions = useMemo(
    () =>
      Array.from(new Set(tickets.map((ticket) => String(ticket.priority || '').toLowerCase()).filter(Boolean))).sort(),
    [tickets]
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(tickets.map((ticket) => String(ticket.status || '').toLowerCase()).filter(Boolean))).sort(),
    [tickets]
  );

  const stats = useMemo(() => {
    if (isTeamLogin) {
      return {
        totalSignals: signals.length,
        uniqueTypes: new Set(signals.map((signal) => signal.type).filter(Boolean)).size,
        assignedSignals: signals.filter((signal) => Boolean(signal.assigned_to)).length,
      };
    }

    return {
      totalTickets: tickets.length,
      openTickets: tickets.filter((ticket) => isOpenStatus(ticket.status)).length,
      uniqueAccounts: new Set(tickets.map((ticket) => ticket.zendesk_account_id).filter(Boolean)).size,
      ticketsToday: tickets.filter((ticket) => isToday(ticket.created_at)).length,
    };
  }, [isTeamLogin, signals, tickets]);

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const matchesPriority =
          priorityFilter === 'all' || String(ticket.priority || '').toLowerCase() === priorityFilter;
        const matchesStatus = statusFilter === 'all' || String(ticket.status || '').toLowerCase() === statusFilter;
        return matchesPriority && matchesStatus;
      }),
    [priorityFilter, statusFilter, tickets]
  );

  const visibleItems = isTeamLogin ? signals : filteredTickets;

  return (
    <div className="ticket-health-layout">
      <div className="content-card ticket-health-summary">
        <h2>Hello, {displayName}</h2>
        <p>{isTeamLogin ? `${formatLabel(userRole)} signals at a glance.` : 'Your ticket activity at a glance.'}</p>

        <div className="ticket-summary-grid">
          {isTeamLogin ? (
            <>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Signals</span>
                <strong style={summaryValueStyle}>{stats.totalSignals}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Signal Types</span>
                <strong style={summaryValueStyle}>{stats.uniqueTypes}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Assigned</span>
                <strong style={summaryValueStyle}>{stats.assignedSignals}</strong>
              </div>
            </>
          ) : (
            <>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Tickets</span>
                <strong style={summaryValueStyle}>{stats.totalTickets}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Open Tickets</span>
                <strong style={summaryValueStyle}>{stats.openTickets}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Accounts</span>
                <strong style={summaryValueStyle}>{stats.uniqueAccounts}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Today</span>
                <strong style={summaryValueStyle}>{stats.ticketsToday}</strong>
              </div>
              <label className="ticket-filter-card">
                <span className="ticket-filter-card__label">Priority</span>
                <select
                  className="ticket-filter-card__select"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="all">All priorities</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ticket-filter-card">
                <span className="ticket-filter-card__label">Status</span>
                <select
                  className="ticket-filter-card__select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      </div>

      {ticketsQuery.isLoading && (
        <div className="content-card">
          <p>{isTeamLogin ? 'Loading signals...' : 'Loading tickets...'}</p>
        </div>
      )}

      {ticketsQuery.isError && (
        <div className="content-card" style={{ background: 'var(--error-bg)', borderColor: 'var(--error-border)' }}>
          <h2 style={{ color: 'var(--error-text)' }}>Unable to load {isTeamLogin ? 'signals' : 'tickets'}</h2>
          <p style={{ color: 'var(--error-text)' }}>
            {ticketsQuery.error?.response?.data?.error || ticketsQuery.error?.message || `Failed to load ${isTeamLogin ? 'signals' : 'tickets'}.`}
          </p>
        </div>
      )}

      {!ticketsQuery.isLoading && !ticketsQuery.isError && items.length === 0 && (
        <div className="content-card">
          <h2>{isTeamLogin ? 'No signals yet' : 'No tickets yet'}</h2>
          <p>{isTeamLogin ? `We could not find any signals for ${formatLabel(userRole)} yet.` : 'We could not find any tickets for this user id.'}</p>
        </div>
      )}

      {!isTeamLogin && !ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length > 0 && filteredTickets.length === 0 && (
        <div className="content-card">
          <h2>No matching tickets</h2>
          <p>Try changing the priority or status filter to see more results.</p>
        </div>
      )}

      {!ticketsQuery.isLoading && !ticketsQuery.isError && visibleItems.length > 0 && (
        <div className="ticket-card-grid ticket-card-grid--tickets">
          {visibleItems.map((item, index) => (
            <article
              key={item.id || `${item.type || 'item'}-${index}`}
              className="ticket-card ticket-card--interactive"
              onClick={() => setSelectedItem(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedItem(item);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open full ${isTeamLogin ? 'signal' : 'ticket'} details for ${
                isTeamLogin ? item.headline || `signal ${index + 1}` : item.subject || `ticket ${item.id}`
              }`}
            >
              <div className="ticket-card__top">
                <div className="ticket-card__top-main">
                  <div className="ticket-card__eyebrow ticket-card__eyebrow--row">
                    <span>{isTeamLogin ? formatLabel(item.type || 'signal') : `Ticket #${item.id}`}</span>
                    {!isTeamLogin && <span className="ticket-card__eyebrow-date">{formatTicketDate(item.created_at)}</span>}
                  </div>
                  <h3 className="ticket-card__title">{isTeamLogin ? item.headline || 'Untitled signal' : item.subject || 'Untitled ticket'}</h3>
                </div>
              </div>

              <div className="ticket-card__badges">
                {isTeamLogin ? (
                  <span className="ticket-badge" style={getBadgeStyle(fallbackTone)}>
                    Assigned To: {item.assigned_to || 'Not available'}
                  </span>
                ) : (
                  <>
                    <span className="ticket-badge" style={getBadgeStyle(getTone(priorityToneMap, item.priority, fallbackTone))}>
                      Priority: {formatLabel(item.priority)}
                    </span>
                    <span className="ticket-badge" style={getBadgeStyle(getTone(statusToneMap, item.status, fallbackTone))}>
                      Status: {formatLabel(item.status)}
                    </span>
                  </>
                )}
              </div>

              <div className="ticket-card__message">
                {isTeamLogin ? item.summary || 'No summary provided.' : getPreviewText(item.description)}
              </div>

              <div className="ticket-card__meta ticket-card__meta--full">
                <div className="ticket-card__meta-item ticket-card__meta-item--receiver">
                  <span>{isTeamLogin ? 'Signal Type' : 'Receiver'}</span>
                  <strong>{isTeamLogin ? formatLabel(item.type) : item.receiver_email || 'N/A'}</strong>
                </div>
              </div>

            </article>
          ))}
        </div>
      )}

      <DetailModal item={selectedItem} isTeamLogin={isTeamLogin} onClose={() => setSelectedItem(null)} />
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
  fontSize: 28,
  lineHeight: 1.1,
};
