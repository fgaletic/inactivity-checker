import cron from "node-cron";
import { loadToken, runMainLogic } from "./logic.js";

export async function startScheduledTasks() {
  const token = await loadToken();
  if (!token) {
    console.log("❌ No token found, skipping scheduler.");
    return;
  }

  cron.schedule("0 8 * * *", async () => {
    console.log("🕗 [Cron] Daily inactive client sync started...");
    try {
      await runMainLogic(token);
    } catch (err) {
      console.error("❌ [Cron] Failed to run main logic:", err);
    }
  });

  console.log("✅ Scheduler initialized: every day at 8am");
}
