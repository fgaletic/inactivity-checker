import cron from "node-cron";
import { loadToken, runMainLogic } from "./logic.js";

export async function startScheduledTasks(runImmediately = false) {
  const token = await loadToken();
  if (!token) {
    console.log("❌ No token found, skipping scheduler.");
    return;
  }

  // Schedule for 8 AM PT (Pacific Time)
  // PT is UTC-8 (PST) or UTC-7 (PDT), so 8 AM PT = 4 PM UTC (PST) or 3 PM UTC (PDT)
  // Using 16:00 UTC to cover PST (most common case)
  cron.schedule("0 16 * * *", async () => {
    console.log("🕗 [Cron] Daily inactive client sync started at 8 AM PT...");
    try {
      await runMainLogic(token);
      console.log("✅ [Cron] Daily sync completed successfully");
    } catch (err) {
      console.error("❌ [Cron] Failed to run main logic:", err);
    }
  });

  console.log("✅ Scheduler initialized: every day at 8 AM PT (4 PM UTC)");
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  console.log(`📅 Next run: Tomorrow at 8 AM PT (4 PM UTC)`);
  
  // Run immediately on startup if requested
  if (runImmediately) {
    console.log("🚀 Running initial sync on startup...");
    try {
      await runMainLogic(token);
      console.log("✅ Initial sync completed successfully");
    } catch (err) {
      console.error("❌ Initial sync failed:", err);
    }
  }
}
