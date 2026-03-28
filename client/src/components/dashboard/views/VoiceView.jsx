import React, { useEffect, useMemo, useState } from 'react';
import { LuBuilding2, LuClock3, LuMic2 } from 'react-icons/lu';
import { useAuth } from '../../../context/AuthContext';
import './VoiceView.css';

function formatDateTime(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function normalizeAudioTicket(item, apiBase, userId) {
  return {
    id: item?.id ?? '',
    company_name: item?.company_name || 'Unknown company',
    created_at: item?.created_at || null,
    playback_url:
      item?.playback_url ||
      (item?.id && userId ? `${apiBase}/audio-tickets/${userId}/${item.id}/stream` : ''),
  };
}

export default function VoiceView() {
  const { API_BASE, user, token, zendeskContext } = useAuth();
  const [audioTickets, setAudioTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = user?.id || user?.userId || null;

  useEffect(() => {
    if (!userId) return;

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/audio-tickets/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`Failed to load audio tickets (${response.status})`);
        }

        const data = await response.json();
        console.log('VoiceView audio response object:', data);
        const rows = Array.isArray(data?.audio_tickets) ? data.audio_tickets : [];
        setAudioTickets(rows.map((item) => normalizeAudioTicket(item, API_BASE, userId)));
        setError('');
      } catch (err) {
        console.error('Error fetching audio tickets:', err);
        setError(err.message || 'Failed to load audio tickets');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [API_BASE, token, userId]);

  const stats = useMemo(
    () => ({
      totalAudioTickets: audioTickets.length,
      readyToPlay: audioTickets.filter((item) => Boolean(item.playback_url)).length,
      companies: new Set(audioTickets.map((item) => item.company_name).filter(Boolean)).size,
    }),
    [audioTickets]
  );

  const zendeskContextStatus = useMemo(() => {
    if (!zendeskContext) return 'Pending';
    if (zendeskContext.ready) return 'Ready';
    if (zendeskContext.fallback) return 'Fallback';
    if (zendeskContext.missing_credentials) return 'Missing creds';
    return 'Unavailable';
  }, [zendeskContext]);

  return (
    <div className="voice-view">
      <section className="voice-hero">
        <div className="voice-hero__copy">
          <p className="voice-hero__eyebrow">Voice Inbox</p>
          <h1>Listen to recorded voicemail clips through the authenticated Zendesk audio proxy.</h1>
          <p className="voice-hero__lede">
            Login initializes a Zendesk audio context on the server, and every player uses that
            authenticated proxy instead of requesting Zendesk files directly from the browser.
          </p>
        </div>

        <div className="voice-stats">
          <div className="voice-stat">
            <span>Audio Tickets</span>
            <strong>{stats.totalAudioTickets}</strong>
          </div>
          <div className="voice-stat">
            <span>Playable</span>
            <strong>{stats.readyToPlay}</strong>
          </div>
          <div className="voice-stat">
            <span>Companies</span>
            <strong>{stats.companies}</strong>
          </div>
          <div className="voice-stat">
            <span>Zendesk Context</span>
            <strong>{zendeskContextStatus}</strong>
          </div>
        </div>
      </section>

      {error && <div className="voice-alert voice-alert--error">{error}</div>}

      {loading ? (
        <div className="voice-empty">
          <h2>Loading audio tickets...</h2>
          <p>Pulling the latest voicemail recordings for this user.</p>
        </div>
      ) : audioTickets.length === 0 ? (
        <div className="voice-empty">
          <h2>No audio tickets yet</h2>
          <p>When voicemail tickets are created, they will appear here as playable cards.</p>
        </div>
      ) : (
        <section className="voice-grid">
          {audioTickets.map((item) => (
            <article key={item.id} className="voice-card voice-card--compact">
              <div className="voice-card__compact-row">
                <div className="voice-card__compact-chip">
                  <LuBuilding2 size={15} />
                  <div>
                    <span>Company Name</span>
                    <strong>{item.company_name}</strong>
                  </div>
                </div>

                <div className="voice-card__compact-chip">
                  <LuClock3 size={15} />
                  <div>
                    <span>Time</span>
                    <strong>{formatDateTime(item.created_at)}</strong>
                  </div>
                </div>
              </div>

              <div className="voice-audio-card">
                <div className="voice-audio-card__header">
                  <div>
                    <span>Playback</span>
                    <strong>{item.playback_url ? 'Ready to listen' : 'Unavailable'}</strong>
                  </div>
                  <span className="voice-chip voice-chip--accent">
                    <LuMic2 size={14} />
                    <span>Audio</span>
                  </span>
                </div>
                {item.playback_url ? (
                  <audio className="voice-audio-card__player" controls preload="none">
                    <source src={item.playback_url} />
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <div className="voice-empty-inline">Audio file is not available for this ticket.</div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
