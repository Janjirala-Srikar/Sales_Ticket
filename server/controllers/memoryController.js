const { getSession } = require("../config/neo4j");

const runQuery = async (cypher, params = {}) => {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
};

// ─── GET /api/memory/accounts ──────────────────────────────
// List all accounts for the search/select dropdown
const getAccounts = async (req, res) => {
  try {
    const rows = await runQuery(`
      MATCH (a:Account)-[:HAS_TICKET]->(t:Ticket)
      WITH a.id AS id, count(t) AS ticketCount
      ORDER BY ticketCount DESC
      RETURN id, ticketCount
      LIMIT 50
    `);
    res.json(rows.map((r) => ({
      id: r.id,
      ticketCount: r.ticketCount.toNumber(),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/memory/timeline/:accountId ──────────────────
// Full chronological touchpoint history for one account
const getTimeline = async (req, res) => {
  try {
    const rows = await runQuery(
      `
      MATCH (a:Account {id: $id})-[:HAS_TICKET]->(t:Ticket)-[:HAS_SIGNAL]->(s:Signal)
      RETURN
        t.id          AS ticket_id,
        t.created_at  AS ticket_date,
        s.id          AS signal_id,
        s.type        AS signal_type,
        s.created_at  AS signal_date
      ORDER BY s.created_at DESC
      LIMIT 100
      `,
      { id: req.params.accountId }
    );

    // Group by ticket → signals, build timeline entries
    const ticketMap = {};
    rows.forEach((r) => {
      const tid = r.ticket_id;
      if (!ticketMap[tid]) {
        ticketMap[tid] = {
          id:       tid,
          date:     r.ticket_date?.toString() || null,
          signals:  [],
        };
      }
      ticketMap[tid].signals.push({
        id:   r.signal_id,
        type: r.signal_type,
        date: r.signal_date?.toString() || null,
      });
    });

    // Build timeline events from tickets
    const timeline = Object.values(ticketMap).map((ticket) => {
      const dominantSignal = ticket.signals[0]?.type || "unknown";
      return {
        id:            ticket.id,
        date:          ticket.date,
        type:          signalToTouchpointType(dominantSignal),
        channel:       signalToChannel(dominantSignal),
        title:         buildTitle(ticket.id, dominantSignal),
        summary:       buildSummary(dominantSignal, ticket.signals),
        actionItems:   buildActionItems(dominantSignal),
        signals:       ticket.signals,
        dominantSignal,
        owner:         pickOwner(dominantSignal),
        status:        pickStatus(ticket.signals),
      };
    });

    res.json(timeline);
  } catch (err) {
    console.error("❌ getTimeline:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/memory/summary/:accountId ───────────────────
// High-level account memory summary
const getAccountSummary = async (req, res) => {
  try {
    const [signals, tickets, topSignals] = await Promise.all([
      runQuery(
        `MATCH (a:Account {id: $id})-[:HAS_TICKET]->()-[:HAS_SIGNAL]->(s:Signal)
         RETURN count(s) AS total, collect(DISTINCT s.type) AS types`,
        { id: req.params.accountId }
      ),
      runQuery(
        `MATCH (a:Account {id: $id})-[:HAS_TICKET]->(t:Ticket)
         RETURN count(t) AS total`,
        { id: req.params.accountId }
      ),
      runQuery(
        `MATCH (a:Account {id: $id})-[:HAS_TICKET]->()-[:HAS_SIGNAL]->(s:Signal)
         WITH s.type AS type, count(s) AS cnt
         ORDER BY cnt DESC LIMIT 3
         RETURN type, cnt`,
        { id: req.params.accountId }
      ),
    ]);

    const signalTypes = signals[0]?.types || [];
    const hasChurn    = signalTypes.includes("churn_risk");
    const hasUpsell   = signalTypes.includes("upsell_opportunity");

    res.json({
      accountId:    req.params.accountId,
      totalSignals: signals[0]?.total?.toNumber() || 0,
      totalTickets: tickets[0]?.total?.toNumber() || 0,
      signalTypes,
      topSignals:   topSignals.map((r) => ({ type: r.type, count: r.cnt.toNumber() })),
      healthVerdict:
        hasChurn  ? "At Risk"    :
        hasUpsell ? "Growing"    : "Stable",
      aiSummary: buildAccountAISummary(
        req.params.accountId,
        signalTypes,
        signals[0]?.total?.toNumber() || 0,
        tickets[0]?.total?.toNumber() || 0
      ),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/memory/action-items/:accountId ──────────────
// All open action items extracted from signals
const getActionItems = async (req, res) => {
  try {
    const rows = await runQuery(
      `
      MATCH (a:Account {id: $id})-[:HAS_TICKET]->(t:Ticket)-[:HAS_SIGNAL]->(s:Signal)
      WITH s.type AS type, count(s) AS cnt, collect(t.id)[0] AS sample_ticket
      ORDER BY cnt DESC
      RETURN type, cnt, sample_ticket
      `,
      { id: req.params.accountId }
    );

    const items = rows.flatMap((r) =>
      buildActionItems(r.type).map((action, i) => ({
        id:       `${r.type}-${i}`,
        action,
        owner:    pickOwner(r.type),
        priority: pickPriority(r.type),
        dueIn:    pickDueIn(r.type),
        ticket:   r.sample_ticket,
        signal:   r.type,
      }))
    );

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/memory/search?accountId=&q= ─────────────────
const searchTimeline = async (req, res) => {
  const { accountId, q } = req.query;
  if (!accountId || !q) return res.json([]);

  try {
    const rows = await runQuery(
      `
      MATCH (a:Account {id: $id})-[:HAS_TICKET]->(t:Ticket)-[:HAS_SIGNAL]->(s:Signal)
      WHERE toLower(s.type) CONTAINS toLower($q)
         OR toLower(t.id)   CONTAINS toLower($q)
      RETURN t.id AS ticket_id, s.type AS signal_type, s.created_at AS date
      ORDER BY s.created_at DESC
      LIMIT 20
      `,
      { id: accountId, q }
    );
    res.json(rows.map((r) => ({
      ticketId:   r.ticket_id,
      signalType: r.signal_type,
      date:       r.date?.toString() || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Helpers ───────────────────────────────────────────────
function signalToTouchpointType(type) {
  const map = {
    churn_risk:         "call",
    upsell_opportunity: "email",
    renewal_due:        "meeting",
    support_spike:      "ticket",
    nps_drop:           "survey",
    feature_request:    "email",
    payment_delay:      "call",
  };
  return map[type] || "ticket";
}

function signalToChannel(type) {
  const map = {
    churn_risk:         "Phone",
    upsell_opportunity: "Email",
    renewal_due:        "Video Call",
    support_spike:      "Support Portal",
    nps_drop:           "Survey",
    feature_request:    "Email",
    payment_delay:      "Phone",
  };
  return map[type] || "Portal";
}

function buildTitle(ticketId, signal) {
  const map = {
    churn_risk:         `Churn risk review — ${ticketId}`,
    upsell_opportunity: `Upsell discussion — ${ticketId}`,
    renewal_due:        `Renewal check-in — ${ticketId}`,
    support_spike:      `Support escalation — ${ticketId}`,
    nps_drop:           `NPS follow-up — ${ticketId}`,
    feature_request:    `Feature request logged — ${ticketId}`,
    payment_delay:      `Payment review call — ${ticketId}`,
  };
  return map[signal] || `Touchpoint — ${ticketId}`;
}

function buildSummary(signal, signals) {
  const count = signals.length;
  const map = {
    churn_risk:         `Account flagged with ${count} churn-risk signal(s). Customer expressed dissatisfaction with onboarding pace and feature gaps. Team discussed immediate intervention plan.`,
    upsell_opportunity: `${count} upsell signal(s) detected. Customer actively using core features and asking about advanced tiers. Strong expansion potential identified.`,
    renewal_due:        `Renewal window approaching. ${count} renewal signal(s) logged. Contract value and usage benchmarks reviewed with stakeholder.`,
    support_spike:      `${count} support spike signal(s) — elevated ticket volume detected. Root cause under investigation, workaround shared.`,
    nps_drop:           `NPS score declined. ${count} drop signal(s) recorded. Customer cited slow response times. Escalated to CSM lead.`,
    feature_request:    `${count} feature request(s) captured. Customer requested better reporting and API access. Forwarded to product team.`,
    payment_delay:      `${count} payment delay signal(s). Finance team notified. Grace period extended, follow-up scheduled.`,
  };
  return map[signal] || `${count} signal(s) logged for this touchpoint.`;
}

function buildActionItems(signal) {
  const map = {
    churn_risk:         ["Schedule executive sponsor call within 48h", "Share product roadmap to address gaps", "Offer 1:1 onboarding session"],
    upsell_opportunity: ["Prepare expansion proposal deck", "Loop in AE for commercial conversation", "Send advanced feature walkthrough"],
    renewal_due:        ["Send renewal quote 60 days before expiry", "Review usage data with customer", "Confirm key stakeholders for renewal call"],
    support_spike:      ["Assign dedicated support engineer", "Follow up within 4 hours", "Document root cause in knowledge base"],
    nps_drop:           ["CSM to reach out within 24h", "Identify specific pain points from survey", "Create internal improvement ticket"],
    feature_request:    ["Log request in product backlog", "Notify customer of timeline estimate", "Tag request with customer segment"],
    payment_delay:      ["Send payment reminder with invoice", "Offer payment plan if needed", "Confirm updated payment date in writing"],
  };
  return map[signal] || ["Follow up with account team"];
}

function pickOwner(signal) {
  const map = {
    churn_risk:         "CSM Lead",
    upsell_opportunity: "Account Executive",
    renewal_due:        "Renewals Team",
    support_spike:      "Support Engineer",
    nps_drop:           "Customer Success",
    feature_request:    "Product Manager",
    payment_delay:      "Finance Ops",
  };
  return map[signal] || "Account Manager";
}

function pickPriority(signal) {
  return ["churn_risk","support_spike","nps_drop","payment_delay"].includes(signal) ? "high"
       : ["renewal_due"].includes(signal) ? "medium"
       : "low";
}

function pickDueIn(signal) {
  return ["churn_risk","support_spike"].includes(signal) ? "48h"
       : ["nps_drop","payment_delay"].includes(signal)   ? "72h"
       : "1 week";
}

function pickStatus(signals) {
  return signals.length > 2 ? "escalated" : signals.length > 0 ? "open" : "closed";
}

function buildAccountAISummary(id, types, signals, tickets) {
  const risk   = types.includes("churn_risk");
  const upsell = types.includes("upsell_opportunity");
  const renew  = types.includes("renewal_due");

  if (risk && upsell)
    return `${id} shows mixed signals — churn risk and upsell opportunity are both active. Immediate CSM intervention recommended to stabilize while exploring expansion. ${tickets} tickets logged across ${signals} total signals.`;
  if (risk)
    return `${id} is at elevated churn risk. ${signals} signals across ${tickets} tickets indicate friction. Prioritize executive outreach and resolve open support issues before the quarter ends.`;
  if (upsell)
    return `${id} is a strong expansion candidate. Usage patterns and ${signals} signals across ${tickets} tickets suggest readiness for an upsell conversation this cycle.`;
  if (renew)
    return `${id} has an active renewal window. ${tickets} tickets and ${signals} signals tracked. Prepare renewal assets and confirm stakeholder availability.`;
  return `${id} is stable with ${signals} signals across ${tickets} tickets. No urgent flags — continue standard engagement cadence.`;
}

module.exports = { getTimeline, getAccountSummary, getActionItems, searchTimeline, getAccounts };