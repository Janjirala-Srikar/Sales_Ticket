const axios = require("axios");

const ZENDESK_DOMAIN = "https://vnrvjiet.zendesk.com";
const EMAIL = process.env.ZENDESK_EMAIL; // your email
const API_TOKEN = process.env.ZENDESK_API_TOKEN;

const createZendeskTicket = async ({ subject, description }) => {
  try {
    const response = await axios.post(
      `${ZENDESK_DOMAIN}/api/v2/tickets.json`,
      {
        ticket: {
          subject,
          description,
          priority: "normal",
        },
      },
      {
        auth: {
          username: `${EMAIL}/token`,
          password: API_TOKEN,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Zendesk API error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { createZendeskTicket };