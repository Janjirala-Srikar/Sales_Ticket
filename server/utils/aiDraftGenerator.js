// 🤖 AI Draft Generator - Uses Groq AI to create dynamic, context-aware email drafts
const Groq = require("groq-sdk");

// Initialize Groq at function call time, not at module load
const getGroqClient = () => {
  // ✅ Validate API key exists
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set in environment variables");
  }
  
  return new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
  });
};

const generateDraftFromSignal = async (signal, ticketData) => {
  const { type, summary, headline } = signal;
  const { subject = "", description = "" } = ticketData || {};

  try {
    console.log("🤖 Generating AI draft for signal type:", type);

    // ✅ Initialize Groq client at runtime with validation
    let groq;
    try {
      groq = getGroqClient();
    } catch (err) {
      console.error("❌ Groq initialization failed:", err.message);
      return generateFallbackDraft(type, summary, subject);
    }

    // ✅ Validate groq object
    if (!groq || !groq.chat || !groq.chat.completions) {
      console.error("❌ Groq client invalid structure");
      return generateFallbackDraft(type, summary, subject);
    }

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

    // ✅ Call Groq API with correct method
    const message = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // ✅ Validate response
    if (!message || !message.choices || message.choices.length === 0) {
      console.error("❌ Invalid Groq response structure");
      return generateFallbackDraft(type, summary, subject);
    }

    const generatedDraft = message.choices[0].message.content || "";

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
