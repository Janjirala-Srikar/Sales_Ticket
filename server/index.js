require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");

const pool = require("./config/database");
const { driver: neo4jDriver } = require("./config/neo4j");

const userRoutes = require("./routes/user.Routes");
const emailRoutes = require("./routes/email.Routes");
const chatRoutes = require("./routes/chat.Routes");
const ticketController = require("./controllers/ticketController");
const graphRoutes = require("./routes/graph.Routes");
const memoryRoutes = require("./routes/memory.Routes");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || "https://sales-ticket.vercel.app";
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g., server-to-server or same-origin)
      if (!origin) return cb(null, true);
      if (origin === FRONTEND_ORIGIN) return cb(null, true);
      // You can add additional allowed origins here if needed
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Handle JSON parse errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    req.bodyParseError = err;

    try {
      const raw = req.rawBody || "";
      const match = raw.match(/\{[\s\S]*\}/);
      req.body = match ? JSON.parse(match[0]) : {};
    } catch {
      req.body = {};
    }

    return next();
  }
  next(err);
});

/* -------------------- ROUTES -------------------- */
app.get("/", (req, res) => res.json({ message: "Server Running" }));

app.use("/api/memory", memoryRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/users", userRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/chat", chatRoutes);

/* -------------------- TICKETS -------------------- */
app.post("/api/tickets", ticketController.createTicket);
app.get("/api/tickets/:userId", ticketController.getAllTicketsofUser);
app.get("/api/audio-tickets/:userId", ticketController.getAudioTickets);
app.get("/api/audio-tickets/:userId/:ticketId/stream", ticketController.streamAudioTicket);

app.post("/api/signals", ticketController.getSignals);
app.post("/api/tickets/drafts", ticketController.getDraftsByRole);
app.post("/api/tickets/drafts/update", ticketController.updateDraft);
app.post("/api/tickets/drafts/send", ticketController.sendDraft);

/* -------------------- SERVER START -------------------- */
const PORT = process.env.PORT || 5000;

// Only start server locally, not on Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    /* -------- MYSQL CONNECTION -------- */
    try {
      const conn = await pool.getConnection();
      console.log("✅ MySQL Database connected!");
      conn.release();
    } catch (err) {
      console.error("❌ MySQL connection failed:", err.message);
    }

    /* -------- NEO4J CONNECTION -------- */
    try {
      const session = neo4jDriver.session();
      await session.run("RETURN 1"); // simple test query
      console.log("✅ Neo4j connected!");
      await session.close();
    } catch (err) {
      console.error("❌ Neo4j connection failed:", err.message);
    }
  });
}

// Export a request handler for Vercel serverless functions and keep `app` accessible
// Vercel invokes the exported function as (req, res). Exporting the handler
// ensures the Express app receives the incoming request correctly.
module.exports = (req, res) => app(req, res);
module.exports.app = app;

/* -------------------- CLEAN SHUTDOWN -------------------- */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");

  try {
    await neo4jDriver.close();
    console.log("✅ Neo4j connection closed");
  } catch (err) {
    console.error("Error closing Neo4j:", err.message);
  }

  try {
    await pool.end();
    console.log("✅ MySQL pool closed");
  } catch (err) {
    console.error("Error closing MySQL:", err.message);
  }

  process.exit(0);
});
