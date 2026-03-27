import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './PlaybooksView.css';

// 📌 API Base URL with fallback
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PlaybooksView() {
  const { user, token } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // all, generated, edited, sent

  // 📥 Fetch drafts on component mount
  useEffect(() => {
    if (user?.id && user?.role) {
      fetchDrafts();
    }
  }, [user]);

  const fetchDrafts = async () => {
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
      console.error('❌ Error fetching drafts:', err);
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (draft) => {
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
      
      // Update local state
      setDrafts(drafts.map(d => 
        d.id === draftId 
          ? { ...d, draft_content: editContent, status: 'edited' }
          : d
      ));
      
      setEditingDraft(null);
      setSuccess('Draft updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Error updating draft:', err);
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

      // Update local state
      setDrafts(drafts.map(d => 
        d.id === draftId 
          ? { ...d, status: 'sent' }
          : d
      ));
      
      setSuccess('Reply sent to customer via Zendesk');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Error sending draft:', err);
      setError(err.message || 'Failed to send draft');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingDraft(null);
    setEditContent('');
  };

  const filteredDrafts = drafts.filter(draft => {
    if (filter === 'all') return true;
    return draft.status === filter;
  });

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      generated: 'badge-generated',
      edited: 'badge-edited',
      sent: 'badge-sent',
    };
    return statusClasses[status] || 'badge-default';
  };

  const getSignalIcon = (signalType) => {
    const icons = {
      churn_risk: '⚠️',
      expansion_signal: '📈',
      engagement_issue: '📉',
      default: '💬',
    };
    return icons[signalType] || icons.default;
  };

  return (
    <div className="playbooks-container">
      <div className="playbooks-header">
        <h2>📋 AI-Generated Playbooks & Drafts</h2>
        <p>Auto-drafted outreach and runbooks tailored to segment, persona, and recent activity.</p>
      </div>

      {/* 📊 Filter tabs */}
      <div className="filter-tabs">
        <button 
          className={`tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Drafts ({drafts.length})
        </button>
        <button 
          className={`tab ${filter === 'generated' ? 'active' : ''}`}
          onClick={() => setFilter('generated')}
        >
          Generated ({drafts.filter(d => d.status === 'generated').length})
        </button>
        <button 
          className={`tab ${filter === 'edited' ? 'active' : ''}`}
          onClick={() => setFilter('edited')}
        >
          Edited ({drafts.filter(d => d.status === 'edited').length})
        </button>
        <button 
          className={`tab ${filter === 'sent' ? 'active' : ''}`}
          onClick={() => setFilter('sent')}
        >
          Sent ({drafts.filter(d => d.status === 'sent').length})
        </button>
      </div>

      {/* 🔄 Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* 📄 Drafts List */}
      {loading ? (
        <div className="loading">Loading drafts...</div>
      ) : filteredDrafts.length === 0 ? (
        <div className="empty-state">
          <p>No drafts found. Tickets will generate drafts as they arrive.</p>
        </div>
      ) : (
        <div className="drafts-grid">
          {filteredDrafts.map((draft) => (
            <div key={draft.id} className="draft-card">
              {/* Header */}
              <div className="draft-header">
                <div className="draft-signal">
                  <span className="signal-icon">{getSignalIcon(draft.signal_type)}</span>
                  <span className="signal-name">{draft.signal_type?.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <span className={`status-badge ${getStatusBadgeClass(draft.status)}`}>
                  {draft.status.toUpperCase()}
                </span>
              </div>

              {/* Ticket Reference */}
              <div className="draft-meta">
                <small>Ticket ID: {draft.zendesk_ticket_id}</small>
                {draft.created_at && (
                  <small>{new Date(draft.created_at).toLocaleDateString()}</small>
                )}
              </div>

              {/* Content Area */}
              {editingDraft === draft.id ? (
                <div className="edit-mode">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="draft-textarea"
                    rows={8}
                  />
                  <div className="edit-actions">
                    <button
                      className="btn-save"
                      onClick={() => handleSaveEdit(draft.id)}
                      disabled={loading}
                    >
                      ✓ Save
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="draft-content">
                  <p>{draft.draft_content}</p>
                </div>
              )}

              {/* Action Buttons */}
              {draft.status !== 'sent' && editingDraft !== draft.id && (
                <div className="draft-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEditClick(draft)}
                    disabled={loading}
                    title="Edit the draft content"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn-send"
                    onClick={() => handleSendDraft(draft.id)}
                    disabled={loading}
                    title="Send to customer via Zendesk"
                  >
                    📤 Send
                  </button>
                </div>
              )}

              {draft.status === 'sent' && (
                <div className="sent-indicator">
                  ✅ Sent to customer
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ℹ️ Info section */}
      <div className="playbooks-info">
        <h3>How it works:</h3>
        <ul>
          <li>🔍 <strong>Detection:</strong> When a ticket arrives, it's classified for signals (churn risk, expansion, etc.)</li>
          <li>🤖 <strong>Generation:</strong> AI creates role-specific draft responses</li>
          <li>✏️ <strong>Customization:</strong> Team members can edit drafts to match brand voice</li>
          <li>📤 <strong>Sending:</strong> One click sends via Zendesk to the customer</li>
        </ul>
      </div>
    </div>
  );
}
