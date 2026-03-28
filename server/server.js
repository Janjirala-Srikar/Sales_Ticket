require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");

// imports
const pool = require("./config/database");
const { driver: neo4jDriver, getSession } = require("./config/neo4j"); // ✅ Neo4j
const userRoutes = require("./routes/user.Routes");
const emailRoutes = require("./routes/email.Routes");
const chatRoutes = require("./routes/chat.Routes");

const userController = require("./controllers/userController");
const emailController = require("./controllers/emailController");
const ticketController = require("./controllers/ticketController");
const verifyToken = require("./middlewares/authMiddleware");

const app = express();

app.use(cors());

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Silent JSON error recovery
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    req.bodyParseError = err;
    try {
      const raw = req.rawBody || "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        req.body = JSON.parse(match[0]);
      } else {
        req.body = {};
      }
    } catch (e) {
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

// ─── Tickets ──────────────────────────────────────────────────
app.post("/api/tickets", ticketController.createTicket);
app.get("/api/tickets/:userId", ticketController.getAllTicketsofUser);
app.post("/api/signals", ticketController.getSignals);
app.post("/api/tickets/drafts", ticketController.getDraftsByRole);
app.post("/api/tickets/drafts/update", ticketController.updateDraft);
app.post("/api/tickets/drafts/send", ticketController.sendDraft);

const PORT = process.env.PORT || 5000;
console.log("ENV CHECK:", process.env.DB_USER);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // ✅ MySQL check
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL connected!");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }

  // ✅ Neo4j check
  try {
    const session = getSession();
    await session.run("RETURN 1");
    await session.close();
    console.log("✅ Neo4j connected!");
  } catch (err) {
    console.error("❌ Neo4j connection failed:", err.message);
  }
});

