const pool = require("../config/database");
const { classifyTicket } = require("../utils/groqClassifier");
const { generateDraftFromSignal } = require("../utils/aiDraftGenerator");
const { sendReplyToZendesk } = require("../utils/zendeskSender");

const LEGACY_ROLE_LABEL_MAP = {
  product_manager: "Product Manager",
  customer_success_manager: "Customer Success Manager",
  sales_manager: "Account Executive",
  sales_rep: "Account Executive",
};

// 🔥 HELPER: sanitize values (CRITICAL FIX)
function safeString(value) {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  return null;
}

// ✅ POST /api/tickets
const createTicket = async (req, res) => {
  try {
    // ✅ Check if body was successfully parsed
    if (req.bodyParseError) {
      return res.status(400).json({ 
        error: "Invalid JSON in request body", 
        details: req.bodyParseError.message 
      });
    }

    const accountId = req.headers["x-zendesk-account-id"];
    let ticket = req.body?.ticket;

    // Fallback: if body IS the ticket (not wrapped)
    if (!ticket && req.body?.id && req.body?.subject) {
      ticket = req.body;
    }

    if (!ticket) {
      console.error('❌ No ticket data found in payload');
      console.log('Available body keys:', Object.keys(req.body || {}));
      return res.status(400).json({ 
        error: "Invalid payload - no ticket data",
        received: Object.keys(req.body || {})
      });
    }

    console.log('✅ Ticket extracted:', { 
      id: ticket.id, 
      subject: ticket.subject?.substring(0, 50)
    });
    
    // 🔍 map account → user
    const [rows] = await pool.execute(
      "SELECT user_id FROM zendesk_accounts WHERE zendesk_account_id = ?",
      [accountId]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Unknown Zendesk account" });
    }

    const userId = rows[0].user_id;

    // 🔍 STEP 2: Extract fields safely
    const zendeskTicketId = String(ticket.id);
    const subject = safeString(ticket.subject) || "";
    const description = safeString(ticket.description) || "";
    const priority = safeString(ticket.priority) || "normal";
    const status = "open";

    const tags = JSON.stringify(
      Array.isArray(ticket.tags) ? ticket.tags : []
    );

    const receiverEmail = safeString(ticket.receiver_email);
    const senderEmail = safeString(ticket.requester?.email);

    // ✅ store ticket
    await pool.execute(
      `INSERT INTO tickets 
      (zendesk_ticket_id, zendesk_account_id, user_id, subject, description, receiver_email, sender_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        description = VALUES(description),
        receiver_email = VALUES(receiver_email),
        sender_email = VALUES(sender_email)`,
      [
        zendeskTicketId,
        accountId,
        userId,
        subject,
        description,
        receiverEmail,
        senderEmail,
      ]
    );

    // ✅ classify signals
    const signals = await classifyTicket(subject, description);

    // 🔍 STEP 5: Store signals + drafts + embeddings (ALL IN ONE LOOP)
    if (signals.length > 0) {
      await Promise.all(
        signals.map(async (signal) => {
          try {
            const safeHeadline = safeString(signal.headline) || "";
            const safeSummary = safeString(signal.summary) || "";
            const safeAssignedTo = safeString(signal.assigned_to);
            const safeReceiverEmail = receiverEmail;

            console.log("🚀 INSERT SIGNAL:", {
              zendeskTicketId,
              userId,
              type: signal.type,
              assigned_to: safeAssignedTo,
              receiverEmail: safeReceiverEmail,
            });

            // ✅ 1. Insert signal
            await pool.execute(
              `INSERT INTO ticket_signals 
              (zendesk_ticket_id, user_id, signal_type, headline, summary, assigned_to, receiver_email)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                headline = VALUES(headline),
                summary = VALUES(summary),
                assigned_to = VALUES(assigned_to),
                receiver_email = VALUES(receiver_email)`,
              [
                zendeskTicketId,
                userId,
                signal.type,
                safeHeadline,
                safeSummary,
                safeAssignedTo,
                safeReceiverEmail,
              ]
            );

            // ✅ 2. Generate AI draft (now async with Groq AI)
            const draft = await generateDraftFromSignal(signal, { 
              subject, 
              description,
              receiver_email: receiverEmail 
            });

            await pool.execute(
              `INSERT INTO ai_drafts 
              (zendesk_ticket_id, user_id, signal_type, assigned_to, draft_content, status)
              VALUES (?, ?, ?, ?, ?, 'generated')
              ON DUPLICATE KEY UPDATE 
                draft_content = VALUES(draft_content),
                status = VALUES(status)`,
              [
                zendeskTicketId,
                userId,
                signal.type,
                safeAssignedTo,
                draft,
              ]
            );

            console.log("✅ Draft generated successfully for:", signal.type, "🤖 (AI-powered)");

          } catch (err) {
            console.error("❌ Signal/Draft processing failed:", {
              signal: signal.type,
              error: err.message,
            });
          }
        })
      );
    }

    res.json({
      message: "Ticket processed successfully",
      signals_detected: signals.length,
    });

  } catch (err) {
    console.error("❌ createTicket error:", err);
    res.status(500).json({ error: "Error processing ticket" });
  }
};



