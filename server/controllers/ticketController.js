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

function safeString(value) {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  return null;
}

// ==============================
// ✅ CREATE TICKET (FINAL FIXED)
// ==============================
const createTicket = async (req, res) => {
  try {
    if (req.bodyParseError) {
      return res.status(400).json({
        error: "Invalid JSON in request body",
        details: req.bodyParseError.message,
      });
    }

    const accountId = req.headers["x-zendesk-account-id"];
    let ticket = req.body?.ticket;

    if (!ticket && req.body?.id && req.body?.subject) {
      ticket = req.body;
    }

    if (!ticket) {
      return res.status(400).json({ error: "Invalid payload - no ticket data" });
    }

    console.log("✅ Ticket extracted:", {
      id: ticket.id,
      subject: ticket.subject,
    });

    const zendeskTicketId = String(ticket.id);

    // =========================
    // 🎧 VOICE DETECTION
    // =========================
    let audioUrl = safeString(ticket.recording_url);

    // ✅ FALLBACK 1: Try to extract from description
    if (!audioUrl && ticket.description) {
      const descMatch = ticket.description.match(
        /https:\/\/lumora\.zendesk\.com\/api\/v2\/channels\/voice\/calls\/[^\s\)\n]+/i
      );
      audioUrl = descMatch ? descMatch[0] : null;
      if (audioUrl) console.log("✅ Recording URL extracted from description");
    }

    // ✅ FALLBACK 2: Try to extract from latest_comment
    if (!audioUrl && ticket.latest_comment) {
      const commentMatch = ticket.latest_comment.match(
        /https:\/\/lumora\.zendesk\.com\/api\/v2\/channels\/voice\/calls\/[^\s\)\n]+/i
      );
      audioUrl = commentMatch ? commentMatch[0] : null;
      if (audioUrl) console.log("✅ Recording URL extracted from latest_comment");
    }

    const subjectText = (ticket.subject || "").toLowerCase().trim();

    console.log("🔍 Subject check:", subjectText);
    console.log("🎧 Audio URL:", audioUrl);

    const isVoiceMail =
      audioUrl ||
      subjectText.includes("voicemail") ||
      subjectText.includes("voice mail") ||
      subjectText.includes("abandoned call") ||
      subjectText.includes("missed call");

    // =========================
    // 🎧 VOICE MAIL FAST PATH
    // =========================
    if (isVoiceMail) {
      console.log("🚀 VOICE PATH TRIGGERED");
      console.log("🎧 Voicemail detected — details:");
      console.log("   zendesk_ticket_id :", zendeskTicketId);
      console.log("   audio_url         :", audioUrl || null);
      console.log("   subject           :", ticket.subject || "");
      console.log("\n📦 FULL TICKET:\n", JSON.stringify(ticket, null, 2));

      return res.json({
        message: "Voice mail received",
        type: "audio",
        zendesk_ticket_id: zendeskTicketId,
        audio_url: audioUrl || null,
      });
    }

    // =========================
    // ✅ NORMAL FLOW (TEXT)
    // =========================

    const [rows] = await pool.execute(
      "SELECT user_id FROM zendesk_accounts WHERE zendesk_account_id = ?",
      [accountId]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Unknown Zendesk account" });
    }

    const userId = rows[0].user_id;

    const subject = safeString(ticket.subject) || "";
    const description = safeString(ticket.description) || "";
    const receiverEmail = safeString(ticket.receiver_email);
    const senderEmail = safeString(ticket.requester?.email);

    // ✅ STORE NORMAL TICKET
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

    // =========================
    // 🤖 AI PIPELINE (TEXT ONLY)
    // =========================
    const signals = await classifyTicket(subject, description);

    if (signals.length > 0) {
      await Promise.all(
        signals.map(async (signal) => {
          try {
            const safeHeadline = safeString(signal.headline) || "";
            const safeSummary = safeString(signal.summary) || "";
            const safeAssignedTo = safeString(signal.assigned_to);

            // STORE SIGNAL
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
                receiverEmail,
              ]
            );

            // GENERATE DRAFT
            const draft = await generateDraftFromSignal(signal, {
              subject,
              description,
              receiver_email: receiverEmail,
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

            console.log("✅ Draft generated for:", signal.type);
          } catch (err) {
            console.error("❌ Signal/Draft error:", err.message);
          }
        })
      );
    }

    res.json({
      message: "Text ticket processed successfully",
      signals_detected: signals.length,
    });

  } catch (err) {
    console.error("❌ createTicket error:", err);
    res.status(500).json({ error: "Error processing ticket" });
  }
};

// ==============================
// 🎧 GET AUDIO TICKETS
// ==============================
const getAudioTickets = async (req, res) => {
  try {
    const userId = req.params.userId;

    const [rows] = await pool.execute(
      `SELECT * FROM audio_tickets 
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ audio_tickets: rows });

  } catch (err) {
    console.error("❌ getAudioTickets error:", err);
    res.status(500).json({ error: "Failed to fetch audio tickets" });
  }
};

// ==============================
// EXISTING APIs
// ==============================
const getAllTicketsofUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const [tickets] = await pool.execute(
      "SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    res.json({ tickets });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

const getSignals = async (req, res) => {
  try {
    const { user_id, role } = req.body;

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
    res.status(500).json({ error: "Failed to fetch signals" });
  }
};

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
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
};

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
    res.status(500).json({ error: "Update failed" });
  }
};

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
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// EXPORT
// ==============================
module.exports = {
  createTicket,
  getAllTicketsofUser,
  getSignals,
  getDraftsByRole,
  updateDraft,
  sendDraft,
  getAudioTickets,
};