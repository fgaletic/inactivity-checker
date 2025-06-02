import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GHL_API_KEY = process.env.GHL_API_KEY;

export async function removeInactiveTagIfActive(email, name) {
  try {
    const res = await axios.get(
      `https://rest.gohighlevel.com/v1/contacts/lookup?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
        },
      }
    );

    const contact = res.data?.contact;

    if (!contact) {
      console.log(`👻 No GHL contact found for ${email}`);
      return;
    }

    const hasInactiveTag = contact.tags?.includes("Pike13 Inactive");
    if (!hasInactiveTag) return;

    console.log(`🔁 Removing 'Pike13 Inactive' from ${name} (${email})`);

    await axios.post(
      `https://rest.gohighlevel.com/v1/contacts/${contact.id}/tags.remove`,
      { tags: ["Pike13 Inactive"] },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Removed tag from ${email}`);
  } catch (err) {
    console.error(`❌ Failed to remove tag for ${email}:`, err.response?.data || err.message);
  }
}