// ==============================
// ✅ GET ALL TICKETS (OLD)
// ==============================
const getAllTicketsofUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const [tickets] = await pool.execute(
      "SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    res.json({ tickets });

  } catch (err) {
    console.error("❌ getAllTicketsofUser error:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};



// ==============================
// ✅ GET SIGNALS (ROLE-BASED)
// ==============================
const getSignals = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({ error: "user_id and role required" });
    }

    const normalizedRole = String(role).trim();
    const legacyRole = LEGACY_ROLE_LABEL_MAP[normalizedRole];

    const [signals] = legacyRole
      ? await pool.execute(
          `SELECT * FROM ticket_signals 
           WHERE user_id = ? AND assigned_to IN (?, ?)`,
          [user_id, normalizedRole, legacyRole]
        )
      : await pool.execute(
          `SELECT * FROM ticket_signals 
           WHERE user_id = ? AND assigned_to = ?`,
          [user_id, normalizedRole]
        );

    res.json({ signals });

  } catch (err) {
    console.error("❌ getSignals error:", err);
    res.status(500).json({ error: "Failed to fetch signals" });
  }
};



// ==============================
// ✅ GET DRAFTS (NEW)
// ==============================
const getDraftsByRole = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    const [drafts] = await pool.execute(
      `SELECT * FROM ai_drafts 
       WHERE user_id = ? AND assigned_to = ?
       ORDER BY created_at DESC`,
      [user_id, role]
    );

    res.json({ drafts });

  } catch (err) {
    console.error("❌ getDrafts error:", err);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
};



// ==============================
// ✅ UPDATE DRAFT
// ==============================
const updateDraft = async (req, res) => {
  try {
    const { draft_id, content } = req.body;

    await pool.execute(
      `UPDATE ai_drafts 
       SET draft_content = ?, status='edited' 
       WHERE id = ?`,
      [content, draft_id]
    );

    res.json({ message: "Draft updated" });

  } catch (err) {
    console.error("❌ updateDraft error:", err);
    res.status(500).json({ error: "Update failed" });
  }
};



// ==============================
// ✅ SEND DRAFT (Zendesk)
// ==============================
const sendDraft = async (req, res) => {
  try {
    const { draft_id } = req.body;

    await sendReplyToZendesk({ draftId: draft_id });

    await pool.execute(
      `UPDATE ai_drafts SET status='sent' WHERE id=?`,
      [draft_id]
    );

    res.json({ message: "Reply sent via Zendesk" });

  } catch (err) {
    console.error("❌ sendDraft error:", err);
    res.status(500).json({ error: err.message });
  }
};



// ==============================
// ✅ EXPORT ALL
// ==============================
module.exports = {
  createTicket,
  getAllTicketsofUser,   // ✅ restored
  getSignals,            // ✅ restored
  getDraftsByRole,
  updateDraft,
  sendDraft,
};