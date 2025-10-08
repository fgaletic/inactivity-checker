import { createPike13Client, createReportingClient } from "./api.js";
import { removeInactiveTagIfActive } from "./removeInactiveTagIfActive.js";
import { sendToGoHighLevel } from "./sendToGoHighLevel.js";
import fs from "fs/promises";

// Optional test-only email
const TEST_EMAIL = process.env.TEST_EMAIL || null;

// Toggle for plan checking (enabled to test with product_type)
const SKIP_PLAN_CHECK = false;

// Token helpers
export async function saveToken(token) {
  await fs.writeFile(
    "./token.json",
    JSON.stringify({ accessToken: token }, null, 2)
  );
}

export async function loadToken() {
  // First try environment variable (for cloud deployment)
  if (process.env.PIKE13_API_TOKEN) {
    return process.env.PIKE13_API_TOKEN;
  }
  
  // Fallback to local token.json file (for local development)
  try {
    const data = await fs.readFile("./token.json", "utf-8");
    return JSON.parse(data).accessToken;
  } catch {
    return null;
  }
}

const isEligiblePlan = (plan) => {
  // Check if they have current plans AND are not on hold
  // This matches the client's UI logic: "Has Plan on Hold? = No"
  const hasPlans = plan.current_plans && plan.current_plans.trim().length > 0;
  const notOnHold = plan.has_plan_on_hold === false;
  
  console.log(`🔍 Plan check: hasPlans=${hasPlans}, notOnHold=${notOnHold}, current_plans="${plan.current_plans}", has_plan_on_hold=${plan.has_plan_on_hold}`);
  
  return hasPlans && notOnHold;
};

const checkPlans = async (reportingClient, person_id) => {
  try {
    // Use the correct field names from Pike13 documentation
    const res = await reportingClient.post("/reports/clients/queries", {
      data: {
        type: "report_queries",
        attributes: {
          fields: [
            "person_id",
            "current_plans",
            "current_plan_types", 
            "current_plan_revenue_category",
            "has_plan_on_hold",
          ],
          filter: [["eq", "person_id", person_id]],
        },
      },
    });

    const plans = res.data?.data?.attributes?.rows || [];
    
    // Debug: Log the plan details
    if (plans.length > 0) {
      console.log(`🔍 Plan data for person_id ${person_id}:`, plans[0]);
    }

    return plans.some((row) => {
      const [
        _person_id,
        current_plans,
        current_plan_types,
        current_plan_revenue_category,
        has_plan_on_hold,
      ] = row;

      const planData = {
        current_plans,
        current_plan_types,
        current_plan_revenue_category,
        has_plan_on_hold,
      };
      
      const isEligible = isEligiblePlan(planData);
      console.log(`🔍 Plan eligibility for person_id ${person_id}:`, planData, `→ ${isEligible}`);
      
      return isEligible;
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

  // Skip Core API - the Reporting API interface has all the filters we need

  console.log("📊 Fetching clients with active plans from Reporting API v3...");
  
  let allRows = [];
  let lastKey = null;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}...`);
    
    const pageData = {
      type: "report_queries",
      attributes: {
        fields: [
          "person_id",
          "email",
          "full_name",
          "last_visit_date",
          "days_since_last_visit",
          "current_plans",
          "has_plan_on_hold",
        ],
        filter: [
          "and",
          [
            ["nemp", "current_plans"], // Has current plans (not empty)
            ["eq", "has_plan_on_hold", "f"], // Not on hold (f = false)
            ["gt", "days_since_last_visit", 10] // Inactive for 10+ days
          ]
        ],
        page: {
          limit: 500, // Maximum page size
        },
      },
    };

    // Add starting_after for pagination (except first page)
    if (lastKey) {
      pageData.attributes.page.starting_after = lastKey;
    }

    const reportRes = await reportingClient.post("/reports/clients/queries", {
      data: pageData,
    });

    const pageRows = reportRes.data?.data?.attributes?.rows || [];
    allRows = allRows.concat(pageRows);
    
    hasMore = reportRes.data?.data?.attributes?.has_more || false;
    lastKey = reportRes.data?.data?.attributes?.last_key;
    
    console.log(`📄 Page ${pageCount}: ${pageRows.length} clients (Total so far: ${allRows.length})`);
    
    if (hasMore) {
      console.log(`📄 More pages available, continuing...`);
    }
  }

  console.log(`📊 Completed pagination: ${allRows.length} total clients across ${pageCount} pages`);
  
  // Use allRows instead of reportRes.data
  const rows = allRows;

  if (!rows || rows.length === 0) {
    console.error("❌ No rows returned from the report API");
    return;
  }

  console.log(`🗂 Retrieved ${rows.length} clients with active plans who are inactive`);

  const filteredRows = testEmail
  ? rows.filter((c) => c[1] === testEmail)
  : rows;

// Remove "Pike13 Inactive" tag from recently active users
for (const row of rows) {
  const [_, email, full_name, __, days_since_last_visit] = row;

  if (!email || !full_name || days_since_last_visit === undefined) continue;

  if (days_since_last_visit <= 10) {
    await removeInactiveTagIfActive(email, full_name);
  }
}

// Proceed with sending clients with active plans who are inactive to GoHighLevel
console.log(`🔄 Processing ${filteredRows.length} clients with active plans who are inactive...`);

  let processedCount = 0;
  let skippedIncomplete = 0;

for (const row of filteredRows) {
  const [person_id, email, full_name, last_visit_date, days_since_last_visit, current_plans, has_plan_on_hold] = row;

  if (!email || !full_name || days_since_last_visit === undefined) {
    console.warn(`⚠️ Skipping incomplete client:`, row);
    skippedIncomplete++;
    continue;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn(`⚠️ Skipping invalid email: ${email} (${full_name})`);
    skippedIncomplete++;
    continue;
  }

  // All filtering is done by the API query - these clients have active plans and are inactive
  console.log(`✅ Processing ${email} (${full_name}) - ${days_since_last_visit} days inactive, plans: ${current_plans}`);

  console.log(`✅ Sending to GHL: ${email} (${full_name}) - ${days_since_last_visit} days inactive`);
  await sendToGoHighLevel({
    email,
    full_name,
    days_since_last_visit,
  });
  processedCount++;
  
  // Add a small delay between clients to avoid overwhelming the API
  await new Promise(resolve => setTimeout(resolve, 100));
}

  console.log(`📊 Summary:`);
  console.log(`   - Total clients with active plans who are inactive: ${filteredRows.length}`);
  console.log(`   - Skipped (incomplete data): ${skippedIncomplete}`);
  console.log(`   - Successfully processed: ${processedCount}`);
}
