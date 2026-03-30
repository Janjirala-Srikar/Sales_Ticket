/**
 * server/utils/syncTicketsToEmbeddings.js
 *
 * Reads tickets from the `tickets` table and stores
 * embeddings into the `embeddings` table for chatbot search.
 *
 * Usage (from server/ folder):
 *   node utils/syncTicketsToEmbeddings.js
 *
 * To undo: DELETE FROM embeddings;
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = require("../config/database");
const { generateEmbedding } = require("./embedding");

const BATCH_SIZE = 10;
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// Build text to embed from ticket fields
// ==========================================
function buildTicketText(ticket) {
  const tags = Array.isArray(ticket.tags)
    ? ticket.tags.join(", ")
    : typeof ticket.tags === "string"
    ? ticket.tags
    : "";

  return [
    ticket.subject     ? `Subject: ${ticket.subject}`         : null,
    ticket.description ? `Description: ${ticket.description}` : null,
    ticket.priority    ? `Priority: ${ticket.priority}`       : null,
    ticket.status      ? `Status: ${ticket.status}`           : null,
    tags               ? `Tags: ${tags}`                      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// ==========================================
// Upsert one embedding row
// ==========================================
async function upsertEmbedding(ticket, embedding) {
  const tags = Array.isArray(ticket.tags)
    ? ticket.tags.join(", ")
    : ticket.tags || "";

  const content = JSON.stringify({
    subject:        ticket.subject         || "",
    description:    ticket.description     || "",
    signal:         tags,
    summary:        ticket.subject         || "",
    assigned_to:    ticket.receiver_email  || "Unassigned",
    priority:       ticket.priority        || "",
    status:         ticket.status          || "",
  });

  await pool.execute(
    `INSERT INTO embeddings (account_id, ticket_id, content, embedding, created_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       content    = VALUES(content),
       embedding  = VALUES(embedding),
       created_at = NOW()`,
    [
      String(ticket.zendesk_account_id),
      String(ticket.zendesk_ticket_id),
      content,
      JSON.stringify(embedding),
    ]
  );
}

// ==========================================
// MAIN
// ==========================================
async function syncTicketsToEmbeddings() {
  console.log("🚀 Starting tickets → embeddings sync...\n");

  // account_id is directly on the tickets table — no join needed
  const [tickets] = await pool.execute(
    `SELECT 
       zendesk_ticket_id,
       zendesk_account_id,
       subject,
       description,
       priority,
       status,
       tags,
       receiver_email,
       created_at
     FROM tickets
     ORDER BY created_at DESC`
  );

  if (tickets.length === 0) {
    console.log("⚠️  No tickets found. Nothing to sync.");
    process.exit(0);
  }

  console.log(`📦 Found ${tickets.length} tickets to sync.\n`);

  let succeeded = 0;
  let failed    = 0;
  let skipped   = 0;

  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (ticket) => {
        try {
          // Parse tags if stored as JSON string
          if (typeof ticket.tags === "string") {
            try { ticket.tags = JSON.parse(ticket.tags); }
            catch { ticket.tags = []; }
          }

          const text = buildTicketText(ticket);
          if (!text.trim()) {
            console.warn(`⏭️  Ticket ${ticket.zendesk_ticket_id} — empty text. Skipping.`);
            skipped++;
            return;
          }

          const embedding = await generateEmbedding(text);
          if (!embedding) {
            console.warn(`⚠️  Ticket ${ticket.zendesk_ticket_id} — embedding returned null. Skipping.`);
            skipped++;
            return;
          }

          await upsertEmbedding(ticket, embedding);
          console.log(`✅ Ticket ${ticket.zendesk_ticket_id} | account: ${ticket.zendesk_account_id}`);
          succeeded++;
        } catch (err) {
          console.error(`❌ Ticket ${ticket.zendesk_ticket_id} failed:`, err.message);
          failed++;
        }
      })
    );

    if (i + BATCH_SIZE < tickets.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n==========================================");
  console.log(`✅ Succeeded : ${succeeded}`);
  console.log(`⏭️  Skipped   : ${skipped}`);
  console.log(`❌ Failed    : ${failed}`);
  console.log(`📊 Total     : ${tickets.length}`);
  console.log("==========================================\n");

  if (succeeded > 0) {
    console.log("🎉 Done! Your chatbot can now find tickets.");
  } else {
    console.log("⚠️  Nothing synced. Check errors above.");
  }

  // Verify final state
  const [summary] = await pool.execute(
    `SELECT account_id, COUNT(*) AS count FROM embeddings GROUP BY account_id`
  );
  console.log("\n📊 embeddings table now contains:");
  if (summary.length === 0) {
    console.log("  (still empty — check errors above)");
  } else {
    summary.forEach((r) => console.log(`  account_id ${r.account_id}: ${r.count} rows`));
  }

  process.exit(0);
}

syncTicketsToEmbeddings().catch((err) => {
  console.error("💥 Sync crashed:", err.message);
  process.exit(1);
});