require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");

const pool = require("./config/database");
const { driver: neo4jDriver, getSession } = require("./config/neo4j"); // ✅ Neo4j
const userRoutes = require("./routes/user.Routes");
const emailRoutes = require("./routes/email.Routes");
const chatRoutes = require("./routes/chat.Routes");
const ticketController = require("./controllers/ticketController");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    req.bodyParseError = err;
    try {
      const raw = req.rawBody || "";
      const match = raw.match(/\{[\s\S]*\}/);
      req.body = match ? JSON.parse(match[0]) : {};
    } catch (parseError) {
      req.body = {};
    }

    return next();
  }
  next(err);
});

app.get("/", (req, res) => res.json({ message: "Server Running" }));

app.use("/api/users", userRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/chat", chatRoutes);

app.post("/api/tickets", ticketController.createTicket);
app.get("/api/tickets/:userId", ticketController.getAllTicketsofUser);
app.get("/api/audio-tickets/:userId", ticketController.getAudioTickets);
app.get("/api/audio-tickets/:userId/:ticketId/stream", ticketController.streamAudioTicket);
app.post("/api/signals", ticketController.getSignals);
app.post("/api/tickets/drafts", ticketController.getDraftsByRole);
app.post("/api/tickets/drafts/update", ticketController.updateDraft);
app.post("/api/tickets/drafts/send", ticketController.sendDraft);

const PORT = process.env.PORT || 5000;
console.log("ENV CHECK:", process.env.DB_USER);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const conn = await pool.getConnection();
    console.log("Database connected!");
    conn.release();
  } catch (err) {
    console.error("Database connection failed:", err.message);
  }
});
