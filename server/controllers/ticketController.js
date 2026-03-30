const { Readable } = require("stream");
const pool = require("../config/database");
const { classifyTicket } = require("../utils/groqClassifier");
const { generateDraftFromSignal } = require("../utils/aiDraftGenerator");
const { sendReplyToZendesk } = require("../utils/zendeskSender");
const { generateEmbedding } = require("../utils/embedding"); // 👈 NEW IMPORT

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

function buildZendeskAuthHeader() {
  if (!process.env.ZENDESK_EMAIL || !process.env.ZENDESK_API_TOKEN) {
    throw new Error(
      "Zendesk credentials are missing. Set ZENDESK_EMAIL and ZENDESK_API_TOKEN in server/.env"
    );
  }

  return (
    "Basic " +
    Buffer.from(
      `${process.env.ZENDESK_EMAIL}/token:${process.env.ZENDESK_API_TOKEN}`
    ).toString("base64")
  );
}

async function fetchZendeskResource(url, accept = "*/*") {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch (error) {
      return "unknown-host";
    }
  })();

  const response = await fetch(url, {
    headers: {
      Authorization: buildZendeskAuthHeader(),
      Accept: accept,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new Error(
        `Zendesk authentication failed for ${host}. Check that ZENDESK_EMAIL belongs to an agent/admin on this Zendesk account, ZENDESK_API_TOKEN is valid, and API token access is enabled in Zendesk Admin Center.`
      );
    }

    throw new Error(
      `Zendesk request failed (${response.status})${body ? `: ${body}` : ""}`
    );
  }

  return response;
}

function extractVoicePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.call && typeof payload.call === "object") return payload.call;
  if (Array.isArray(payload.calls) && payload.calls[0] && typeof payload.calls[0] === "object") {
    return payload.calls[0];
  }
  return payload;
}

function extractRecordingUrl(payload) {
  const voicePayload = extractVoicePayload(payload);

  return (
    safeString(voicePayload?.recording_url) ||
    safeString(voicePayload?.recording?.url) ||
    safeString(payload?.recording_url) ||
    null
  );
}

async function fetchVoiceResponse(audioUrl) {
  if (!audioUrl) return null;

  const response = await fetchZendeskResource(audioUrl, "application/json, text/plain;q=0.9, */*;q=0.8");
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) return null;
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw_response: text };
  }
}

function buildPlaybackUrl(req, userId, ticketId) {
  return `${req.protocol}://${req.get("host")}/api/audio-tickets/${userId}/${ticketId}/stream`;
}

