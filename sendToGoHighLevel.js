export async function sendToGoHighLevel(contacts) {
    const GHL_API_KEY = process.env.GHL_API_KEY;
    const LOCATION_ID = process.env.GHL_LOCATION_ID;

    for (const c of contacts) {
        try {
            const fullName = c.full_name;
            const [first_name, ...rest] = fullName.split(" ");
            const last_name = rest.join(" ");

            await axios.post(
                "https://rest.gohighlevel.com/v1/contacts/",
                {
                    email: c.email,
                    firstName: first_name,
                    lastName: last_name,
                    locationId: LOCATION_ID,
                    tags: ["inactive_10days"],
                    customField: {
                        // Optional if you have custom fields
                        last_visit_date: c.last_visit_date
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${GHL_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            console.log(`📬 Sent to GHL: ${fullName}`);
        } catch (e) {
            console.error(`❌ Failed to send ${c.email}:`, e.response?.data || e.message);
        }
    }
}
