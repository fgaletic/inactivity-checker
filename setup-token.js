#!/usr/bin/env node

/**
 * Helper script to set up Pike13 token for cloud deployment
 * Run this locally to get your token, then add it to Koyeb environment variables
 */

import { createPike13Client } from "./api.js";
import { saveToken } from "./logic.js";
import dotenv from "dotenv";
import open from "open";

dotenv.config();

const PIKE13_CLIENT_ID = process.env.PIKE13_CLIENT_ID;
const PIKE13_REDIRECT_URI = process.env.PIKE13_REDIRECT_URI || "http://localhost:3000/callback";
const PORT = process.env.PORT || 3000;

if (!PIKE13_CLIENT_ID) {
  console.error("❌ PIKE13_CLIENT_ID environment variable is required");
  process.exit(1);
}

console.log("🔑 Pike13 Token Setup for Cloud Deployment");
console.log("==========================================");
console.log("");

// Check if token already exists
import fs from "fs/promises";
try {
  const tokenData = await fs.readFile("./token.json", "utf-8");
  const { accessToken } = JSON.parse(tokenData);
  
  if (accessToken) {
    console.log("✅ Token found in token.json");
    console.log("");
    console.log("📋 Copy this token to your Koyeb environment variables:");
    console.log(`PIKE13_API_TOKEN=${accessToken}`);
    console.log("");
    console.log("⚠️  Note: This token may expire. You may need to refresh it periodically.");
    process.exit(0);
  }
} catch (error) {
  // Token file doesn't exist or is invalid
}

console.log("🚀 Starting OAuth flow to get Pike13 token...");
console.log("");

// Start a simple server to handle the callback
import express from "express";
const app = express();

app.get("/callback", async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    res.status(400).send("No authorization code received");
    return;
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch("https://api.pike13.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: PIKE13_CLIENT_ID,
        redirect_uri: PIKE13_REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      await saveToken(tokenData.access_token);
      
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Token Setup Complete!</h2>
            <p>Your Pike13 token has been saved to <code>token.json</code></p>
            <p><strong>Copy this token to your Koyeb environment variables:</strong></p>
            <p style="background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace;">
              PIKE13_API_TOKEN=${tokenData.access_token}
            </p>
            <p>You can now close this window and deploy to Koyeb.</p>
          </body>
        </html>
      `);
      
      console.log("✅ Token received and saved!");
      console.log("");
      console.log("📋 Copy this token to your Koyeb environment variables:");
      console.log(`PIKE13_API_TOKEN=${tokenData.access_token}`);
      console.log("");
      
      // Close the server
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    } else {
      res.status(400).send("Failed to get access token");
    }
  } catch (error) {
    console.error("❌ Error getting token:", error);
    res.status(500).send("Error getting token");
  }
});

// Start server
const server = app.listen(PORT, () => {
  const authUrl = `https://api.pike13.com/oauth/authorize?client_id=${PIKE13_CLIENT_ID}&redirect_uri=${encodeURIComponent(PIKE13_REDIRECT_URI)}&response_type=code`;
  
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log("🔗 Opening browser for Pike13 authorization...");
  console.log("");
  
  open(authUrl);
});
