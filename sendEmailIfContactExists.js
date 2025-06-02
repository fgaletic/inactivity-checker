// import dotenv from "dotenv";
// import axios from "axios";

// const apiKey = process.env.GHL_API_KEY;

// /**
//  * Try to find a GHL contact by email and send an email if found
//  */
// export async function sendEmailIfContactExists({ apiKey, locationId, email, name }) {
//   try {
//     // 1. Search for contact
//     const searchRes = await axios.get(`https://rest.gohighlevel.com/v1/contacts/`, {
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//       },
//       params: {
//         email,
//       },
//     });

//     const contact = searchRes.data.contacts?.[0];
//     if (!contact) {
//       console.warn(`⚠️ No contact found for ${email}`);
//       return;
//     }

//     // 2. Send message
//     const message = `Hey ${name}, we noticed you haven’t been to Method3 in a while. We miss you! Let us know how you’re doing 💪`;

//     const sendRes = await axios.post(
//       `https://rest.gohighlevel.com/v1/locations/${locationId}/messages/`,
//       {
//         contactId: contact.id,
//         message: {
//           type: "EMAIL",
//           text: message,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log(`✅ Email sent to ${name} (${email})`);
//   } catch (err) {
//     console.error(`❌ Error sending to ${email}:`, err.response?.data || err.message);
//   }
// }
