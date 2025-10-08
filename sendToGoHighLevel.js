import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "true";

// Helper function to add delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry API calls
const retryApiCall = async (apiCall, maxRetries = 3, delayMs = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed for API call`);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
    }
  }
};

export async function sendToGoHighLevel(client) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  console.log("Sending with custom field:", {
  "dayssincelastvisit": client.days_since_last_visit,
});

  if (DRY_RUN) {
    console.log("🧪 DRY RUN: Would send to GHL:", {
      email: client.email,
      name: client.full_name,
      customField: {
        "dayssincelastvisit": client.days_since_last_visit,
      },
      locationId: GHL_LOCATION_ID,
      tags: ["Pike13 Inactive"],
    });
    return;
  }

  try {
    // Add delay to avoid rate limiting
    await delay(500);
    
    let contactExists = false;
    let existingContact = null;
    
    // Check if contact already exists with retry logic
    try {
      const searchRes = await retryApiCall(async () => {
        return await axios.get(
      `https://rest.gohighlevel.com/v1/contacts/lookup?email=${encodeURIComponent(client.email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
        },
      }
    );
      });

    if (searchRes.data && searchRes.data.contact) {
      console.log(`⚠️ Contact already exists in GHL: ${client.email}`);
      
      // Add "Pike13 Inactive" tag to existing contact without removing other tags
      const existingContact = searchRes.data.contact;
      const existingTags = existingContact.tags || [];
      
      // Check if already has the inactive tag
      if (existingTags.includes("Pike13 Inactive")) {
        console.log(`✅ Contact ${client.email} already has "Pike13 Inactive" tag`);
        return;
      }
      
      // Add the inactive tag to existing tags
      const updatedTags = [...existingTags, "Pike13 Inactive"];
      
      try {
        await axios.post(
          `https://rest.gohighlevel.com/v1/contacts/${existingContact.id}/tags`,
          { tags: ["Pike13 Inactive"] },
          {
            headers: {
              Authorization: `Bearer ${GHL_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        
        console.log(`📬 Added "Pike13 Inactive" tag to existing contact: ${client.full_name} (${client.email})`);
        return;
      } catch (error) {
        console.error(
          `❌ Failed to add tag to existing contact ${client.email}:`,
          error.response?.data || error.message
        );
      }
      return;
    }

    // Create new contact
    const payload = {
      email: client.email,
      name: client.full_name,
      customField: {
        "dayssincelastvisit": client.days_since_last_visit,
      },
      locationId: GHL_LOCATION_ID,
      tags: ["Pike13 Inactive"],
    };

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
        });

        console.log(`📬 Created new contact in GHL: ${client.full_name} (${client.email})`);
      console.log(`📬 Created new contact in GHL: ${client.full_name} (${client.email})`);
      return res.data;
    } catch (error) {
      console.error(
          `❌ Failed to create ${client.email} in GHL after retries:`,
        `❌ Failed to create contact ${client.email} in GHL:`,
        error.response?.data || error.message
      );
        console.error(`   Full error details:`, error.response?.status, error.response?.statusText);
        
        // Log the payload that failed for debugging
        console.error(`   Failed payload:`, JSON.stringify(payload, null, 2));
      }
    }
  } catch (error) {
    console.error(
      `❌ Error checking if contact exists for ${client.email} after retries:`,
      error.response?.data || error.message
    );
    console.error(`   Full error details:`, error.response?.status, error.response?.statusText);
  }
}
