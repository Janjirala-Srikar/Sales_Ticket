const pool = require("../config/database");
const { generateEmbedding, cosineSimilarity } = require("../utils/embedding");
const Groq = require("groq-sdk");
const { v4: uuidv4 } = require("uuid");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==========================================
// HELPER: Safe JSON parse
// ==========================================
function safeParse(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// ==========================================
// HELPER: Store conversation into chat_embeddings
// ==========================================
async function storeConversationEmbedding(
  user_id,
  account_id,
  userMessage,
  assistantReply,
  role,
  session_id
) {
  try {
    const embedding = await generateEmbedding(
      `User: ${userMessage}\nAssistant: ${assistantReply}`
    );

    if (!embedding) {
      console.warn("⚠️ No embedding generated — skipping store.");
      return;
    }

    await pool.execute(
      `INSERT INTO chat_embeddings 
       (user_id, account_id, type, content, embedding, metadata, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        account_id,
        "conversation",
        JSON.stringify({
          user_message: userMessage,
          assistant_reply: assistantReply,
        }),
        JSON.stringify(embedding),
        JSON.stringify({ role, timestamp: new Date().toISOString() }),
        session_id,
      ]
    );

    console.log("💬 Stored in chat_embeddings | session:", session_id);
  } catch (err) {
    console.error("❌ Failed to store chat embedding:", err.message);
  }
}

// ==========================================
// HELPER: Validate session belongs to user
// ==========================================
async function validateSession(user_id, session_id) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM chat_sessions 
       WHERE user_id = ? AND session_id = ?`,
      [user_id, session_id]
    );
    return rows[0]?.count > 0;
  } catch {
    // If chat_sessions table doesn't exist, skip validation
    return true;
  }
}

// ==========================================
// START SESSION — call this when chat opens
// ==========================================
const startSession = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const session_id = uuidv4();

    // Optionally persist session to DB so it can be validated later
    try {
      await pool.execute(
        `INSERT IGNORE INTO chat_sessions (user_id, session_id, created_at)
         VALUES (?, ?, NOW())`,
        [user_id, session_id]
      );
    } catch {
      // Table may not exist yet — that's okay, session still works
      console.warn("⚠️ Could not persist session to chat_sessions table.");
    }

    console.log("🆕 New session started:", session_id, "for user:", user_id);

    return res.json({ session_id });
  } catch (err) {
    console.error("❌ startSession error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// MAIN CHAT HANDLER
// ==========================================
const chat = async (req, res) => {
  try {
    const { user_id, role, message, session_id } = req.body;

    // 1. Validate required fields
    if (!user_id || !role || !message || !session_id) {
      return res.status(400).json({
        error: "user_id, role, message and session_id are required",
        received: { user_id: !!user_id, role: !!role, message: !!message, session_id: !!session_id },
      });
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message must be a non-empty string" });
    }

    // 2. Get account_id
    const [accountRows] = await pool.execute(
      "SELECT zendesk_account_id FROM zendesk_accounts WHERE user_id = ?",
      [user_id]
    );

    if (accountRows.length === 0) {
      return res.status(400).json({ error: "No Zendesk account found for this user" });
    }

    const account_id = accountRows[0].zendesk_account_id;

    // 3. Embed the query
    const queryEmbedding = await generateEmbedding(message.trim());

    if (!queryEmbedding) {
      return res.status(500).json({ error: "Failed to generate query embedding" });
    }

    // 4. Fetch ticket embeddings and session chat history in parallel
    const [[ticketRows], [chatRows]] = await Promise.all([
      pool.execute(
        `SELECT *, 'ticket' AS source FROM embeddings WHERE account_id = ?`,
        [account_id]
      ),
      pool.execute(
        `SELECT *, 'conversation' AS source FROM chat_embeddings 
         WHERE user_id = ? AND session_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [user_id, session_id]
      ),
    ]);

    console.log(
      `📦 Ticket embeddings: ${ticketRows.length} | 💬 Chat embeddings (session): ${chatRows.length}`
    );

    // 5. Combine and score by cosine similarity
    const allRows = [...ticketRows, ...chatRows];

    const scored = allRows
      .map((row) => {
        const embedding = safeParse(row.embedding);
        if (!Array.isArray(embedding)) return null; // skip malformed rows
        return {
          ...row,
          score: cosineSimilarity(queryEmbedding, embedding),
        };
      })
      .filter(Boolean); // remove nulls

    // 6. Top results by source
    const topTickets = scored
      .filter((r) => r.source === "ticket")
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const topConversations = scored
      .filter((r) => r.source === "conversation")
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log(
      `🎯 Top tickets: ${topTickets.length} | 🧠 Top conversations: ${topConversations.length}`
    );

    // 7. Build ticket context
    const ticketContext =
      topTickets.length > 0
        ? topTickets
            .map((r) => {
              const c = safeParse(r.content);
              return `
Ticket: ${c.subject || "N/A"}
Description: ${c.description || "N/A"}
Signal: ${c.signal || "N/A"}
Summary: ${c.summary || "N/A"}
Assigned To: ${c.assigned_to || "N/A"}
              `.trim();
            })
            .join("\n\n---\n\n")
        : "No relevant tickets found.";

    // 8. Build conversation context
    const conversationContext =
      topConversations.length > 0
        ? topConversations
            .map((r) => {
              const c = safeParse(r.content);
              return `User said: ${c.user_message}\nAssistant replied: ${c.assistant_reply}`;
            })
            .join("\n\n---\n\n")
        : "No past conversation found.";

    // 9. Build Groq messages
    const groqMessages = [
      {
        role: "system",
        content: `You are a CRM assistant with semantic memory.
- Use PAST CONVERSATION CONTEXT to recall what the user told you in THIS session.
- Use TICKET CONTEXT to answer ticket related questions.
- Always prioritize what the user told you directly over ticket data.
- Be concise and helpful.
- If you don't know something, say so clearly.

User Role: ${role}

PAST CONVERSATION CONTEXT (current session only):
${conversationContext}

TICKET CONTEXT:
${ticketContext}`,
      },
      { role: "user", content: message.trim() },
    ];

    // 10. Call Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      temperature: 0.4,
      max_tokens: 1024,
    });

    const reply = completion.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: "No reply generated from AI model" });
    }

    // 11. Store this turn (non-blocking — errors logged, not thrown)
    storeConversationEmbedding(user_id, account_id, message, reply, role, session_id);

    return res.json({
      reply,
      session_id,
      sources: {
        tickets: topTickets.map((r) => r.ticket_id).filter(Boolean),
        conversations: topConversations.length,
      },
    });
  } catch (err) {
    console.error("❌ Chat error:", err.message, err.stack);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// ==========================================
// GET session history (optional utility)
// ==========================================
const getSessionHistory = async (req, res) => {
  try {
    const { user_id, session_id } = req.query;

    if (!user_id || !session_id) {
      return res.status(400).json({ error: "user_id and session_id are required" });
    }

    const [rows] = await pool.execute(
      `SELECT content, metadata, created_at 
       FROM chat_embeddings 
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at ASC`,
      [user_id, session_id]
    );

    const history = rows.map((row) => ({
      ...safeParse(row.content),
      timestamp: safeParse(row.metadata)?.timestamp || row.created_at,
    }));

    return res.json({ session_id, history });
  } catch (err) {
    console.error("❌ getSessionHistory error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// CLEAR chat history for a session
// ==========================================
const clearChat = async (req, res) => {
  try {
    const { user_id, session_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    if (session_id) {
      await pool.execute(
        `DELETE FROM chat_embeddings WHERE user_id = ? AND session_id = ?`,
        [user_id, session_id]
      );
      console.log(`🗑️ Cleared session ${session_id} for user ${user_id}`);
    } else {
      await pool.execute(
        `DELETE FROM chat_embeddings WHERE user_id = ?`,
        [user_id]
      );
      console.log(`🗑️ Cleared ALL chat history for user ${user_id}`);
    }

    return res.json({ message: "Chat history cleared", session_id: session_id || "all" });
  } catch (err) {
    console.error("❌ clearChat error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { chat, startSession, clearChat, getSessionHistory };