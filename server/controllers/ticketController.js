const Ticket = require("../models/Ticket");
const { classifyTicket } = require("../utils/groqClassifier");

// POST /api/tickets
const crypto = require("crypto");
const WEBHOOK_SECRET = process.env.ZENDESK_WEBHOOK_SECRET;

function verifyZendeskWebhook(signature, timestamp, body) {
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(timestamp + body).digest("base64");
  return digest === signature;
}

const createTicket = async (req, res) => {
  try {
    const signature = req.headers["x-zendesk-webhook-signature"];
    const timestamp = req.headers["x-zendesk-webhook-signature-timestamp"];
    const body = req.rawBody || JSON.stringify(req.body);

    if (!verifyZendeskWebhook(signature, timestamp, body)) {
      console.log("❌ Invalid Zendesk webhook signature!");
      return res.status(401).send("Unauthorized");
    }

    console.log("✅ Verified Zendesk webhook:", req.body);

    const subject =
      req.body.subject ||
      req.body.ticket?.subject;

    const description =
      req.body.description ||
      req.body.ticket?.description ||
      req.body.comment?.body ||
      "";

    if (!subject || !description) {
      return res.status(400).json({ error: "Subject and description are required." });
    }

    const signals = await classifyTicket(subject, description);

    const ticketId = await Ticket.create({
      userId: 30002,
      subject,
      description,
      signals,
    });

    return res.status(201).json({
      message: "Ticket submitted and classified.",
      ticketId,
      signals,
    });

  } catch (err) {
    console.error("❌ createTicket:", err);
    return res.status(500).json({ error: "Failed to submit ticket." });
  }
};

// GET /api/tickets
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.getAll();
    return res.status(200).json({ tickets });
  } catch (err) {
    console.error("❌ getAllTickets:", err);
    return res.status(500).json({ error: "Failed to fetch tickets." });
  }
};

// GET /api/tickets/:id
const getTicketById = async (req, res) => {
  try {
    const ticketId = req.params.id;

    if (!ticketId) {
      return res.status(400).json({ error: "Ticket ID is required." });
    }

    const ticket = await Ticket.getById(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    return res.status(200).json({ ticket });

  } catch (err) {
    console.error("❌ getTicketById:", err);
    return res.status(500).json({ error: "Failed to fetch ticket." });
  }
};

module.exports = {
  createTicket,
  getAllTickets,   
  getTicketById
};