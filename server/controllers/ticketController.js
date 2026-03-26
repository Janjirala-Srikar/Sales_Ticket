const pool = require("../config/database"); 

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

    // 🔍 STEP 2: Extract fields (UPDATED)
    const zendeskTicketId = ticket.id;
    const subject = ticket.subject; // from JSON (mapped from title)
    const description = ticket.description;
    const priority = ticket.priority || "normal";
    const status = "open"; // default since not provided
    const tags = JSON.stringify(ticket.tags || []);
    const receiverEmail = ticket.receiver_email;

    // 🔍 STEP 3: Insert into DB
     await pool.execute(
  `INSERT INTO tickets 
  (zendesk_ticket_id, zendesk_account_id, user_id, subject, description, priority, status, tags, receiver_email)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    description = VALUES(description),
    priority = VALUES(priority),
    status = VALUES(status),
    tags = VALUES(tags),
    receiver_email = VALUES(receiver_email)
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
    receiverEmail
  ]
);

    console.log("✅ Ticket stored for user:", userId);

    return res.status(200).json({
      message: "Ticket stored successfully",
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

// ✅ GET ticket by id


module.exports = {
  createTicket,
  getAllTicketsofUser
};