import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { LuBot, LuMessageCircle, LuSendHorizonal, LuSparkles, LuX, LuTrash2 } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';

// ==========================================
// HELPERS
// ==========================================
function formatRoleLabel(value) {
  if (!value) return 'Root User';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date(),
    ...extra,
  };
}

const INITIAL_MESSAGE = createMessage(
  'assistant',
  'Ask about tickets, signals, account context, or conversation memory.'
);

// ==========================================
// COMPONENT
// ==========================================
export default function ChatbotWidget({ variant = 'floating' }) {
  const { authAxios, user } = useAuth();
  const isFull = variant === 'full';

  const [open, setOpen] = useState(isFull);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);

  // Use a ref so ensureSession always reads the latest value without stale closure
  const sessionRef = useRef('');
  // Guard against concurrent session creation
  const sessionCreatingRef = useRef(false);

  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  // ---- derived values ----
  const userId = user?.id || user?.userId || null;
  const displayRole = useMemo(() => formatRoleLabel(user?.role), [user?.role]);
  const sessionStorageKey = useMemo(
    () => (userId ? `ts_chat_session_${userId}` : ''),
    [userId]
  );

  // ==========================================
  // Auto-scroll thread on new messages
  // ==========================================
  useEffect(() => {
    if (!open || !threadRef.current) return;
    threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, isSending]);

  // ==========================================
  // Force open when full variant
  // ==========================================
  useEffect(() => {
    if (isFull) setOpen(true);
  }, [isFull]);

  // ==========================================
  // Initialize session on mount (not on first message)
  // FIX: Sessions are started eagerly so first message never fails
  // ==========================================
  useEffect(() => {
    if (!userId || !sessionStorageKey) return;

    const stored = localStorage.getItem(sessionStorageKey) || '';

    if (stored) {
      // Reuse persisted session
      sessionRef.current = stored;
      setSessionId(stored);
      console.log('♻️ Reusing stored session:', stored);
      return;
    }

    // Start a fresh session immediately
    let cancelled = false;
    setIsSessionLoading(true);

    authAxios
      .post('/chat/session/start', { user_id: userId })
      .then((res) => {
        if (cancelled) return;
        const id = res.data?.session_id || '';
        if (id) {
          sessionRef.current = id;
          setSessionId(id);
          localStorage.setItem(sessionStorageKey, id);
          console.log('🆕 Session started on mount:', id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('❌ Failed to start session on mount:', err.message);
      })
      .finally(() => {
        if (!cancelled) setIsSessionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, sessionStorageKey]); // intentionally omitting authAxios (stable ref)

  // ==========================================
  // ensureSession — reads from ref to avoid stale closure
  // FIX: uses ref + creation guard to prevent double-session race condition
  // ==========================================
  const ensureSession = useCallback(async () => {
    if (!userId) return '';

    // Already have one
    if (sessionRef.current) return sessionRef.current;

    // Another call is already creating one — wait for it
    if (sessionCreatingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return sessionRef.current;
    }

    sessionCreatingRef.current = true;
    try {
      const res = await authAxios.post('/chat/session/start', { user_id: userId });
      const id = res.data?.session_id || '';
      if (id) {
        sessionRef.current = id;
        setSessionId(id);
        if (sessionStorageKey) localStorage.setItem(sessionStorageKey, id);
        console.log('🆕 Session created (lazy fallback):', id);
      }
      return id;
    } catch (err) {
      console.error('❌ ensureSession failed:', err.message);
      return '';
    } finally {
      sessionCreatingRef.current = false;
    }
  }, [userId, sessionStorageKey, authAxios]);

  // ==========================================
  // submitMessage
  // ==========================================
  const submitMessage = useCallback(async (nextText) => {
    const text = String(nextText || '').trim();
    if (!text || isSending || !userId) return;

    // Append user message immediately for responsiveness
    setMessages((prev) => [...prev, createMessage('user', text)]);
    setDraft('');
    setIsSending(true);

    try {
      const activeSessionId = await ensureSession();

      if (!activeSessionId) {
        throw new Error('Could not establish a chat session. Please refresh and try again.');
      }

      const res = await authAxios.post('/chat', {
        user_id: userId,
        role: displayRole,
        message: text,
        session_id: activeSessionId,
      });

      const reply = res.data?.reply || 'I could not generate a reply just now.';
      const returnedSession = res.data?.session_id || activeSessionId;

      // Sync session if server returned a different one
      if (returnedSession && returnedSession !== sessionRef.current) {
        sessionRef.current = returnedSession;
        setSessionId(returnedSession);
        if (sessionStorageKey) localStorage.setItem(sessionStorageKey, returnedSession);
      }

      setMessages((prev) => [...prev, createMessage('assistant', reply)]);
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        'The assistant could not reach the chat service.';

      setMessages((prev) => [
        ...prev,
        createMessage('assistant', `⚠️ ${errMsg}`),
      ]);
    } finally {
      setIsSending(false);
      // Re-focus textarea after reply
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isSending, userId, displayRole, sessionStorageKey, ensureSession, authAxios]);

  // ==========================================
  // Handle form submit
  // ==========================================
  const handleSubmit = (event) => {
    event.preventDefault();
    void submitMessage(draft);
  };

  // ==========================================
  // Clear chat
  // ==========================================
  const handleClear = async () => {
    if (!userId) return;
    try {
      await authAxios.post('/chat/clear', {
        user_id: userId,
        session_id: sessionRef.current || undefined,
      });
    } catch (err) {
      console.warn('⚠️ Clear chat API error:', err.message);
    }

    // Reset local state and start a new session
    sessionRef.current = '';
    setSessionId('');
    if (sessionStorageKey) localStorage.removeItem(sessionStorageKey);
    setMessages([INITIAL_MESSAGE]);
    console.log('🗑️ Chat cleared — new session will be created on next message.');
  };

  // ==========================================
  // Textarea auto-resize
  // ==========================================
  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const canSend = !isSending && draft.trim().length > 0 && !!userId && !isSessionLoading;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className={`chatbot-widget ${isFull ? 'chatbot-widget--full' : ''}`}>
      {open && (
        <section
          id="chatbot-panel"
          className={`chatbot-panel ${isFull ? 'chatbot-panel--full' : 'chatbot-panel--floating'}`}
          aria-label="Chat assistant"
        >
          {/* Header */}
          <div className="chatbot-panel__header">
            <div className="chatbot-panel__identity">
              <div className="chatbot-panel__avatar">
                <LuBot />
              </div>
              <div className="chatbot-panel__identity-copy">
                <div className="chatbot-panel__title-row">
                  <h2 className="chatbot-panel__title">Sales Ticket Copilot</h2>
                  <div className="chatbot-panel__actions">
                    {/* Clear button */}
                    <button
                      type="button"
                      className="chatbot-panel__action-btn"
                      onClick={handleClear}
                      aria-label="Clear chat history"
                      title="Clear chat"
                      disabled={isSessionLoading}
                    >
                      <LuTrash2 />
                    </button>

                    {!isFull && (
                      <button
                        type="button"
                        className="chatbot-panel__close"
                        onClick={() => setOpen(false)}
                        aria-label="Close chat assistant"
                      >
                        <LuX />
                      </button>
                    )}
                  </div>
                </div>
                <p className="chatbot-panel__subtitle">
                  {isSessionLoading
                    ? 'Starting session…'
                    : sessionId
                    ? `Session active · ${displayRole}`
                    : `Signed in as ${displayRole}`}
                </p>
              </div>
            </div>
          </div>

          {/* Thread */}
          <div className="chatbot-thread" ref={threadRef}>
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div
                  key={message.id}
                  className={`chatbot-message-row ${
                    isAssistant
                      ? 'chatbot-message-row--assistant'
                      : 'chatbot-message-row--user'
                  }`}
                >
                  <div
                    className={`chatbot-message-stack ${
                      isAssistant ? '' : 'chatbot-message-stack--user'
                    }`}
                  >
                    <div
                      className={`chatbot-message ${
                        isAssistant
                          ? 'chatbot-message--assistant'
                          : 'chatbot-message--user'
                      }`}
                    >
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</p>
                    </div>
                    <span className="chatbot-message__time">
                      {message.createdAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isSending && (
              <div className="chatbot-message-row chatbot-message-row--assistant">
                <div className="chatbot-message-stack">
                  <div className="chatbot-message chatbot-message--assistant chatbot-message--typing">
                    <span className="chatbot-typing-dot" />
                    <span className="chatbot-typing-dot" />
                    <span className="chatbot-typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form className="chatbot-composer" onSubmit={handleSubmit}>
            <div className="chatbot-composer__shell">
              <textarea
                ref={textareaRef}
                className="chatbot-composer__input"
                rows={1}
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submitMessage(draft);
                  }
                }}
                placeholder={
                  isSessionLoading
                    ? 'Preparing session…'
                    : !userId
                    ? 'Please sign in to chat'
                    : 'Message Sales Ticket Copilot… (Shift+Enter for newline)'
                }
                disabled={!userId || isSessionLoading}
                aria-label="Chat message input"
              />
              <button
                type="submit"
                className="chatbot-composer__send"
                disabled={!canSend}
                aria-label="Send message"
              >
                {isSending ? <LuSparkles /> : <LuSendHorizonal />}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Launcher button (floating variant only) */}
      {!isFull && (
        <button
          type="button"
          className="chatbot-launcher"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="chatbot-panel"
          aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        >
          {open ? <LuX /> : <LuMessageCircle />}
        </button>
      )}
    </div>
  );
}
