import { createPike13Client, createReportingClient } from "./api.js";
import fs from "fs/promises";

// Token helpers
export async function saveToken(token) {
  await fs.writeFile("./token.json", JSON.stringify({ accessToken: token }, null, 2));
}

export async function loadToken() {
  try {
    const data = await fs.readFile("./token.json", "utf-8");
    return JSON.parse(data).accessToken;
  } catch {
    return null;
  }
}

// Main logic
export async function runMainLogic(accessToken) {
  const coreClient = createPike13Client(accessToken);
  const reportingClient = createReportingClient(accessToken);

  console.log("📡 Calling Core API /desk/people...");
  const peopleRes = await coreClient.get("/desk/people", {
    params: {
      per_page: 50,
      is_member: true,
      sort: "-updated_at",
    },
  });

  const people = peopleRes.data.people;
  console.log(`✅ Retrieved ${people.length} people`);
  people.slice(0, 5).forEach((p) =>
    console.log(`- ${p.first_name} ${p.last_name} (${p.email})`)
  );

  console.log("📊 Fetching client report from Reporting API v3...");
  const reportRes = await reportingClient.post("/reports/clients/queries", {
    data: {
      type: "report_queries",
      attributes: {
        fields: [
          "person_id",
          "email",
          "full_name",
          "last_visit_date",
          "days_since_last_visit",
        ],
        filter: [
          {
            field: "days_since_last_visit",
            op: "gt",
            value: 10,
          },
        ],
      },
    },
  });

  const rows = reportRes.data?.data?.attributes?.rows;

  if (!rows) {
    console.error("❌ No rows returned from the report API");
    console.dir(reportRes.data, { depth: null });
    return;
  }

  console.log(`🗂 Retrieved ${rows.length} inactive clients`);

  // Optional: send data to HighLevel
  for (const row of rows) {
    // Call your existing logic here
    // await sendToGoHighLevel(row);  ← you can uncomment and import later
  }
}