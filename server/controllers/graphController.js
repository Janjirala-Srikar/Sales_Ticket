const { getSession } = require("../config/neo4j");

// ─── Helper ───────────────────────────────────────────────
const runQuery = async (cypher, params = {}) => {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
};

// ─── GET /api/graph/overview ──────────────────────────────
// Returns nodes + links for force graph
const getOverview = async (req, res) => {
  try {
    const rows = await runQuery(`
      MATCH (a:Account)-[:HAS_TICKET]->(t:Ticket)-[:HAS_SIGNAL]->(s:Signal)
      WITH a, t, s
      LIMIT 400
      RETURN 
        a.id AS account_id,
        t.id AS ticket_id,
        s.id AS signal_id,
        s.type AS signal_type
    `);

    // Build nodes + links for frontend graph
    const nodeMap = {};
    const links   = [];

    rows.forEach((row) => {
      const { account_id, ticket_id, signal_id, signal_type } = row;

      if (!nodeMap[account_id])
        nodeMap[account_id] = { id: account_id, type: "account" };

      if (!nodeMap[ticket_id])
        nodeMap[ticket_id] = { id: ticket_id, type: "ticket" };

      if (!nodeMap[signal_id])
        nodeMap[signal_id] = { id: signal_id, type: "signal", signalType: signal_type };

      links.push({ source: account_id, target: ticket_id });
      links.push({ source: ticket_id,  target: signal_id  });
    });

    res.json({
      nodes: Object.values(nodeMap),
      links,
    });
  } catch (err) {
    console.error("❌ getOverview error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/graph/metrics ───────────────────────────────
// Returns counts for the 4 metric cards
const getMetrics = async (req, res) => {
  try {
    const [accounts, tickets, signals, types] = await Promise.all([
      runQuery("MATCH (a:Account) RETURN count(a) AS count"),
      runQuery("MATCH (t:Ticket)  RETURN count(t) AS count"),
      runQuery("MATCH (s:Signal)  RETURN count(s) AS count"),
      runQuery("MATCH (s:Signal)  RETURN count(DISTINCT s.type) AS count"),
    ]);

    res.json({
      accounts: accounts[0].count.toNumber(),
      tickets:  tickets[0].count.toNumber(),
      signals:  signals[0].count.toNumber(),
      types:    types[0].count.toNumber(),
    });
  } catch (err) {
    console.error("❌ getMetrics error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/graph/hot-accounts ─────────────────────────
// Accounts with most signals (highest risk)
const getHotAccounts = async (req, res) => {
  try {
    const rows = await runQuery(`
      MATCH (a:Account)-[:HAS_TICKET]->(t:Ticket)-[:HAS_SIGNAL]->(s:Signal)
      WITH a.id AS account_id, count(s) AS signal_count,
           collect(DISTINCT s.type) AS signal_types
      ORDER BY signal_count DESC
      LIMIT 10
      RETURN account_id, signal_count, signal_types
    `);

    res.json(
      rows.map((r) => ({
        id:           r.account_id,
        signals:      r.signal_count.toNumber(),
        signalTypes:  r.signal_types,
        dominant:     r.signal_types[0],
      }))
    );
  } catch (err) {
    console.error("❌ getHotAccounts error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/graph/signal-dist ───────────────────────────
// Signal type distribution for bar chart
const getSignalDistribution = async (req, res) => {
  try {
    const rows = await runQuery(`
      MATCH (s:Signal)
      RETURN s.type AS signal_type, count(s) AS count
      ORDER BY count DESC
    `);

    res.json(
      rows.map((r) => ({
        type:  r.signal_type,
        count: r.count.toNumber(),
      }))
    );
  } catch (err) {
    console.error("❌ getSignalDistribution error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/graph/account/:id ───────────────────────────
// Full detail for one account (drill-down)
const getAccountDetail = async (req, res) => {
  try {
    const rows = await runQuery(
      `
      MATCH (a:Account {id: $id})-[:HAS_TICKET]->(t:Ticket)-[:HAS_SIGNAL]->(s:Signal)
      RETURN 
        a.id          AS account_id,
        t.id          AS ticket_id,
        t.created_at  AS ticket_date,
        s.id          AS signal_id,
        s.type        AS signal_type,
        s.created_at  AS signal_date
      ORDER BY s.created_at DESC
      `,
      { id: req.params.id }
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ getAccountDetail error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getOverview,
  getMetrics,
  getHotAccounts,
  getSignalDistribution,
  getAccountDetail,
};
