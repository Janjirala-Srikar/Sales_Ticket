// 🤖 AI Draft Generator - Uses Groq AI to create dynamic, context-aware email drafts
const Groq = require("groq-sdk");

// Initialize Groq at function call time, not at module load
const getGroqClient = () => {
  return new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
  });
};

const generateDraftFromSignal = async (signal, ticketData) => {
  const { type, summary, headline } = signal;
  const { subject = "", description = "" } = ticketData || {};

  try {
    console.log("🤖 Generating AI draft for signal type:", type);

    // ✅ Initialize Groq client at runtime
    const groq = getGroqClient();

    // ✅ Create context-aware prompt for Groq
    const prompt = `You are a professional customer success and sales specialist.
    
Generate a short, personalized, and professional email response to the customer based on the following signal and ticket information.

SIGNAL TYPE: ${type}
SIGNAL SUMMARY: ${summary}
SIGNAL HEADLINE: ${headline}

TICKET SUBJECT: ${subject}
TICKET DESCRIPTION: ${description?.substring(0, 500)}...

INSTRUCTIONS:
1. Write a warm, professional, and concise email (max 150 words)
2. Reference the specific issue/signal mentioned
3. Show empathy and understanding
4. Propose next steps or a meeting
5. Keep tone professional but friendly
6. NO subject line needed, only the body

CRITICAL: Do NOT use markdown, just plain text. Do NOT include "Dear Customer" or placeholders.
Start directly with the message content.`;

    // ✅ Call Groq API for email generation
    const message = await groq.messages.create({
      model: "mixtral-8x7b-32768",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const generatedDraft =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("✅ AI Draft generated successfully");
    return generatedDraft.trim();
  } catch (error) {
    console.error("❌ Groq AI Error:", error.message);
    // Fallback to simple template if Groq fails
    return generateFallbackDraft(type, summary, subject);
  }
};

// 📧 Fallback template (if Groq AI fails)
const generateFallbackDraft = (signalType, summary, subject) => {
  const fallbacks = {
    churn_risk: () => `Hi,

Thank you for reaching out. I understand your concern regarding "${subject}".

${summary}

I'd like to help you address this directly. Our team is ready to provide immediate support and explore solutions that work best for your needs.

Would you be available for a brief call this week?

Best regards,`,

    expansion_signal: () => `Hi,

Great to connect with you! I noticed ${summary}

This is excellent progress. I believe we have solutions that could help accelerate your growth even further.

I'd love to schedule a quick call to discuss what could be a perfect fit for your needs.

Best regards,`,

    engagement_issue: () => `Hi,

I wanted to reach out regarding your recent experience.

${summary}

Your feedback is invaluable to us. I'd like to ensure we're meeting your expectations and would welcome the opportunity to address any concerns directly.

Let's set up a time to chat - I'm confident we can turn this around.

Best regards,`,

    retention_opportunity: () => `Hi,

I noticed ${summary}

We'd love to help you get the most value out of your account. Our team has successfully helped many customers unlock new capabilities that transform their results.

I'd be happy to spend 15 minutes with you next week to explore opportunities.

Best regards,`,
  };

  const generator = fallbacks[signalType] || fallbacks.engagement_issue;
  return generator();
};

module.exports = { generateDraftFromSignal };
