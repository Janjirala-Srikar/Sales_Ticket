const Ticket = require("../models/Ticket");
const { classifyTicket } = require("../utils/groqClassifier");

// POST /api/tickets
const createTicket = async (req, res) => {
  try {
    const { subject, description } = req.body;

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
      message: "Ticket submitted.",
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
  getAllTickets,   // renamed for clarity
  getTicketById
};