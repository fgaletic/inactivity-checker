import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import open from "open";
import fs from "fs/promises";
import { createPike13Client, createReportingClient } from "./api.js";

dotenv.config();

const app = express();
const PORT = 3000;

const {
  PIKE13_CLIENT_ID,
  PIKE13_CLIENT_SECRET,
  PIKE13_REDIRECT_URI,
} = process.env;

const SUBDOMAIN = "method3fitness";

const AUTHORIZE_URL = `https://${SUBDOMAIN}.pike13.com/oauth/authorize?response_type=code&client_id=${PIKE13_CLIENT_ID}&redirect_uri=${encodeURIComponent(
  PIKE13_REDIRECT_URI
)}`;

// 🧠 Token helpers
async function saveToken(token) {
  await fs.writeFile("./token.json", JSON.stringify({ accessToken: token }, null, 2));
}

async function loadToken() {
  try {
    const data = await fs.readFile("./token.json", "utf-8");
    return JSON.parse(data).accessToken;
  } catch {
    return null;
  }
}

// 🔐 OAuth entry point
app.get("/", (req, res) => {
  res.send(`<a href="${AUTHORIZE_URL}">Authorize with Pike13</a>`);
});

// 🪄 OAuth callback
app.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("Missing auth code");

  try {
    const tokenRes = await axios.post(
      `https://${SUBDOMAIN}.pike13.com/oauth/token`,
      {
        grant_type: "authorization_code",
        code,
        redirect_uri: PIKE13_REDIRECT_URI,
        client_id: PIKE13_CLIENT_ID,
        client_secret: PIKE13_CLIENT_SECRET,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = tokenRes.data.access_token;
    await saveToken(accessToken);
    console.log("🎉 Access Token saved.");
    res.send("✅ Authorization complete! You can close this window.");
    await runMainLogic(accessToken);
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    if (!res.headersSent) res.send("Error exchanging token.");
  }
});

// 🧠 Main logic that runs whether cached or fresh token
async function runMainLogic(accessToken) {
  const coreClient = createPike13Client(accessToken);
  const reportingClient = createReportingClient(accessToken); // you can use later if needed

  // Step 1: Get people
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

 // Step 2: Get inactive clients from Reporting API v3
console.log("📊 Fetching client report from Reporting API v3...");

const reportRes = await reportingClient.post("/reports/clients/queries", {
  fields: [
    "person_id",
    "email",
    "full_name",
    "last_visit_date",
    "days_since_last_visit",
  ],
  limit: 100,
  order_by: [{ field: "days_since_last_visit", direction: "desc" }],
  filter: {
    days_since_last_visit: { gt: 10 },
  },
});

const rows = reportRes.data.rows;
console.log(`🗂 Retrieved ${rows.length} inactive clients`);
rows.slice(0, 5).forEach((p) =>
  console.log(
    `- ${p.full_name} (${p.email}) – Last visit: ${
      p.last_visit_date || "Never"
    } (${p.days_since_last_visit} days ago)`
  )
);
}

// 🚀 Start server + auto run if token exists
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  const cachedToken = await loadToken();
  if (cachedToken) {
    console.log("🔐 Using saved token. Skipping login.");
    await runMainLogic(cachedToken);
  } else {
    console.log("🔑 No token found. Please authorize via browser...");
    open(`http://localhost:${PORT}`);
  }
});
