import express from "express";
import dotenv from "dotenv";
import open from "open";
import axios from "axios";
import cors from "cors";
import { saveToken, loadToken, runMainLogic } from "./logic.js";
import { startScheduledTasks } from "./scheduler.js";

dotenv.config();

const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";

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

app.use(cors());

app.get("/", (req, res) => {
  res.send(`<a href="${AUTHORIZE_URL}">Authorize with Pike13</a>`);
});

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
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    await saveToken(accessToken);
    console.log("🎉 Access Token saved.");
    res.send("✅ Authorization complete! You can close this window.");
    await runMainLogic(token, TEST_EMAIL);
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    if (!res.headersSent) res.send("Error exchanging token.");
  }
});

app.post("/sync-inactive-clients", async (req, res) => {
  try {
    const token = await loadToken();
    if (!token) {
      return res.status(400).send("No token found. Please authorize first.");
    }

    await runMainLogic(token);
    res.status(200).send("Inactive clients synced successfully.");
  } catch (err) {
    console.error("❌ Failed to sync inactive clients:", err);
    res.status(500).send("Failed to sync inactive clients.");
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  const token = await loadToken();

  if (token) {
    console.log("🔐 Using saved token. Skipping login.");
    await runMainLogic(token);
    await startScheduledTasks();
  } else {
    console.log("🔑 No token found. Please authorize via browser...");
    open(`http://localhost:${PORT}`);
  }
});
