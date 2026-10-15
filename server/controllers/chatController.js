// AI Chat Controller with Groq LLM integration & comprehensive Civic Intelligence Engine
const axios = require('axios');

// Comprehensive Civic Knowledge Base & Multi-Intent NLP Engine
const CIVIC_INTENTS = [
  {
    id: 'FILE_COMPLAINT',
    keywords: [
      'how can i complaint', 'how to complaint', 'how can i complain', 'how to complain',
      'how do i file', 'how to file', 'how do i complain', 'file complaint', 'file a complaint',
      'lodge complaint', 'lodge a complaint', 'register complaint', 'register a complaint',
      'submit complaint', 'submit a complaint', 'make a complaint', 'new complaint',
      'raise complaint', 'post complaint', 'file grievance', 'submit grievance',
      'register grievance', 'how to report', 'report issue', 'report problem',
      'create ticket', 'raise ticket', 'i want to complain', 'complain about'
    ],
    response:
      "To file a complaint on CivicPulse, follow these simple steps:\n\n" +
      "1. 📝 Navigate to **'Submit Complaint'** from the top menu or click **'File Grievance'** on your dashboard.\n" +
      "2. 🏷️ Choose the relevant **Category** (Roads, Water, Electricity, Waste, Parks, Safety, or Construction).\n" +
      "3. ✍️ Fill in a clear **Title** and detailed **Description** explaining the issue and nearby landmarks.\n" +
      "4. 📍 Provide the exact **Location** (you can click the map or type the street/ward address).\n" +
      "5. 📸 Attach photo or document evidence if available (this speeds up physical inspection by field teams).\n" +
      "6. 🚀 Click **'Submit Complaint'**.\n\n" +
      "Our AI Intelligence Engine will automatically classify the department, assign priority level, check for duplicates, and dispatch it to the municipal engineer immediately!"
  },
  {
    id: 'TRACK_STATUS',
    keywords: [
      'track', 'status', 'check status', 'where is my complaint', 'my grievance',
      'check complaint', 'ticket status', 'progress', 'pending status', 'resolution status',
      'follow up', 'what happened to my', 'complaint progress', 'is it resolved'
    ],
    response:
      "You can track your complaint in real-time:\n\n" +
      "1. Open your **Citizen Dashboard**.\n" +
      "2. Look under the **'My Grievances'** section.\n" +
      "3. Each complaint displays its live status badge:\n" +
      "   • 🟡 **Submitted / Open**: Received by CivicPulse and queued for municipal verification.\n" +
      "   • 🟠 **In Progress**: A field crew or engineer is assigned and actively working on-site.\n" +
      "   • 🟢 **Resolved / Closed**: Work has been finished, inspected, and verified by ward officers.\n\n" +
      "Click on any complaint in your list to see detailed timeline history, administrative remarks, and status notes."
  },
  {
    id: 'SLA_TIMEFRAME',
    keywords: [
      'sla', 'how long', 'how much time', 'when will it be resolved', 'timeframe',
      'deadline', 'turnaround', 'expected time', 'how many days', 'service level',
      'resolution time', 'take to fix', 'how fast'
    ],
    response:
      "CivicPulse works under strict Municipal Citizen Charter Service Level Agreements (SLAs):\n\n" +
      "• 🚨 **Urgent / Emergency** (Live dangling electric wires, bursting water mains, deep road collapses): **12 to 24 hours**.\n" +
      "• 🔴 **High Priority** (Non-working streetlights at major junctions, blocked main sewer lines, missing manhole covers): **24 to 48 hours**.\n" +
      "• 🟡 **Medium Priority** (Potholes, missed garbage collection, park benches, pipeline leaks): **3 to 5 working days**.\n" +
      "• 🟢 **Low Priority** (Tree pruning, park landscaping, routine signage): **5 to 7 working days**.\n\n" +
      "If a ticket approaches its SLA limit without resolution, CivicPulse automatically flags it for supervisory escalation to the Zonal Commissioner."
  },
  {
    id: 'ROADS_POTHOLES',
    keywords: [
      'pothole', 'potholes', 'road', 'roads', 'asphalt', 'street', 'divider',
      'footpath', 'pavement', 'speed breaker', 'tar', 'crater', 'traffic road'
    ],
    response:
      "For road issues like potholes, damaged asphalt, or broken footpaths:\n\n" +
      "• **Category to Select**: **'Roads'**.\n" +
      "• **Responsible Department**: Highways & Municipal Public Works Department (PWD).\n" +
      "• **Helpful Tip**: Mention the exact street name, cross number, and nearest landmark. Attaching a photo showing the depth and scale of the pothole helps crews dispatch the right repair truck with cold/hot asphalt mix.\n" +
      "• **AI Note**: Potholes on high-traffic bus routes are automatically elevated to High priority by our AI risk model."
  },
  {
    id: 'WATER_SEWAGE',
    keywords: [
      'water', 'pipe', 'pipeline', 'leak', 'leakage', 'drain', 'drainage',
      'sewage', 'sewer', 'drinking water', 'manhole', 'overflow', 'contamination',
      'borewell', 'canal', 'canel', 'gutter'
    ],
    response:
      "For drinking water disruptions, pipeline bursts, or sewage overflows:\n\n" +
      "• **Category to Select**: **'Water'**.\n" +
      "• **Responsible Department**: Water Supply & Drainage Board (TWAD / Jal Board).\n" +
      "• **Emergency Cases**: If clean potable water is flooding roads or contaminated sewage is pooling near homes, state this clearly in your complaint. The AI Engine tags active water contamination or main pipeline bursts as **Urgent Priority** for emergency valve closure within 12–24 hours."
  },
  {
    id: 'ELECTRICITY_LIGHTING',
    keywords: [
      'electric', 'electricity', 'power', 'light', 'streetlight', 'street light',
      'streetlights', 'wire', 'wires', 'transformer', 'pole', 'blackout',
      'spark', 'cable', 'voltage', 'shock'
    ],
    response:
      "For power outages, faulty streetlights, or dangerous exposed wiring:\n\n" +
      "• **Category to Select**: **'Electricity'**.\n" +
      "• **Responsible Department**: State Electricity Board / DISCOM.\n" +
      "• **Safety Alert**: Dangling, sparking, or exposed cables are treated as **Life Safety Emergencies**. Please keep a distance of at least 15 feet and report it under Electricity immediately. Field emergency lines are dispatched with highest priority."
  },
  {
    id: 'WASTE_GARBAGE',
    keywords: [
      'garbage', 'waste', 'trash', 'dump', 'dumping', 'bin', 'bins',
      'debris', 'rubbish', 'litter', 'sanitation', 'cleanliness', 'hygiene'
    ],
    response:
      "For uncollected garbage, overflowing community bins, or illegal trash dumps:\n\n" +
      "• **Category to Select**: **'Waste'**.\n" +
      "• **Responsible Department**: Municipal Solid Waste Management & Health Department.\n" +
      "• **Helpful Tip**: Specify whether it is daily household garbage, construction debris, or commercial waste. Municipal sanitation inspectors will dispatch tipper trucks and sanitation staff to clear the spot."
  },
  {
    id: 'PARKS_RECREATION',
    keywords: [
      'park', 'parks', 'garden', 'gardens', 'tree', 'trees', 'playground',
      'bench', 'swing', 'grass', 'lawn', 'walking track'
    ],
    response:
      "For public parks, neighborhood gardens, or recreation grounds:\n\n" +
      "• **Category to Select**: **'Parks'**.\n" +
      "• **Responsible Department**: Parks & Horticulture Department.\n" +
      "• **Common Reports**: Broken playground swings, fallen branches obstructing walking trails, unmaintained grass, or non-functional park lighting. Include the park name and ward for quick action."
  },
  {
    id: 'SAFETY_HAZARD',
    keywords: [
      'safety', 'danger', 'hazard', 'hazardous', 'fire', 'accident',
      'security', 'collapse', 'unauthorized', 'encroachment', 'construction',
      'building collapse', 'stray dog', 'stray animal'
    ],
    response:
      "For public safety hazards, dangerous building conditions, or civic emergencies:\n\n" +
      "• **Category to Select**: **'Safety'** or **'Construction'**.\n" +
      "• **Responsible Department**: Public Safety & Town Planning Directorate.\n" +
      "• **Urgent Note**: For active life-threatening emergencies or fires, please call national emergency dispatch directly at **112** (or **101** for Fire). For civic hazards like dilapidated compound walls or unauthorized hazardous excavation, report here for municipal inspection."
  },
  {
    id: 'EDIT_DELETE',
    keywords: [
      'edit', 'modify', 'change', 'delete', 'cancel', 'remove',
      'update complaint', 'edit complaint', 'can i delete'
    ],
    response:
      "Managing your filed grievances on CivicPulse:\n\n" +
      "• **Adding Info / Photos**: You can add comments and additional notes anytime by opening the complaint detail view.\n" +
      "• **Status Updates**: Once submitted, municipal technicians update ticket stages from 'Submitted' to 'In Progress' and 'Resolved'.\n" +
      "• **Cancellation**: If an issue was resolved by the neighborhood prior to department arrival, you can mark it as resolved or request withdrawal from the detail page."
  },
  {
    id: 'PRIVACY_ANONYMITY',
    keywords: [
      'anonymous', 'privacy', 'secret', 'confidential', 'name shown',
      'my identity', 'is it safe', 'hide my name', 'private'
    ],
    response:
      "Your privacy is protected on CivicPulse:\n\n" +
      "• Your personal contact details (phone number, email address, residential address) are strictly protected and only accessible to assigned municipal administrators for verification.\n" +
      "• Public grievance feeds display citizen user profiles securely without revealing sensitive private identity data."
  },
  {
    id: 'HELPLINE_CONTACT',
    keywords: [
      'contact', 'helpline', 'phone', 'call', 'toll free', 'email',
      'office', 'officer', 'support', 'number', 'ward office'
    ],
    response:
      "CivicPulse & Municipal Support Channels:\n\n" +
      "• 📞 **Toll-Free Civic Helpline**: 1-800-8098-15 (Available 24x7)\n" +
      "• 📧 **Email Support**: support@civicpulse.gov\n" +
      "• 🚨 **National Emergency Numbers**:\n" +
      "   - Police: **100** / **112**\n" +
      "   - Fire Rescue: **101**\n" +
      "   - Medical Ambulance: **108**\n" +
      "• 🏛️ **Ward Offices**: Open Monday to Saturday, 9:00 AM – 5:30 PM."
  },
  {
    id: 'AI_CAPABILITIES',
    keywords: [
      'how does ai work', 'artificial intelligence', 'ai engine', 'ai model',
      'how ai helps', 'smart civic', 'what does ai do', 'how do you work'
    ],
    response:
      "CivicPulse is backed by an intelligent dual-service architecture:\n\n" +
      "1. 🧠 **Automated Categorization**: NLP classification predicts the correct civic department with >90% accuracy.\n" +
      "2. ⚡ **Priority Prediction**: Assesses risk factors (flooding, electrical hazards, traffic scale) to assign Urgent, High, Medium, or Low priority.\n" +
      "3. 🔍 **Duplicate Clustering**: Cosine similarity groups duplicate citizen complaints in the same ward to prevent redundant work orders.\n" +
      "4. 📊 **Sentiment & Spam Detection**: Automatically screens submissions to maintain fast municipal response times."
  },
  {
    id: 'GREETING',
    keywords: [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
      'greetings', 'namaste', 'howdy', 'sup', 'yo', 'halo'
    ],
    response:
      "Hello! 👋 I am your CivicPulse AI Assistant.\n\n" +
      "I'm here to help you resolve community issues faster! You can ask me:\n" +
      "• 📝 **'How can I file a complaint?'**\n" +
      "• ⏱️ **'What is the turnaround time (SLA)?'**\n" +
      "• 🔍 **'How do I track my complaint status?'**\n" +
      "• 💡 Advice on specific issues (Roads, Potholes, Water Leaks, Streetlights, Garbage).\n\n" +
      "What civic question can I assist you with right now?"
  },
  {
    id: 'GRATITUDE',
    keywords: [
      'thank you', 'thanks', 'thank u', 'awesome', 'helpful', 'great',
      'good job', 'perfect', 'appreciate', 'bye', 'goodbye', 'see you'
    ],
    response:
      "You're very welcome! 😊 CivicPulse is dedicated to making our neighborhoods cleaner, safer, and better managed.\n\n" +
      "Feel free to ask anytime you need assistance or notice a community issue. Have a wonderful day! 🌟"
  }
];

