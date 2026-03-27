const pool = require("../config/database");
const { generateEmbedding, cosineSimilarity } = require("../utils/embedding");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==========================================
// HELPER: Safe JSON parse (MySQL2 auto-parses JSON columns)
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
async function storeConversationEmbedding(user_id, account_id, userMessage, assistantReply, role) {
  try {
    const embedding = await generateEmbedding(
      `User: ${userMessage}\nAssistant: ${assistantReply}`
    );

    if (!embedding) return;

    await pool.execute(
      `INSERT INTO chat_embeddings 
       (user_id, account_id, type, content, embedding, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        account_id,
        "conversation",
        JSON.stringify({ user_message: userMessage, assistant_reply: assistantReply }),
        JSON.stringify(embedding),
        JSON.stringify({ role, timestamp: new Date().toISOString() }),
      ]
    );

    console.log("💬 Stored in chat_embeddings");
  } catch (err) {
    console.error("❌ Failed to store chat embedding:", err.message);
  }
}

// ==========================================
// MAIN CHAT HANDLER
// ==========================================
const chat = async (req, res) => {
  try {
    const { user_id, role, message } = req.body;

    if (!user_id || !role || !message) {
      return res.status(400).json({ error: "user_id, role and message are required" });
    }

    // 1. Get account_id
    const [accountRows] = await pool.execute(
      "SELECT zendesk_account_id FROM zendesk_accounts WHERE user_id = ?",
      [user_id]
    );

    if (accountRows.length === 0) {
      return res.status(400).json({ error: "No account found for user" });
    }

    const account_id = accountRows[0].zendesk_account_id;

    // 2. Embed the query
    const queryEmbedding = await generateEmbedding(message);

    // 3. Fetch from BOTH tables in parallel
    const [[ticketRows], [chatRows]] = await Promise.all([
      pool.execute(
        `SELECT *, 'ticket' AS source FROM embeddings WHERE account_id = ?`,
        [account_id]
      ),
      pool.execute(
        `SELECT *, 'conversation' AS source FROM chat_embeddings 
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
        [user_id]
      ),
    ]);

    console.log(`📦 Ticket embeddings: ${ticketRows.length} | 💬 Chat embeddings: ${chatRows.length}`);

    // 4. Combine all rows
    const allRows = [...ticketRows, ...chatRows];

    // 5. Score ALL together (safe parse for both string and object)
    const scored = allRows.map((row) => ({
      ...row,
      score: cosineSimilarity(
        queryEmbedding,
        safeParse(row.embedding)
      ),
    }));

    // 6. Split top results by source
    const topTickets = scored
      .filter((r) => r.source === "ticket")
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const topConversations = scored
      .filter((r) => r.source === "conversation")
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log(`🎯 Top tickets: ${topTickets.length} | 🧠 Top conversations: ${topConversations.length}`);

    // 7. Build ticket context
    const ticketContext = topTickets.length > 0
      ? topTickets.map((r) => {
          const c = safeParse(r.content);
          return `
Ticket: ${c.subject || "N/A"}
Description: ${c.description || "N/A"}
Signal: ${c.signal || "N/A"}
Summary: ${c.summary || "N/A"}
Assigned To: ${c.assigned_to || "N/A"}
          `.trim();
        }).join("\n\n---\n\n")
      : "No relevant tickets found.";

    // 8. Build conversation context
    const conversationContext = topConversations.length > 0
      ? topConversations.map((r) => {
          const c = safeParse(r.content);
          return `User said: ${c.user_message}\nAssistant replied: ${c.assistant_reply}`;
        }).join("\n\n---\n\n")
      : "No past conversation found.";

    // 9. Build Groq messages
    const messages = [
      {
        role: "system",
        content: `You are a CRM assistant with semantic memory.
- Use PAST CONVERSATION CONTEXT to recall what the user told you earlier (name, preferences, etc).
- Use TICKET CONTEXT to answer ticket related questions.
- Always prioritize what the user told you directly over ticket data.
- Be concise and helpful.

User Role: ${role}

PAST CONVERSATION CONTEXT:
${conversationContext}

TICKET CONTEXT:
${ticketContext}`,
      },
      { role: "user", content: message },
    ];

    // 10. Call Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4,
    });

    const reply = completion.choices[0].message.content;

    // 11. Store this turn into chat_embeddings (non-blocking)
    storeConversationEmbedding(user_id, account_id, message, reply, role);

    return res.json({
      reply,
      sources: {
        tickets: topTickets.map((r) => r.ticket_id),
        conversations: topConversations.length,
      },
    });

  } catch (err) {
    console.error("❌ Chat error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// CLEAR chat history
// ==========================================
const clearChat = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    await pool.execute(
      `DELETE FROM chat_embeddings WHERE user_id = ?`,
      [user_id]
    );

    return res.json({ message: "Chat history cleared" });

  } catch (err) {
    console.error("❌ clearChat error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { chat, clearChat };