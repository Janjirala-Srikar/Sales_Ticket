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

const signalToneMap = {
  expansion: { bg: 'var(--success-bg)', border: 'var(--success-border)', text: 'var(--success-text)' },
  churn_risk: { bg: 'var(--error-bg)', border: 'var(--error-border)', text: 'var(--error-text)' },
  competitor_mention: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', text: 'var(--warning-text)' },
  feature_gap: { bg: 'var(--info-bg)', border: 'var(--info-border)', text: 'var(--info-text)' },
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

function getSignalCount(tickets) {
  return tickets.reduce((total, ticket) => total + (Array.isArray(ticket.signals) ? ticket.signals.length : 0), 0);
}

function getChurnRiskCount(tickets) {
  return tickets.reduce(
    (total, ticket) => total + (ticket.signals?.filter((signal) => signal.type === 'churn_risk').length || 0),
    0
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

function TicketModal({ ticket, onClose }) {
  if (!ticket) return null;

  return createPortal(
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div className="ticket-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ticket-modal__header">
          <div>
            <div className="ticket-card__eyebrow ticket-card__eyebrow--row">
              <span>Ticket #{ticket.id}</span>
              <span className="ticket-card__eyebrow-date">{formatTicketDate(ticket.created_at)}</span>
            </div>
            <h2>{ticket.subject || 'Untitled ticket'}</h2>
          </div>
        </div>

        <div className="ticket-card__badges">
          <span className="ticket-badge" style={getBadgeStyle(getTone(priorityToneMap, ticket.priority, fallbackTone))}>
            Priority: {formatLabel(ticket.priority)}
          </span>
          <span className="ticket-badge" style={getBadgeStyle(getTone(statusToneMap, ticket.status, fallbackTone))}>
            Status: {formatLabel(ticket.status)}
          </span>
        </div>

        <div className="ticket-detail-grid">
          <div className="ticket-detail-card">
            <span className="ticket-detail-card__label">Receiver Email</span>
            <strong className="ticket-detail-card__value">{ticket.receiver_email || 'Not available'}</strong>
          </div>
        </div>

        <div className="ticket-message">
          <div className="ticket-message__label">Message</div>
          <div className="ticket-message__body">{formatDescription(ticket.description)}</div>
        </div>

        <div className="ticket-signal-stack">
          {(ticket.signals || []).length > 0 ? (
            ticket.signals.map((signal, index) => {
              const tone = signalToneMap[signal.type] || fallbackTone;

              return (
                <div
                  key={`${ticket.id}-${signal.type || index}`}
                  className="ticket-signal-card"
                  style={{ background: tone.bg, borderColor: tone.border }}
                >
                  <div className="ticket-signal-card__top">
                    <strong style={{ color: tone.text }}>{formatLabel(signal.type || 'signal')}</strong>
                    {signal.assigned_to && <span style={{ color: tone.text }}>Assigned to {signal.assigned_to}</span>}
                  </div>
                  {signal.headline && <div className="ticket-signal-card__headline">{signal.headline}</div>}
                  {signal.summary && <p>{signal.summary}</p>}
                </div>
              );
            })
          ) : (
            <div className="ticket-signal-card" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
              <div className="ticket-signal-card__headline">No revenue signals attached</div>
              <p>This ticket does not currently include classified signal data.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AllTickets() {
  const { API_BASE, user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const userId = user?.id || user?.userId || 30001;

  const ticketsQuery = useQuery({
    queryKey: ['all-tickets', API_BASE, userId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/tickets/${userId}`);
      return Array.isArray(data?.tickets) ? data.tickets : [];
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const tickets = ticketsQuery.data || [];

  const stats = useMemo(
    () => ({
      totalTickets: tickets.length,
      totalSignals: getSignalCount(tickets),
      churnRisks: getChurnRiskCount(tickets),
    }),
    [tickets]
  );

  return (
    <div className="ticket-health-layout">
      <div className="content-card ticket-health-summary">
        <h2>All tickets</h2>
        <p>
          Fast ticket retrieval for user <strong style={{ color: 'var(--blue-deep)' }}>{userId}</strong>, with compact
          cards and a full detail modal.
        </p>

        <div className="ticket-summary-grid">
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Tickets</span>
            <strong style={summaryValueStyle}>{stats.totalTickets}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Signals</span>
            <strong style={summaryValueStyle}>{stats.totalSignals}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Churn Risks</span>
            <strong style={summaryValueStyle}>{stats.churnRisks}</strong>
          </div>
        </div>
      </div>

      {ticketsQuery.isLoading && (
        <div className="content-card">
          <p>Loading tickets...</p>
        </div>
      )}

      {ticketsQuery.isError && (
        <div className="content-card" style={{ background: 'var(--error-bg)', borderColor: 'var(--error-border)' }}>
          <h2 style={{ color: 'var(--error-text)' }}>Unable to load tickets</h2>
          <p style={{ color: 'var(--error-text)' }}>
            {ticketsQuery.error?.response?.data?.error || ticketsQuery.error?.message || 'Failed to load tickets.'}
          </p>
        </div>
      )}

      {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length === 0 && (
        <div className="content-card">
          <h2>No tickets yet</h2>
          <p>We could not find any tickets for this user id.</p>
        </div>
      )}

      {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length > 0 && (
        <div className="ticket-card-grid ticket-card-grid--tickets">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="ticket-card">
              <div className="ticket-card__top">
                <div className="ticket-card__top-main">
                  <div className="ticket-card__eyebrow ticket-card__eyebrow--row">
                    <span>Ticket #{ticket.id}</span>
                    <span className="ticket-card__eyebrow-date">{formatTicketDate(ticket.created_at)}</span>
                  </div>
                  <h3 className="ticket-card__title">{ticket.subject || 'Untitled ticket'}</h3>
                </div>
              </div>

              <div className="ticket-card__badges">
                <span className="ticket-badge" style={getBadgeStyle(getTone(priorityToneMap, ticket.priority, fallbackTone))}>
                  Priority: {formatLabel(ticket.priority)}
                </span>
                <span className="ticket-badge" style={getBadgeStyle(getTone(statusToneMap, ticket.status, fallbackTone))}>
                  Status: {formatLabel(ticket.status)}
                </span>
              </div>

              <button
                type="button"
                className="ticket-card__message ticket-card__message--button"
                onClick={() => setSelectedTicket(ticket)}
                aria-label={`Open full ticket details for ${ticket.subject || `ticket ${ticket.id}`}`}
              >
                {getPreviewText(ticket.description)}
              </button>

              <div className="ticket-card__meta ticket-card__meta--full">
                <div className="ticket-card__meta-item ticket-card__meta-item--receiver">
                  <span>Receiver</span>
                  <strong>{ticket.receiver_email || 'N/A'}</strong>
                </div>
              </div>

              <div className="ticket-card__footer">
                <div className="ticket-card__signal-summary ticket-card__signal-summary--panel">
                  {(ticket.signals || []).length > 0 ? `${ticket.signals.length} signal(s)` : 'No signals'}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
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
