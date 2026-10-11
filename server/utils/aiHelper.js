// Intelligent AI Classifier & Groq Integration for CivicPulse

const CATEGORY_KEYWORDS = {
  Roads: ['road', 'pothole', 'street', 'traffic', 'divider', 'asphalt', 'highway', 'speed breaker', 'tar', 'lane'],
  Water: ['water', 'pipe', 'leak', 'drainage', 'sewer', 'pipeline', 'overflow', 'tap', 'supply', 'contamination', 'flood'],
  Electricity: ['electric', 'power', 'light', 'wire', 'cable', 'transformer', 'pole', 'street light', 'blackout', 'short circuit', 'voltage'],
  Waste: ['garbage', 'waste', 'trash', 'dump', 'bin', 'debris', 'smell', 'plastic', 'stench', 'refuse'],
  Parks: ['park', 'tree', 'garden', 'playground', 'bench', 'grass', 'swing', 'plants'],
  Safety: ['hazard', 'danger', 'accident', 'fire', 'crime', 'stray', 'cattle', 'unsafe', 'scaffolding', 'emergency', 'collapse'],
  Construction: ['construction', 'building', 'demolition', 'cement', 'scaffold', 'illegal building', 'noise', 'dust']
};

const URGENT_KEYWORDS = [
  'danger', 'burst', 'fire', 'emergency', 'death', 'injury', 'shock', 'accident',
  'flood', 'severe', 'immediate', 'sparking', 'exposed wire', 'collapse'
];

const HIGH_KEYWORDS = [
  'heavy', 'overflow', 'broken', 'major', 'blocking', 'risk', 'serious', 'urgent'
];

const SPAM_PATTERNS = [
  /https?:\/\//i,
  /(buy|discount|free money|crypto|casino|win|lottery|viagra)/i,
  /(.)\1{5,}/, // repeated characters like 'aaaaaaa'
];

/**
 * Predict complaint category and confidence
 */
function predictCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matchCount = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchCount++;
      }
    }
    scores[category] = matchCount;
  }

  let bestCategory = 'Roads';
  let maxScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  const confidence = maxScore > 0 ? Math.min(0.95, 0.6 + maxScore * 0.1) : 0.55;

  return {
    category: bestCategory,
    confidence: Number(confidence.toFixed(2)),
  };
}

/**
 * Predict priority level
 */
function predictPriority(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  for (const kw of URGENT_KEYWORDS) {
    if (text.includes(kw)) {
      return { priority: 'Urgent', confidence: 0.95 };
    }
  }

  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) {
      return { priority: 'High', confidence: 0.85 };
    }
  }

  if (text.length > 50) {
    return { priority: 'Medium', confidence: 0.75 };
  }

  return { priority: 'Low', confidence: 0.7 };
}

/**
 * Spam assessment
 */
function detectSpam(title, description) {
  const combined = `${title} ${description}`;
  let spamScore = 0.0;

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(combined)) {
      spamScore += 0.4;
    }
  }

  if (title.trim().length < 3 || description.trim().length < 5) {
    spamScore += 0.5;
  }

  return {
    isSpam: spamScore >= 0.5,
    spamScore: Math.min(1.0, spamScore),
  };
}

/**
 * Map category to responsible government department
 */
function getDepartmentForCategory(category) {
  const mapping = {
    Roads: 'Roads & Transportation',
    Water: 'Water & Sewage',
    Electricity: 'Electricity Department',
    Waste: 'Waste Management',
    Parks: 'Parks & Recreation',
    Safety: 'Public Safety',
    Construction: 'Building & Construction',
    Other: 'General Civic Administration',
  };
  return mapping[category] || 'General Civic Administration';
}

/**
 * Full AI Analysis Pipeline
 */
function analyzeComplaint(title, description) {
  const categoryResult = predictCategory(title, description);
  const priorityResult = predictPriority(title, description);
  const spamResult = detectSpam(title, description);

  return {
    category: categoryResult.category,
    confidence: categoryResult.confidence,
    priority: priorityResult.priority,
    spamScore: spamResult.spamScore,
    department: getDepartmentForCategory(categoryResult.category),
    sentimentScore: priorityResult.priority === 'Urgent' ? -0.8 : -0.3,
    urgencyScore: priorityResult.priority === 'Urgent' ? 0.95 : (priorityResult.priority === 'High' ? 0.75 : 0.4),
  };
}

module.exports = {
  analyzeComplaint,
  predictCategory,
  predictPriority,
  detectSpam,
  getDepartmentForCategory,
};
