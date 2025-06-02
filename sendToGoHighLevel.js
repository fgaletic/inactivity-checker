import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "true";

export async function sendToGoHighLevel(client) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  console.log("Sending with custom field:", {
  "dayssincelastvisit": client.days_since_last_visit,
});

const payload = {
  email: client.email,
  name: client.full_name,
  customField: {
    "dayssincelastvisit": client.days_since_last_visit,
  },
  locationId: GHL_LOCATION_ID,
  tags: ["Pike13 Inactive"],
};

  if (DRY_RUN) {
    console.log("🧪 DRY RUN: Would send to GHL:", payload);
    return;
  }

  try {
    // Check if contact already exists
    const searchRes = await axios.get(
      `https://rest.gohighlevel.com/v1/contacts/lookup?email=${encodeURIComponent(client.email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
        },
      }
    );

    if (searchRes.data && searchRes.data.contact) {
      console.log(`⚠️ Contact already exists in GHL: ${client.email}`);
      return;
    }

    try {
      const res = await axios.post(
        `https://rest.gohighlevel.com/v1/contacts/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`📬 Sent to GHL: ${client.full_name} (${client.email})`);
      return res.data;
    } catch (error) {
      console.error(
        `❌ Failed to send ${client.email} to GHL:`,
        error.response?.data || error.message
      );
    }
  } catch (error) {
    console.error(
      `❌ Error checking if contact exists for ${client.email}:`,
      error.response?.data || error.message
    );
  }
}
