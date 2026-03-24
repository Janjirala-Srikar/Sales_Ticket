const pool = require("../config/database");

const Ticket = {

  async create({ userId, subject, description, signals }) {
    const [result] = await pool.execute(
      `INSERT INTO tickets (user_id, subject, description, signals, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, subject, description, JSON.stringify(signals)]
    );
    return result.insertId;
  },

  async getById(ticketId) {
    const [rows] = await pool.execute(
      `SELECT t.*, u.email AS user_email
       FROM tickets t LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [ticketId]
    );
    return rows[0] ? parse(rows[0]) : null;
  },

  async getByUser(userId) {
    const [rows] = await pool.execute(
      `SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map(parse);
  },

};

function parse(row) {
  try {
    row.signals = typeof row.signals === "string" ? JSON.parse(row.signals) : row.signals || [];
  } catch {
    row.signals = [];
  }
  return row;
}

module.exports = Ticket;