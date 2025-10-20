import { loadToken, runMainLogic } from "./logic.js";
import dotenv from "dotenv";

dotenv.config();

async function manualSync() {
  console.log("🚀 Starting manual sync...");
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  
  try {
    const token = await loadToken();
    
    if (!token) {
      console.error("❌ No token found. Please check your environment variables or token.json file.");
      process.exit(1);
    }
    
    console.log("🔐 Token loaded successfully");
    
    await runMainLogic(token);
    
    console.log("✅ Manual sync completed successfully!");
  } catch (error) {
    console.error("❌ Manual sync failed:", error);
    process.exit(1);
  }
}

manualSync();

