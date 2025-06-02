import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const TAG_TO_REMOVE = "Pike13 Inactive";

/**
 * Remove the "Pike13 Inactive" tag from active clients.
 * @param {string} email - Contact email
 * @param {string} name - Contact name (optional, just for logging)
 */
export async function removeInactiveTagIfActive(email, name = "") {
  try {
    // Search for contact
    const res = await axios.get(`https://rest.gohighlevel.com/v1/contacts/lookup`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
      params: { email },
    });

    const contact = res.data?.contact;
    if (!contact) {
      console.log(`❌ No GHL contact found for ${email}`);
      return;
    }

    const tagList = contact.tags || [];
    if (!tagList.includes(TAG_TO_REMOVE)) {
      console.log(`✅ ${email} does not have "${TAG_TO_REMOVE}" tag`);
      return;
    }

    // Remove tag
    await axios.delete(
      `https://rest.gohighlevel.com/v1/contacts/${contact.id}/tags/${encodeURIComponent(TAG_TO_REMOVE)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
        },
      }
    );

    console.log(`♻️ Removed "${TAG_TO_REMOVE}" tag from ${name || email}`);
  } catch (err) {
    console.error(`❌ Error removing tag from ${email}:`, err.response?.data || err.message);
  }
}
