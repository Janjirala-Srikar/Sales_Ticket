const neo4j = require("neo4j-driver");
const fs = require("fs");
const csv = require("csv-parser");
require("dotenv").config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// ✅ Fix datetime format: "2026-02-27 21:09:46" → "2026-02-27T21:09:46"
function toNeo4jDateTime(dateStr) {
  if (!dateStr) return null;
  return dateStr.trim().replace(" ", "T");
}

async function importCSV() {
  const session = driver.session();
  const rows = [];

  // ✅ Read CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream("C:/Users/srika/Downloads/netflix_dummy_graph_data.csv")
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`📦 Total rows found: ${rows.length}`);

  let success = 0;
  let failed = 0;

  // ✅ Insert each row into Neo4j
  for (const row of rows) {
    try {
      await session.run(
        `
        MERGE (a:Account {id: $account_id})

        MERGE (t:Ticket {id: $ticket_id})
        SET t.created_at = datetime($created_at)

        MERGE (s:Signal {id: $signal_id})
        SET s.type       = $signal_type,
            s.created_at = datetime($created_at)

        MERGE (a)-[:HAS_TICKET]->(t)
        MERGE (t)-[:HAS_SIGNAL]->(s)
        `,
        {
          account_id:  row.account_id,
          ticket_id:   row.ticket_id,
          signal_id:   row.signal_id,
          signal_type: row.signal_type,
          created_at:  toNeo4jDateTime(row.created_at),
        }
      );
      success++;
    } catch (err) {
      console.error(`❌ Row failed:`, row, "\nReason:", err.message);
      failed++;
    }
  }

  console.log(`✅ Import complete! Success: ${success} | Failed: ${failed}`);
  await session.close();
  await driver.close();
}

importCSV().catch((err) => {
  console.error("❌ Import failed:", err.message);
  process.exit(1);
});