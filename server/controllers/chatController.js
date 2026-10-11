// AI Chat Controller with Groq integration & intelligent civic assistant fallback

const axios = require('axios');

const CIVIC_FAQS = [
  {
    keywords: ['pothole', 'road', 'street', 'divider'],
    response: "For road issues like potholes or damaged streets, report it under the 'Roads' category with the exact street name or landmark. The Highways & Roads Department typically assesses priority based on traffic flow and safety hazards.",
  },
  {
    keywords: ['water', 'pipe', 'leak', 'drainage', 'sewage'],
    response: "Water supply disruptions or sewage leaks should be filed under 'Water'. If water is leaking onto main roads or near electrical installations, our AI engine will automatically flag it as High/Urgent priority for immediate municipal action.",
  },
  {
    keywords: ['electric', 'power', 'light', 'wire', 'street light'],
    response: "Electrical faults, non-functional streetlights, or loose wires belong in 'Electricity'. Dangling or exposed wires are treated as urgent safety emergencies by the power board.",
  },
  {
    keywords: ['garbage', 'waste', 'trash', 'dump'],
    response: "Garbage accumulation or missed collection can be reported under 'Waste'. Adding a photo and landmark helps sanitation workers dispatch trucks to the exact collection point.",
  },
  {
    keywords: ['how to', 'submit', 'track', 'status'],
    response: "You can submit a complaint by clicking 'File Grievance' on your dashboard. Enter a title, description, and location pin. You can track resolution progress in real-time under 'My Grievances'!",
  },
];

exports.chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Empty message' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    // If Groq API key is configured, call Groq LLM
    if (groqApiKey && groqApiKey.trim() !== '') {
      try {
        const systemPrompt = `You are CivicPulse AI Assistant, a friendly and intelligent civic guide for citizens.
Your job is to:
- Guide citizens on reporting community complaints (Roads, Water, Electricity, Waste, Parks, Safety, Construction).
- Explain civic processes clearly and politely.
- Keep replies helpful, concise, and civic-focused.`;

        const messages = [{ role: 'system', content: systemPrompt }];

        if (Array.isArray(history)) {
          history.slice(-4).forEach((msg) => {
            if (msg.role && msg.content) {
              messages.push({ role: msg.role, content: msg.content });
            }
          });
        }

        messages.push({ role: 'user', content: message.trim() });

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages,
            max_tokens: 350,
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          }
        );

        if (
          groqResponse.data &&
          groqResponse.data.choices &&
          groqResponse.data.choices[0]
        ) {
          return res.json({
            success: true,
            response: groqResponse.data.choices[0].message.content,
          });
        }
      } catch (groqErr) {
        console.warn('Groq API call failed, falling back to local civic knowledge:', groqErr.message);
      }
    }

    // Fallback: Intelligent Civic Knowledge Base
    const lower = message.toLowerCase();
    for (const faq of CIVIC_FAQS) {
      if (faq.keywords.some((kw) => lower.includes(kw))) {
        return res.json({
          success: true,
          response: faq.response,
        });
      }
    }

    // Default response
    return res.json({
      success: true,
      response: `Hello! I am your CivicPulse Assistant. You can ask me how to file complaints, inquire about categories like Roads, Water, Electricity, or Waste, or ask how municipal SLAs work. How can I assist your neighborhood today?`,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Internal server error in AI Chat' });
  }
};
