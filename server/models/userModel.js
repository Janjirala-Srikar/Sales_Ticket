const pool = require("../config/database");

const createUser = async (name, email, hashedPassword) => {
  const [result] = await pool.execute(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hashedPassword]
  );
  return result;
};

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return rows[0];
};

const createAccessAccount = async (userId, role, hashedPasskey) => {
  const [result] = await pool.execute(
    "INSERT INTO access_accounts (user_id, role, passkey) VALUES (?, ?, ?)",
    [userId, role, hashedPasskey]
  );
  return result;
};

const getAccessAccountsByUserId = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT * FROM access_accounts WHERE user_id = ?",
    [userId]
  );
  return rows;
};

module.exports = {
  createUser,
  findUserByEmail,
  createAccessAccount,
  getAccessAccountsByUserId
};