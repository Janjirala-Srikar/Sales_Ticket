// utils/zendeskSender.js
// Handles sending replies back to Zendesk via API

const pool = require("../config/database");

const sendReplyToZendesk = async ({ draftId }) => {
  try {
    console.log("📤 Starting Zendesk reply send for draft ID:", draftId);

    // ✅ JOIN drafts + tickets to get all needed data
    const [rows] = await pool.execute(
      `SELECT 
        d.id,
        d.zendesk_ticket_id,
        d.draft_content,
        t.receiver_email,
        t.zendesk_account_id
      FROM ai_drafts d
      JOIN tickets t 
        ON d.zendesk_ticket_id = t.zendesk_ticket_id
      WHERE d.id = ?
      LIMIT 1`,
      [draftId]
    );

    if (!rows.length) {
      throw new Error("Draft not found in database");
    }

    const { zendesk_ticket_id, draft_content, receiver_email, zendesk_account_id } = rows[0];

    if (!receiver_email) {
      throw new Error("Missing receiver_email - cannot determine Zendesk subdomain");
    }

    console.log("📋 Draft details:", {
      draftId,
      ticketId: zendesk_ticket_id,
      receiverEmail: receiver_email?.substring(0, 20) + "...",
    });

    // ✅ Extract Zendesk subdomain from receiver_email
    // Expected format: support@lumora.zendesk.com → subdomain: lumora
    const domain = receiver_email.split("@")[1]; // lumora.zendesk.com
    if (!domain || !domain.includes("zendesk.com")) {
      throw new Error(`Invalid Zendesk email format: ${receiver_email}`);
    }

    const subdomain = domain.split(".")[0]; // lumora

    const url = `https://${subdomain}.zendesk.com/api/v2/tickets/${zendesk_ticket_id}.json`;

    console.log("🌐 Zendesk API URL:", url);

    // ✅ Send request to Zendesk API
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.ZENDESK_EMAIL}/token:${process.env.ZENDESK_API_TOKEN}`
          ).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket: {
          comment: {
            body: draft_content,
            public: true,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Zendesk API Error:", {
        status: response.status,
        response: data,
      });
      throw new Error(data.error?.message || "Zendesk API failed");
    }

    console.log("✅ Successfully sent reply to Zendesk ticket:", zendesk_ticket_id);
    return data;

  } catch (err) {
    console.error("❌ sendReplyToZendesk error:", {
      message: err.message,
      stack: err.stack,
    });
    throw err;
  }
};

module.exports = { sendReplyToZendesk };
