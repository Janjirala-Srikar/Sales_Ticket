require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");

// imports
const pool = require("./config/database");

const userRoutes = require("./routes/user.Routes");
const emailRoutes = require("./routes/email.Routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server Running" });
});

app.use("/api/users", userRoutes);
app.use("/api/email", emailRoutes);

const PORT = process.env.PORT || 5000;

console.log("ENV CHECK:", process.env.DB_USER); // debug

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