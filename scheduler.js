import cron from "node-cron";
import { loadToken, runMainLogic } from "./logic.js";

export async function startScheduledTasks() {
  const token = await loadToken();
  if (!token) {
    console.log("❌ No token found, skipping scheduler.");
    return;
  }

  // Schedule for 8 AM ET (Eastern Time)
  // ET is UTC-5 (EST) or UTC-4 (EDT), so 8 AM ET = 1 PM UTC (EST) or 12 PM UTC (EDT)
  // Using 13:00 UTC to cover EST (most common case)
  cron.schedule("0 13 * * *", async () => {
    console.log("🕗 [Cron] Daily inactive client sync started at 8 AM ET...");
    try {
      await runMainLogic(token);
    } catch (err) {
      console.error("❌ [Cron] Failed to run main logic:", err);
    }
  });

  console.log("✅ Scheduler initialized: every day at 8 AM ET (1 PM UTC)");
}
