const pool = require("../config/database");
const { classifyTicket } = require("../utils/groqClassifier");
const { generateEmbedding } = require("../utils/embedding");

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
    console.log("🔥 WEBHOOK HIT");

    const accountId = req.headers["x-zendesk-account-id"];
    console.log("📌 Account ID:", accountId);

    const ticket = req.body.ticket;

    if (!ticket) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log("📨 Ticket:", ticket);

    // 🔍 STEP 1: Map account → user
    const [rows] = await pool.execute(
      "SELECT user_id FROM zendesk_accounts WHERE zendesk_account_id = ?",
      [accountId]
    );

    if (rows.length === 0) {
      console.log("❌ No mapping found for account:", accountId);
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

    // 🔍 STEP 3: Insert / Update ticket
    await pool.execute(
      `INSERT INTO tickets 
      (zendesk_ticket_id, zendesk_account_id, user_id, subject, description, priority, status, tags, receiver_email, sender_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        description = VALUES(description),
        priority = VALUES(priority),
        status = VALUES(status),
        tags = VALUES(tags),
        receiver_email = VALUES(receiver_email),
        sender_email = VALUES(sender_email)
      `,
      [
        zendeskTicketId,
        accountId,
        userId,
        subject,
        description,
        priority,
        status,
        tags,
        receiverEmail,
        senderEmail,
      ]
    );

    console.log("✅ Ticket stored for user:", userId);

    // 🔍 STEP 4: Classification
    const signals = await classifyTicket(subject, description);
    console.log("🎯 Signals:", signals);

    // 🔍 STEP 5: Store signals (SAFE INSERT)
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
          } catch (err) {
            console.error("❌ Signal insert failed:", {
              signal,
              receiverEmail,
              error: err.message,
            });
          }
        })
      );

      console.log("✅ Signals stored:", signals.length);
    }

    // 🔥 STEP 6: EMBEDDINGS (SAFE + STRUCTURED)
    if (signals.length > 0) {
      await Promise.all(
        signals.map(async (signal) => {
          try {
            const embedding = await generateEmbedding({
              subject,
              description,
              signal: signal.type,
              summary: signal.summary,
              receiver_email: receiverEmail,
              assigned_to: signal.assigned_to,
            });

            if (!embedding) return;

            await pool.execute(
              `INSERT INTO embeddings 
              (ticket_id, account_id, content, embedding, type, metadata)
              VALUES (?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                content = VALUES(content),
                embedding = VALUES(embedding),
                metadata = VALUES(metadata)`,
              [
                zendeskTicketId,
                accountId,
                JSON.stringify({
                  subject,
                  description,
                  signal: signal.type,
                  summary: signal.summary,
                  receiver_email: receiverEmail,
                  assigned_to: signal.assigned_to,
                }),
                JSON.stringify(embedding),
                signal.type,
                JSON.stringify({
                  signal: signal.type,
                  assigned_to: signal.assigned_to,
                  receiver_email: receiverEmail,
                }),
              ]
            );

            console.log("🧠 Upserted:", signal.type);
          } catch (err) {
            console.error("❌ Embedding failed:", err.message);
          }
        })
      );
    }

    return res.status(200).json({
      message: "Ticket processed successfully",
      signals_detected: signals.length,
    });

  } catch (err) {
    console.error("❌ Error in createTicket:", err);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
};

// ✅ GET all tickets
const getAllTicketsofUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [tickets] = await pool.execute(
      "SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    return res.status(200).json({ tickets });

  } catch (err) {
    console.error("❌ getAllTicketsofUser error:", err);
    return res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

// ✅ GET signals
const getSignals = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({ error: "user_id and role are required" });
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

    return res.status(200).json({ signals });

  } catch (err) {
    console.error("❌ getSignals error:", err);
    return res.status(500).json({ error: "Failed to fetch signals" });
  }
};

module.exports = {
  createTicket,
  getAllTicketsofUser,
  getSignals,
};