// Helper to calculate best matching intent
function findBestIntent(message) {
  const lower = message.toLowerCase().trim();
  const cleaned = lower.replace(/[?!.,'"`]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);

  let bestMatch = null;
  let highestScore = 0;

  for (const intent of CIVIC_INTENTS) {
    let score = 0;

    for (const kw of intent.keywords) {
      if (lower === kw) {
        score += 10; // Exact match
      } else if (lower.includes(kw)) {
        score += kw.split(' ').length >= 2 ? 6 : 3; // Phrase match gets higher weight
      } else {
        // Word token matching
        const kwWords = kw.split(' ');
        if (kwWords.length > 1 && kwWords.every((w) => words.includes(w))) {
          score += 4;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = intent;
    }
  }

  return highestScore >= 3 ? bestMatch : null;
}

// Dynamic contextual fallback generator
function generateContextualFallback(message) {
  const lower = message.toLowerCase();

  // Check for partial category references
  const categories = [];
  if (lower.includes('road') || lower.includes('pavement') || lower.includes('traffic')) categories.push('Roads');
  if (lower.includes('water') || lower.includes('leak') || lower.includes('drain')) categories.push('Water & Sewage');
  if (lower.includes('light') || lower.includes('electric') || lower.includes('wire')) categories.push('Electricity');
  if (lower.includes('waste') || lower.includes('clean') || lower.includes('trash')) categories.push('Waste Management');
  if (lower.includes('park') || lower.includes('tree')) categories.push('Parks & Recreation');
  if (lower.includes('safety') || lower.includes('hazard') || lower.includes('danger')) categories.push('Public Safety');

  if (categories.length > 0) {
    return (
      `It sounds like your issue relates to **${categories.join(' or ')}**.\n\n` +
      `To resolve this:\n` +
      `1. Click **'Submit Complaint'** on your top bar or dashboard.\n` +
      `2. Choose **${categories[0]}** as your category.\n` +
      `3. Enter your address or landmark, describe what is happening, and attach a photo if possible.\n\n` +
      `Would you like to know the typical municipal resolution timeframe (SLA) for ${categories[0]}?`
    );
  }

  // Conversational helpful options
  return (
    `I want to make sure I give you the most accurate municipal guidance! Could you tell me a bit more about your request?\n\n` +
    `Here are common things I can assist with:\n` +
    `• 📝 **Filing a Grievance**: Ask *"How can I file a complaint?"*\n` +
    `• ⏱️ **Resolution Timelines**: Ask *"How long does it take to fix an issue?"*\n` +
    `• 📍 **Tracking Grievances**: Ask *"How do I track my complaint?"*\n` +
    `• 🛠️ **Categories**: Inquire about Roads, Water Pipelines, Streetlights, Garbage, or Safety hazards.\n\n` +
    `What would you like assistance with?`
  );
}

exports.chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Empty message' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const isRealGroqKey =
      groqApiKey &&
      typeof groqApiKey === 'string' &&
      groqApiKey.trim().startsWith('gsk_');

    // 1. If a valid Groq API key is present, invoke Groq LLM
    if (isRealGroqKey) {
      try {
        const systemPrompt = `You are CivicPulse AI Assistant, an empathetic, highly knowledgeable civic guide for citizens and municipal administrators.
Your goals:
- Provide clear, actionable instructions on reporting community problems (Roads, Water, Electricity, Waste, Parks, Safety, Construction).
- Answer questions on civic SLAs, resolution tracking, municipal helplines, and department duties.
- Keep replies structured, concise, and civic-focused with formatting (bullet points, bold text).`;

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
            max_tokens: 450,
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${groqApiKey.trim()}`,
              'Content-Type': 'application/json',
            },
            timeout: 9000,
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
        console.warn('Groq API call unavailable, using CivicPulse Intelligence Engine:', groqErr.message);
      }
    }

    // 2. Intelligent Civic Intent Engine (NLP intent matching)
    const matchedIntent = findBestIntent(message);
    if (matchedIntent) {
      return res.json({
        success: true,
        response: matchedIntent.response,
      });
    }

    // 3. Dynamic contextual fallback
    return res.json({
      success: true,
      response: generateContextualFallback(message),
    });
  } catch (error) {
    console.error('Chat error in CivicPulse:', error);
    res.status(500).json({ success: false, error: 'Internal server error in AI Chat' });
  }
};