// ==========================================
// 🧠 HELPER: Store ticket embeddings for chat
// Always stores at least one embedding row per ticket.
// Uses structured JSON content so chat retrieval can parse it cleanly.
// ==========================================
async function storeTicketEmbeddings(accountId, zendeskTicketId, subject, description, signals, receiverEmail) {
  const embeddingRows = signals?.length
    ? signals
    : [{ type: "ticket", summary: null, assigned_to: null }];

  try {
    await pool.execute(
      `DELETE FROM embeddings WHERE ticket_id = ? AND account_id = ?`,
      [zendeskTicketId, accountId]
    );

    console.log(`🧹 Cleared old embeddings for ticket ${zendeskTicketId}`);
  } catch (err) {
    console.error(`❌ Failed to clear old embeddings for ticket ${zendeskTicketId}:`, err.message);
    throw err;
  }

  for (const [index, signal] of embeddingRows.entries()) {
    const signalType = safeString(signal.type) || "ticket";
    const payload = {
      subject: subject || "",
      description: description || "",
      signal: signalType,
      summary: safeString(signal.summary),
      assigned_to: safeString(signal.assigned_to),
      receiver_email: safeString(receiverEmail),
    };

    try {
      const embedding = await generateEmbedding(payload);
      if (!embedding) {
        console.warn(`⚠️ Skipped embedding for ticket ${zendeskTicketId} at row ${index + 1}`);
        continue;
      }

      await pool.execute(
        `INSERT INTO embeddings
        (ticket_id, account_id, content, embedding, type, metadata)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          zendeskTicketId,
          accountId,
          JSON.stringify(payload),
          JSON.stringify(embedding),
          signalType,
          JSON.stringify({
            signal: signalType,
            assigned_to: safeString(signal.assigned_to),
            receiver_email: safeString(receiverEmail),
          }),
        ]
      );

      console.log(`🧠 Stored embedding for ticket ${zendeskTicketId} (${signalType})`);
    } catch (err) {
      console.error(`❌ Embedding failed for ticket ${zendeskTicketId}:`, err.message);
      throw err;
    }
  }
}

// ==============================
// ✅ CREATE TICKET
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

    if (!audioUrl && ticket.description) {
      const descMatch = ticket.description.match(
        /https:\/\/lumora\.zendesk\.com\/api\/v2\/channels\/voice\/calls\/[^\s\)\n]+/i
      );
      audioUrl = descMatch ? descMatch[0] : null;
      if (audioUrl) console.log("✅ Recording URL extracted from description");
    }

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

    const subject      = safeString(ticket.subject)           || "";
    const description  = safeString(ticket.description)       || "";
    const receiverEmail = safeString(ticket.receiver_email);
    const senderEmail  = safeString(ticket.requester?.email);

    // ✅ STORE NORMAL TICKET
    await pool.execute(
      `INSERT INTO tickets 
      (zendesk_ticket_id, zendesk_account_id, user_id, subject, description, receiver_email, sender_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject        = VALUES(subject),
        description    = VALUES(description),
        receiver_email = VALUES(receiver_email),
        sender_email   = VALUES(sender_email)`,
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
            const safeHeadline   = safeString(signal.headline)    || "";
            const safeSummary    = safeString(signal.summary)     || "";
            const safeAssignedTo = safeString(signal.assigned_to);

            // STORE SIGNAL
            await pool.execute(
              `INSERT INTO ticket_signals 
              (zendesk_ticket_id, user_id, signal_type, headline, summary, assigned_to, receiver_email)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                headline    = VALUES(headline),
                summary     = VALUES(summary),
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
                status        = VALUES(status)`,
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

    // =========================
    // 🧠 STORE EMBEDDINGS — for chat semantic search
    // =========================
    await storeTicketEmbeddings(
      accountId,
      zendeskTicketId,
      subject,
      description,
      signals,
      receiverEmail
    );

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

    const audioTickets = await Promise.all(
      rows.map(async (row) => {
        try {
          const voiceResponse = await fetchVoiceResponse(row.audio_url);
          return {
            ...row,
            playback_url: row.audio_url
              ? buildPlaybackUrl(req, userId, row.id)
              : null,
            voice_response: voiceResponse,
          };
        } catch (err) {
          console.error("❌ fetchVoiceResponse error:", err.message);
          return {
            ...row,
            playback_url: row.audio_url
              ? buildPlaybackUrl(req, userId, row.id)
              : null,
            voice_response: null,
            voice_error: err.message,
          };
        }
      })
    );

    res.json({ audio_tickets: audioTickets });

  } catch (err) {
    console.error("❌ getAudioTickets error:", err);
    res.status(500).json({ error: "Failed to fetch audio tickets" });
  }
};

const streamAudioTicket = async (req, res) => {
  try {
    const { userId, ticketId } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM audio_tickets
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [ticketId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Audio ticket not found" });
    }

    const audioTicket = rows[0];
    if (!audioTicket.audio_url) {
      return res.status(404).json({ error: "Audio URL not found for this ticket" });
    }

    let response = await fetchZendeskResource(
      audioTicket.audio_url,
      "audio/*, application/json;q=0.9, text/plain;q=0.8, */*;q=0.7"
    );
    let contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("audio/")) {
      const payload = await response.json().catch(() => null);
      const recordingUrl = extractRecordingUrl(payload);

      if (!recordingUrl) {
        return res.status(502).json({
          error: "Recording URL missing in Zendesk response",
          voice_response: payload,
        });
      }

      response = await fetchZendeskResource(recordingUrl, "audio/*, */*;q=0.8");
      contentType = response.headers.get("content-type") || "audio/mpeg";
    }

    res.setHeader("Content-Type", contentType || "audio/mpeg");

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      res.setHeader("Content-Disposition", disposition);
    }

    const stream = Readable.fromWeb(response.body);
    stream.pipe(res);
  } catch (err) {
    console.error("❌ streamAudioTicket error:", err);
    res.status(500).json({
      error: err.message || "Failed to stream audio ticket",
    });
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
  streamAudioTicket,
};
