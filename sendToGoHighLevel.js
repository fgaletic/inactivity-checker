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
        contactExists = true;
        existingContact = searchRes.data.contact;
      }
    } catch (lookupError) {
      // If lookup fails (e.g., invalid email), assume contact doesn't exist
      console.log(`⚠️ Lookup failed for ${client.email}, assuming new contact:`, lookupError.response?.data?.message || lookupError.message);
      contactExists = false;
    }

    if (contactExists) {
      // Contact exists - update with tag and custom field
      const contactId = existingContact.id;
      
      console.log(`🔄 Updating existing contact in GHL: ${client.email}`);
      
      try {
        const updateRes = await retryApiCall(async () => {
          return await axios.put(
            `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
            {
              ...payload,
              // Merge existing tags with new tag
              tags: [...(existingContact.tags || []), "Pike13 Inactive"].filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
            },
            {
              headers: {
                Authorization: `Bearer ${GHL_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
        });

        console.log(`📬 Updated existing contact in GHL: ${client.full_name} (${client.email})`);
        return updateRes.data;
      } catch (error) {
        console.error(
          `❌ Failed to update ${client.email} in GHL after retries:`,
          error.response?.data || error.message
        );
        console.error(`   Full error details:`, error.response?.status, error.response?.statusText);
      }
    } else {
      // Contact doesn't exist - create new one
      console.log(`➕ Creating new contact in GHL: ${client.email}`);
      
      try {
        const res = await retryApiCall(async () => {
          return await axios.post(
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
      return res.data;
    } catch (error) {
      console.error(
          `❌ Failed to create ${client.email} in GHL after retries:`,
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
