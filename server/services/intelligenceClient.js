/**
 * Civic Core Service — Inter-Service REST Client
 * Communicates directly with Civic Intelligence Service (Python/Flask)
 * Configurable via INTELLIGENCE_SERVICE_URL environment variable.
 * Includes bounded timeout, correlation IDs, and resilient fallback handling.
 */

const axios = require('axios');
const crypto = require('crypto');

const INTELLIGENCE_SERVICE_URL =
  process.env.INTELLIGENCE_SERVICE_URL ||
  process.env.AI_SERVICE_URL ||
  'http://localhost:5001';

const TIMEOUT_MS = Number(process.env.INTELLIGENCE_SERVICE_TIMEOUT_MS) || 4500;

// Local fallback heuristics if Intelligence Service is temporarily unavailable
function generateLocalFallbackAnalysis(title = '', description = '', categoryHint = '') {
  const combined = `${title} ${description}`.toLowerCase();
  
  let category = categoryHint || 'Roads';
  if (!categoryHint || categoryHint === 'Other') {
    if (/(water|pipe|leak|drain|sewer|flood)/i.test(combined)) category = 'Water';
    else if (/(electric|power|light|wire|cable|pole)/i.test(combined)) category = 'Electricity';
    else if (/(garbage|waste|trash|dump|bin|debris)/i.test(combined)) category = 'Waste';
    else if (/(park|tree|garden|playground|swing)/i.test(combined)) category = 'Parks';
    else if (/(hazard|danger|fire|accident|collapse)/i.test(combined)) category = 'Safety';
    else if (/(building|construction|demolition)/i.test(combined)) category = 'Construction';
    else category = 'Roads';
  }

  const isUrgent = /(emergency|burst|fire|shock|danger|hazard|sparking|accident)/i.test(combined);
  const isHigh = /(major|broken|blocking|heavy|overflow|risk)/i.test(combined);
  const priority = isUrgent ? 'Urgent' : isHigh ? 'High' : combined.length > 50 ? 'Medium' : 'Low';

  const isSpam = /(free money|crypto|casino|win|lottery|click here)/i.test(combined) || (title.trim().length < 3 && description.trim().length < 5);

  const deptMap = {
    Roads: 'Roads & Transportation',
    Water: 'Water & Sewage',
    Electricity: 'Electricity Department',
    Waste: 'Waste Management',
    Parks: 'Parks & Recreation',
    Safety: 'Public Safety',
    Construction: 'Building & Construction',
    Other: 'General Civic Administration',
  };

  return {
    category,
    categoryConfidence: 0.75,
    priority,
    priorityConfidence: 0.70,
    spamScore: isSpam ? 0.8 : 0.05,
    isSpam,
    spamFlags: isSpam ? ['KEYWORD_TRIGGER'] : [],
    sentimentScore: isUrgent ? -0.8 : -0.3,
    urgencyScore: isUrgent ? 0.9 : 0.4,
    department: deptMap[category] || 'General Civic Administration',
    similarComplaints: [],
    similarCount: 0,
    serviceStatus: 'fallback',
    modelVersion: 'local-fallback-v1',
    analysisId: null,
  };
}

/**
 * Primary Inter-Service REST call:
 * Transmits complaint data to Civic Intelligence Service for NLP/ML analysis.
 */
async function analyzeComplaintWithIntelligenceService({
  title,
  description,
  category = null,
  complaintId = '',
  existingComplaints = [],
  correlationId = null,
}) {
  const corrId = correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const targetUrl = `${INTELLIGENCE_SERVICE_URL.replace(/\/$/, '')}/api/v1/analyze`;

  try {
    console.log(`[Core -> Intelligence] Initiating REST request to: ${targetUrl} (Correlation: ${corrId})`);

    const response = await axios.post(
      targetUrl,
      {
        title,
        description,
        category,
        complaint_id: complaintId,
        existing_complaints: existingComplaints,
      },
      {
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'civic-core-service',
          'X-Correlation-ID': corrId,
        },
      }
    );

    if (response.data && response.data.success && response.data.analysis) {
      console.log(`[Core <- Intelligence] Successfully received analysis (id: ${response.data.analysis_id})`);
      const a = response.data.analysis;
      return {
        analysisId: response.data.analysis_id,
        predictedCategory: a.category,
        categoryConfidence: a.category_confidence || 0.85,
        predictedPriority: a.priority,
        priorityConfidence: a.priority_confidence || 0.80,
        spamScore: a.spam_score || 0.0,
        isSpam: Boolean(a.is_spam),
        spamFlags: a.spam_flags || [],
        sentimentScore: a.sentiment_score ?? -0.3,
        urgencyScore: a.urgency_score ?? 0.5,
        department: a.department || 'General Civic Administration',
        similarComplaints: a.similar_complaints || [],
        serviceStatus: 'completed',
        analyzedAt: new Date(),
        correlationId: corrId,
      };
    }

    throw new Error('Intelligence Service returned invalid response payload');
  } catch (error) {
    console.warn(
      `[Core -> Intelligence] Service request failed (${error.code || error.message}). Applying resilient fallback.`
    );

    const fallback = generateLocalFallbackAnalysis(title, description, category);
    return {
      analysisId: null,
      predictedCategory: fallback.category,
      categoryConfidence: fallback.categoryConfidence,
      predictedPriority: fallback.priority,
      priorityConfidence: fallback.priorityConfidence,
      spamScore: fallback.spamScore,
      isSpam: fallback.isSpam,
      spamFlags: fallback.spamFlags,
      sentimentScore: fallback.sentimentScore,
      urgencyScore: fallback.urgencyScore,
      department: fallback.department,
      similarComplaints: fallback.similarComplaints,
      serviceStatus: 'fallback',
      analyzedAt: new Date(),
      correlationId: corrId,
    };
  }
}

/**
 * Secondary Inter-Service REST call:
 * Fetches aggregate intelligence and model performance analytics from Intelligence Service.
 */
async function fetchIntelligenceAnalyticsSummary(correlationId = null) {
  const corrId = correlationId || `corr_analytics_${Date.now()}`;
  const targetUrl = `${INTELLIGENCE_SERVICE_URL.replace(/\/$/, '')}/api/v1/analytics/summary`;

  try {
    const response = await axios.get(targetUrl, {
      timeout: TIMEOUT_MS,
      headers: {
        'X-Service-Name': 'civic-core-service',
        'X-Correlation-ID': corrId,
      },
    });

    if (response.data && response.data.success && response.data.data) {
      return {
        available: true,
        metrics: response.data.data,
      };
    }
    return { available: false, metrics: null, error: 'Empty payload' };
  } catch (error) {
    console.warn(`[Core -> Intelligence] Analytics query unreachable: ${error.message}`);
    return { available: false, metrics: null, error: error.message };
  }
}

/**
 * Health check verification of the Intelligence Service
 */
async function checkIntelligenceServiceHealth() {
  const targetUrl = `${INTELLIGENCE_SERVICE_URL.replace(/\/$/, '')}/api/v1/health`;
  try {
    const response = await axios.get(targetUrl, { timeout: 2000 });
    return {
      online: response.status === 200,
      data: response.data,
    };
  } catch (error) {
    return {
      online: false,
      error: error.message,
    };
  }
}

module.exports = {
  analyzeComplaintWithIntelligenceService,
  fetchIntelligenceAnalyticsSummary,
  checkIntelligenceServiceHealth,
  generateLocalFallbackAnalysis,
  INTELLIGENCE_SERVICE_URL,
};
