const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fixed role mapping per signal type
const ROLE_MAP = {
  expansion:          "sales_manager",
  churn_risk:         "customer_success_manager",
  competitor_mention: "sales_manager",
  feature_gap:        "product_manager",
};

async function classifyTicket(subject, description) {
  const prompt = `You are a revenue intelligence AI for a B2B SaaS company.

Your job is to analyze a support ticket and extract ONLY the revenue signals that are actually present.

A ticket may contain ONE, MULTIPLE, or NONE of the signals. Return ONLY the ones that clearly apply.

------------------------
TICKET
------------------------
Subject: "${subject}"
Description: "${description}"

------------------------
SIGNAL DEFINITIONS
------------------------
1. expansion
→ Customer is growing, scaling, hiring, or needs more seats/capacity.

2. churn_risk
→ Customer is frustrated, unhappy, or indicates risk of leaving, canceling, or switching.

3. competitor_mention
→ Customer explicitly mentions ANY competitor (e.g. Salesforce, HubSpot, Zoho, Freshworks, etc.)

4. feature_gap
→ Customer describes a missing feature or capability that blocks their workflow.

------------------------
STRICT RULES (VERY IMPORTANT)
------------------------
- Evaluate EACH signal independently.
- INCLUDE a signal ONLY if there is clear evidence in the ticket.
- DO NOT force or assume signals.
- A ticket can contain 1, multiple, or all signals — include ONLY those that truly apply.
- If a competitor is explicitly named, ALWAYS include "competitor_mention".
- If frustration OR switching intent is present, ALWAYS include "churn_risk".
- If growth or scaling is mentioned, ALWAYS include "expansion".
- If ANY missing feature is mentioned, ALWAYS include "feature_gap".
- If no signals are present, return an empty "signals" array.

------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
------------------------
Return ONLY valid JSON. No markdown. No explanation.

{
  "signals": [
    {
      "type": "<expansion | churn_risk | competitor_mention | feature_gap>",
      "headline": "<one short specific sentence about THIS ticket>",
      "summary": "<2-3 sentences explaining what the customer said, why it matters, and what should happen next>"
    }
  ]
}

------------------------
FINAL CHECK BEFORE ANSWERING
------------------------
- Did I include ONLY signals that are clearly supported by the ticket?
- Did I avoid adding signals without evidence?
- If no signals exist, did I return an empty array?

Follow these strictly.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    // 🧾 RAW OUTPUT
    console.log("🧾 RAW LLM OUTPUT:\n", raw);

    const cleaned = raw.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("❌ JSON Parse Failed:", parseErr.message);
      console.error("⚠️ Cleaned Output Was:\n", cleaned);
      return [];
    }

    // ✅ Parsed result
    console.log("✅ Groq parsed result:", result);

    const validTypes = ["expansion", "churn_risk", "competitor_mention", "feature_gap"];
    const seen = new Set();

    const finalSignals = (result.signals || [])
      .filter((s) => {
        if (!validTypes.includes(s.type)) {
          console.warn("⚠️ Invalid signal type skipped:", s.type);
          return false;
        }
        if (seen.has(s.type)) {
          console.warn("⚠️ Duplicate signal skipped:", s.type);
          return false;
        }
        seen.add(s.type);
        return true;
      })
      .map((s) => ({
        type: s.type,
        headline: s.headline || "",
        summary: s.summary || "",
        assigned_to: ROLE_MAP[s.type],
      }));

    // 🎯 FINAL OUTPUT
    console.log("🎯 FINAL SIGNALS RETURNED:", finalSignals);
    console.log("📊 Signal count:", finalSignals.length);

    return finalSignals;

  } catch (err) {
    console.error("❌ Groq failed:", err.message);
    return [];
  }
}

module.exports = { classifyTicket };
