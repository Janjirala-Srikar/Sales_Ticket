import { useEffect, useMemo, useRef, useState } from 'react';
import { LuBot, LuMessageCircle, LuSendHorizonal, LuSparkles, LuX } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';

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

export default function ChatbotWidget({ variant = 'floating' }) {
  const { authAxios, user } = useAuth();
  const isFull = variant === 'full';
  const [open, setOpen] = useState(isFull);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState(() => [
    createMessage(
      'assistant',
      'Ask about tickets, signals, account context, or conversation memory.'
    ),
  ]);
  const threadRef = useRef(null);

  const displayRole = useMemo(() => formatRoleLabel(user?.role), [user?.role]);
  const userId = user?.id || user?.userId || null;
  const chatRole = displayRole;
  const sessionStorageKey = useMemo(
    () => (userId ? `ts_chat_session_${userId}` : ''),
    [userId]
  );

  useEffect(() => {
    if (!open || !threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (isFull) setOpen(true);
  }, [isFull]);

  useEffect(() => {
    if (!sessionStorageKey) {
      setSessionId('');
      return;
    }

    const storedSession = localStorage.getItem(sessionStorageKey) || '';
    setSessionId(storedSession);
  }, [sessionStorageKey]);

  const ensureSession = async () => {
    if (!userId) return '';
    if (sessionId) return sessionId;

    const response = await authAxios.post('/chat/session/start', { user_id: userId });
    const nextSessionId = response.data?.session_id || '';

    if (nextSessionId && sessionStorageKey) {
      localStorage.setItem(sessionStorageKey, nextSessionId);
    }

    setSessionId(nextSessionId);
    return nextSessionId;
  };

  const submitMessage = async (nextText) => {
    const text = String(nextText || '').trim();
    if (!text || isSending || !userId) return;

    const activeSessionId = await ensureSession();
    const userMessage = createMessage('user', text);
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setIsSending(true);

    try {
      const response = await authAxios.post('/chat', {
        user_id: userId,
        role: chatRole,
        message: text,
        session_id: activeSessionId,
      });

      const reply = response.data?.reply || 'I could not generate a reply just now.';
      const returnedSessionId = response.data?.session_id || activeSessionId;

      if (returnedSessionId && sessionStorageKey) {
        localStorage.setItem(sessionStorageKey, returnedSessionId);
        setSessionId(returnedSessionId);
      }

      setMessages((current) => [
        ...current,
        createMessage('assistant', reply),
      ]);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'The assistant could not reach the chat service.';

      setMessages((current) => [
        ...current,
        createMessage('assistant', `I hit a backend error: ${message}`),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitMessage(draft);
  };

  return (
    <div className={`chatbot-widget ${isFull ? 'chatbot-widget--full' : ''}`}>
      {open && (
        <section
          id="chatbot-panel"
          className={`chatbot-panel ${isFull ? 'chatbot-panel--full' : ''}`}
          aria-label="Chat assistant"
        >
          <div className="chatbot-panel__header">
            <div className="chatbot-panel__identity">
              <div className="chatbot-panel__avatar">
                <LuBot />
              </div>
              <div>
                <h2 className="chatbot-panel__title">Sales Ticket Copilot</h2>
              </div>
            </div>
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

          <div className="chatbot-thread" ref={threadRef}>
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';

              return (
                <div
                  key={message.id}
                  className={`chatbot-message-row ${isAssistant ? 'chatbot-message-row--assistant' : 'chatbot-message-row--user'}`}
                >
                  <div className={`chatbot-message-stack ${isAssistant ? '' : 'chatbot-message-stack--user'}`}>
                    <div className={`chatbot-message ${isAssistant ? 'chatbot-message--assistant' : 'chatbot-message--user'}`}>
                      <p>{message.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="chatbot-message-row chatbot-message-row--assistant">
                <div className="chatbot-message-avatar">
                  <LuSparkles />
                </div>
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

          <form className="chatbot-composer" onSubmit={handleSubmit}>
            <div className="chatbot-composer__shell">
              <textarea
                className="chatbot-composer__input"
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage(draft);
                  }
                }}
                placeholder="Message Sales Ticket Copilot..."
              />
              <button
                type="submit"
                className="chatbot-composer__send"
                disabled={isSending || !draft.trim() || !userId}
                aria-label="Send message"
              >
                <LuSendHorizonal />
              </button>
            </div>
          </form>
        </section>
      )}

      {!isFull && (
        <button
          type="button"
          className="chatbot-launcher"
          onClick={() => setOpen((value) => !value)}
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
