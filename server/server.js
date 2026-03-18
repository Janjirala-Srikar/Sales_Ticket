require("dotenv").config();

const express = require("express");
const cors = require("cors");


//imports
const pool = require("../server/config/database");
const userController = require("./controllers/userController");
const emailController = require("./controllers/emailController");
const verifyToken = require("./middlewares/authMiddleware");


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server Running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully!");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});


//routes

// Auth Routes
app.post("/api/register", userController.register);
app.post("/api/login", userController.login);

app.post("/api/send-mail", emailController.sendMailHandler);