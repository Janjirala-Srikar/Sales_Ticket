import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuFileText, LuFolderOpen, LuPencilLine, LuSend, LuSparkles } from 'react-icons/lu';
import { useAuth } from '../../../context/AuthContext';
import './PlaybooksView.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://sales-ticket-backend.vercel.app/api';

const filterOptions = [
  { key: 'all', label: 'All Drafts', Icon: LuFileText },
  { key: 'generated', label: 'Generated', Icon: LuSparkles },
  { key: 'edited', label: 'Edited', Icon: LuPencilLine },
  { key: 'sent', label: 'Sent', Icon: LuSend },
];

function formatSignalLabel(value) {
  if (!value) return 'General draft';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDraftDate(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

function getPreviewText(value, limit = 180) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No draft content available.';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function DraftDetailModal({ draft, userRole, onClose, onEdit, onSend, loading }) {
  if (!draft) return null;

  return createPortal(
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div className="ticket-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ticket-modal__header">
          <div className="playbooks-modal__header-row">
            <div>
              <div className="playbooks-modal__eyebrow">
                <span>{formatSignalLabel(draft.signal_type)}</span>
                <span>{formatDraftDate(draft.created_at)}</span>
              </div>
              <h2>Ticket #{draft.zendesk_ticket_id}</h2>
            </div>

            <span className={`playbooks-status playbooks-modal__status playbooks-status--${draft.status || 'default'}`}>
              {draft.status || 'draft'}
            </span>
          </div>
        </div>

        <div className="ticket-detail-grid">
          <div className="ticket-detail-card">
            <span className="ticket-detail-card__label">Role</span>
            <strong className="ticket-detail-card__value">
              {userRole ? formatSignalLabel(userRole) : 'Team member'}
            </strong>
          </div>
          <div className="ticket-detail-card">
            <span className="ticket-detail-card__label">Created</span>
            <strong className="ticket-detail-card__value">{formatDraftDate(draft.created_at)}</strong>
          </div>
        </div>

        <div className="ticket-message">
          <div className="ticket-message__label">Draft Content</div>
          <div className="ticket-message__body">{draft.draft_content || 'No draft content available.'}</div>
        </div>

        <div className="playbooks-modal__actions">
          {draft.status !== 'sent' && (
            <>
              <button
                type="button"
                className="playbooks-button playbooks-button--secondary"
                onClick={() => onEdit(draft)}
                disabled={loading}
              >
                Edit draft
              </button>
              <button
                type="button"
                className="playbooks-button playbooks-button--primary"
                onClick={() => onSend(draft.id)}
                disabled={loading}
              >
                Send to Zendesk
              </button>
            </>
          )}
          <button
            type="button"
            className="playbooks-button playbooks-button--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PlaybooksView() {
  const { user, token } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedDraft, setSelectedDraft] = useState(null);

  useEffect(() => {
    if (!user?.id || !user?.role) return;

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/tickets/drafts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            role: user.role,
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch drafts');
        const data = await response.json();
        setDrafts(data.drafts || []);
        setError('');
      } catch (err) {
        console.error('Error fetching drafts:', err);
        setError('Failed to load drafts');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token, user]);

  const handleEditClick = (draft) => {
    setSelectedDraft(null);
    setEditingDraft(draft.id);
    setEditContent(draft.draft_content);
  };

  const handleSaveEdit = async (draftId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tickets/drafts/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draft_id: draftId,
          content: editContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to update draft');

      setDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId
            ? { ...draft, draft_content: editContent, status: 'edited' }
            : draft
        )
      );
      setSelectedDraft((current) =>
        current?.id === draftId
          ? { ...current, draft_content: editContent, status: 'edited' }
          : current
      );

      setEditingDraft(null);
      setSuccess('Draft updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating draft:', err);
      setError('Failed to update draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDraft = async (draftId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tickets/drafts/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draft_id: draftId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send draft');
      }

      setDrafts((current) =>
        current.map((draft) => (draft.id === draftId ? { ...draft, status: 'sent' } : draft))
      );
      setSelectedDraft((current) => (current?.id === draftId ? { ...current, status: 'sent' } : current));

      setSuccess('Reply sent to customer via Zendesk');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error sending draft:', err);
      setError(err.message || 'Failed to send draft');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrafts = useMemo(
    () => drafts.filter((draft) => (filter === 'all' ? true : draft.status === filter)),
    [drafts, filter]
  );

  const counts = useMemo(
    () => ({
      all: drafts.length,
      generated: drafts.filter((draft) => draft.status === 'generated').length,
      edited: drafts.filter((draft) => draft.status === 'edited').length,
      sent: drafts.filter((draft) => draft.status === 'sent').length,
    }),
    [drafts]
  );

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      generated: 'playbooks-status--generated',
      edited: 'playbooks-status--edited',
      sent: 'playbooks-status--sent',
    };
    return statusClasses[status] || 'playbooks-status--default';
  };

  return (
    <div className="playbooks-shell mb-5">
      <section className="playbooks-hero">
        <div>
          <p className="playbooks-hero__eyebrow">AI Playbooks</p>
          <h1>Draft outreach that teams can review, refine, and ship fast.</h1>
          <p className="playbooks-hero__copy">
            Track every generated response in one place, edit the message when needed, and send it
            back into Zendesk without jumping tools.
          </p>
        </div>

        <div className="playbooks-hero__stats">
          <div className="playbooks-hero__stat">
            <span>Drafts</span>
            <strong>{counts.all}</strong>
          </div>
          <div className="playbooks-hero__stat">
            <span>Ready to send</span>
            <strong>{counts.generated + counts.edited}</strong>
          </div>
        </div>
      </section>

      <section className="playbooks-toolbar">
        <div className="playbooks-toolbar__filters" role="tablist" aria-label="Draft filters">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`playbooks-pill ${filter === option.key ? 'playbooks-pill--active' : ''}`}
              onClick={() => setFilter(option.key)}
            >
              <option.Icon size={16} />
              <span>{option.label}</span>
              <strong>{counts[option.key]}</strong>
            </button>
          ))}
        </div>
      </section>

      {error && <div className="playbooks-alert playbooks-alert--error">{error}</div>}
      {success && <div className="playbooks-alert playbooks-alert--success">{success}</div>}

      {loading ? (
        <div className="playbooks-empty">
          <h2>Loading drafts...</h2>
          <p>Pulling the latest generated responses for your role.</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="playbooks-empty">
          <div className="playbooks-empty__icon">
            <LuFolderOpen />
          </div>
          <h2>No drafts yet</h2>
          <p>New tickets will generate drafts here as signals arrive.</p>
        </div>
      ) : (
        <div className="playbooks-grid">
          {filteredDrafts.map((draft) => (
            <article
              key={draft.id}
              className={`playbooks-card ${editingDraft === draft.id ? '' : 'playbooks-card--interactive'}`}
              onClick={editingDraft === draft.id ? undefined : () => setSelectedDraft(draft)}
              onKeyDown={
                editingDraft === draft.id
                  ? undefined
                  : (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedDraft(draft);
                      }
                    }
              }
              role={editingDraft === draft.id ? undefined : 'button'}
              tabIndex={editingDraft === draft.id ? undefined : 0}
              aria-label={editingDraft === draft.id ? undefined : `Open full draft for ticket ${draft.zendesk_ticket_id}`}
            >
              <div className="playbooks-card__top">
                <div className="playbooks-card__signal">
                  <span className="playbooks-card__signal-label">{formatSignalLabel(draft.signal_type)}</span>
                  <h2>Ticket #{draft.zendesk_ticket_id}</h2>
                </div>

                <span className={`playbooks-status ${getStatusBadgeClass(draft.status)}`}>
                  {draft.status || 'draft'}
                </span>
              </div>

              <div className="playbooks-card__meta">
                <div>
                  <span>Created</span>
                  <strong>{formatDraftDate(draft.created_at)}</strong>
                </div>
                <div>
                  <span>Role</span>
                  <strong>{user?.role ? formatSignalLabel(user.role) : 'Team member'}</strong>
                </div>
              </div>

              {editingDraft === draft.id ? (
                <div className="playbooks-editor">
                  <textarea
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    className="playbooks-editor__input"
                    rows={10}
                  />
                  <div className="playbooks-actions">
                    <button
                      type="button"
                      className="playbooks-button playbooks-button--primary"
                      onClick={() => handleSaveEdit(draft.id)}
                      disabled={loading}
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="playbooks-button playbooks-button--secondary"
                      onClick={() => {
                        setEditingDraft(null);
                        setEditContent('');
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="playbooks-copy">
                    <p>{getPreviewText(draft.draft_content)}</p>
                  </div>

                  {draft.status !== 'sent' && (
                    <div className="playbooks-actions">
                      <button
                        type="button"
                        className="playbooks-button playbooks-button--secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditClick(draft);
                        }}
                        disabled={loading}
                      >
                        Edit draft
                      </button>
                      <button
                        type="button"
                        className="playbooks-button playbooks-button--primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSendDraft(draft.id);
                        }}
                        disabled={loading}
                      >
                        Send to Zendesk
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}

      <DraftDetailModal
        draft={selectedDraft}
        userRole={user?.role}
        onClose={() => setSelectedDraft(null)}
        onEdit={handleEditClick}
        onSend={handleSendDraft}
        loading={loading}
      />
    </div>
  );
}
