import { createPike13Client, createReportingClient } from "./api.js";
import { removeInactiveTagIfActive } from "./removeInactiveTagIfActive.js";
import { sendToGoHighLevel } from "./sendToGoHighLevel.js";
import fs from "fs/promises";

// Optional test-only email
const TEST_EMAIL = process.env.TEST_EMAIL || null;

// Token helpers
export async function saveToken(token) {
  await fs.writeFile(
    "./token.json",
    JSON.stringify({ accessToken: token }, null, 2)
  );
}

export async function loadToken() {
  try {
    const data = await fs.readFile("./token.json", "utf-8");
    return JSON.parse(data).accessToken;
  } catch {
    return null;
  }
}

const isEligiblePlan = (plan) => {
  const toBool = (v) => v === true || v === "t";
  return (
    toBool(plan.is_available) &&
    !toBool(plan.is_on_hold) &&
    !toBool(plan.is_canceled) &&
    !toBool(plan.is_ended) &&
    !toBool(plan.is_exhausted)
  );
};

const checkPlans = async (reportingClient, person_id) => {
  try {
    const res = await reportingClient.post("/reports/person_plans/queries", {
      data: {
        type: "report_queries",
        attributes: {
          fields: [
            "person_id",
            "is_available",
            "is_on_hold",
            "is_canceled",
            "is_ended",
            "is_exhausted",
          ],
          filter: [["eq", "person_id", person_id]],
        },
      },
    });

    const plans = res.data?.data?.attributes?.rows || [];

    return plans.some((row) => {
      const [
        _person_id,
        is_available,
        is_on_hold,
        is_canceled,
        is_ended,
        is_exhausted,
      ] = row;

      return isEligiblePlan({
        is_available,
        is_on_hold,
        is_canceled,
        is_ended,
        is_exhausted,
      });
    });
  } catch (err) {
    console.error(`❌ Error fetching plans for person_id ${person_id}:`, err.response?.data || err.message);
    return false;
  }
};

// Main logic
export async function runMainLogic(accessToken, testEmail = TEST_EMAIL) {
  const coreClient = createPike13Client(accessToken);
  const reportingClient = createReportingClient(accessToken);

  console.log("📡 Calling Core API /desk/people...");
  const peopleRes = await coreClient.get("/desk/people", {
    params: {
      per_page: 100, // aumentar el rango
      is_member: true,
      sort: "-updated_at",
    },
  });

  let people = peopleRes.data.people || [];
  if (testEmail) {
    people = people.filter((p) => p.email === testEmail);
    console.log(`🧪 Test mode: ${people.length} match for ${testEmail}`);
  }
  console.log(`✅ Retrieved ${people.length} people`);

  console.log("📊 Fetching inactive clients from Reporting API v3...");
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
        filter: [["gt", "days_since_last_visit", 10]], // >10 días inactivos
      },
    },
  });

  const rows = reportRes.data?.data?.attributes?.rows || [];
  console.log(`🗂 Retrieved ${rows.length} inactive clients`);

  // Filtrar si hay testEmail
  const filteredRows = testEmail
    ? rows.filter((c) => c[1] === testEmail)
    : rows;

  // 1. Quitar "Pike13 Inactive" tag si han vuelto (<10 días)
  for (const row of rows) {
    const [_, email, full_name, __, days_since_last_visit] = row;
    if (!email || !full_name) continue;
    if (days_since_last_visit <= 10) {
      await removeInactiveTagIfActive(email, full_name);
    }
  }

  // 2. Enviar a GHL los que cumplen
  for (const row of filteredRows) {
    const [person_id, email, full_name, last_visit_date, days_since_last_visit] = row;

    if (!email || !full_name || days_since_last_visit === undefined) {
      console.warn(`⚠️ Skipping incomplete client:`, row);
      continue;
    }

    const hasPlan = await checkPlans(reportingClient, person_id);
    if (!hasPlan) {
      console.log(`🚫 Skipping ${email} - no valid plan`);
      continue;
    }

    console.log(`✅ Sending ${email} (${full_name}) to GoHighLevel`);
    await sendToGoHighLevel({
      email,
      full_name,
      days_since_last_visit,
    });
  }
}
