import dotenv from "dotenv";
import axios from "axios";

const apiKey = process.env.GHL_API_KEY;

export async function getGHLLocations(apiKey) {
  try {
    const res = await axios.get("https://rest.gohighlevel.com/v1/locations/", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📍 Your Locations:");
    res.data.locations.forEach((loc) =>
      console.log(`- ${loc.name} (ID: ${loc.id})`)
    );

    return res.data.locations;
  } catch (err) {
    console.error("❌ Failed to get locations:", err.response?.data || err.message);
  }
}
