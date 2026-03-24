require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");

// imports
const pool = require("./config/database");

const userRoutes = require("./routes/user.Routes");
const emailRoutes = require("./routes/email.Routes");
// const pool = require("../server/config/database");
const userController = require("./controllers/userController");
const emailController = require("./controllers/emailController");
const ticketController = require("./controllers/ticketController");
const verifyToken = require("./middlewares/authMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "Server Running" }));

app.use("/api/users", userRoutes);
app.use("/api/email", emailRoutes);

const PORT = process.env.PORT || 5000;

console.log("ENV CHECK:", process.env.DB_USER); // debug

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const conn = await pool.getConnection();
    console.log("✅ Database connected!");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});

// ─── Auth ───────────────────────────────────────────────────
app.post("/api/register", userController.register);
app.post("/api/login",    userController.login);

// ─── Email ──────────────────────────────────────────────────
app.post("/api/send-mail", emailController.sendMailHandler);

// ─── Tickets ────────────────────────────────────────────────
app.post("/api/tickets",     ticketController.createTicket);
app.get ("/api/tickets",     ticketController.getAllTickets);
app.get ("/api/tickets/:id", ticketController.getTicketById);
