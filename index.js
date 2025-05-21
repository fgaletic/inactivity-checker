require("dotenv").config();
const axios = require("axios");
const dayjs = require("dayjs");

const API = axios.create({
  baseURL: process.env.PIKE13_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PIKE13_API_TOKEN}`,
    Accept: "application/json",
  },
});

async function fetchClients() {
  try {
    const res = await API.get("/clients");
    return res.data.clients;
  } catch (error) {
    console.error("Error fetching clients:", error.response?.data || error.message);
    return [];
  }
}

async function main() {
  const clients = await fetchClients();

  const now = dayjs();

  const inactiveClients = clients.filter((client) => {
    const lastVisit = dayjs(client.last_attended_at); // adjust if needed
    const daysSince = now.diff(lastVisit, "day");

    const isPaused =
      client.custom_fields?.some((f) =>
        ["vacation", "injury", "pause"].some((keyword) =>
          f.value?.toLowerCase().includes(keyword)
        )
      ) || false;

    return daysSince > 10 && !isPaused;
  });

  console.log("Inactive clients:", inactiveClients.map((c) => c.name));
}

main();
