"""
Civic Intelligence Service — AI Engine Adapter
Integrates AdvancedAIEngine with model persistence and robust rule-based fallbacks.
Converts all NumPy/SciPy types to standard Python primitives for JSON serialization.
"""

import os
import sys
import logging
from typing import Dict, List, Any, Optional

# Add root directory to sys.path to access ai_engine
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

LOGGER = logging.getLogger("INTELLIGENCE_ADAPTER")

# Department mapping dictionary
DEPARTMENT_MAPPING = {
    'Roads': 'Roads & Transportation',
    'Water': 'Water & Sewage',
    'Electricity': 'Electricity Department',
    'Waste': 'Waste Management',
    'Parks': 'Parks & Recreation',
    'Safety': 'Public Safety',
    'Construction': 'Building & Construction',
    'Healthcare': 'Public Health & Sanitation',
    'Education': 'Education Department',
    'Transportation': 'Traffic & Transport Commission',
    'Environment': 'Pollution Control & Environment',
    'Other': 'General Civic Administration',
}

class AIEngineAdapter:
    def __init__(self):
        self.engine = None
        self.is_loaded = False
        self._initialize_engine()

    def _initialize_engine(self):
        try:
            from ai_engine import AdvancedAIEngine
            self.engine = AdvancedAIEngine()
            self.is_loaded = True
            LOGGER.info("AdvancedAIEngine initialized successfully in Intelligence Service")
        except Exception as e:
            LOGGER.error(f"Failed to load AdvancedAIEngine, falling back to rule engine: {e}")
            self.engine = None
            self.is_loaded = False

    def classify_category(self, title: str, description: str) -> Dict[str, Any]:
        """Classify complaint into civic category"""
        title = title or ""
        description = description or ""

        if self.is_loaded and self.engine:
            try:
                res = self.engine.predict_category(title, description)
                cat = str(res.get("category", "Roads"))
                conf = float(res.get("confidence", 0.75))
                all_probs = {str(k): float(v) for k, v in res.get("all_probabilities", {}).items()}
                return {
                    "category": cat,
                    "confidence": round(conf, 3),
                    "probabilities": all_probs
                }
            except Exception as e:
                LOGGER.warning(f"Error in ML category classification: {e}")

        # Rule-based fallback
        text = f"{title} {description}".lower()
        if any(w in text for w in ['water', 'pipe', 'leak', 'drain', 'sewer']):
            return {"category": "Water", "confidence": 0.85, "probabilities": {}}
        if any(w in text for w in ['electric', 'power', 'light', 'wire', 'pole']):
            return {"category": "Electricity", "confidence": 0.85, "probabilities": {}}
        if any(w in text for w in ['garbage', 'waste', 'trash', 'dump', 'bin']):
            return {"category": "Waste", "confidence": 0.85, "probabilities": {}}
        if any(w in text for w in ['danger', 'hazard', 'fire', 'crime', 'accident']):
            return {"category": "Safety", "confidence": 0.85, "probabilities": {}}
        if any(w in text for w in ['park', 'tree', 'garden', 'swing']):
            return {"category": "Parks", "confidence": 0.80, "probabilities": {}}
        return {"category": "Roads", "confidence": 0.75, "probabilities": {}}

    def predict_priority(self, title: str, description: str, category: str) -> Dict[str, Any]:
        """Predict priority level (Low, Medium, High, Urgent)"""
        title = title or ""
        description = description or ""
        category = category or "Roads"

        if self.is_loaded and self.engine:
            try:
                prio_enum, conf = self.engine.predict_priority(title, description, category)
                val = prio_enum.value if hasattr(prio_enum, 'value') else str(prio_enum)
                # Map Critical to Urgent for CivicPulse standardization
                if val == "Critical":
                    val = "Urgent"
                return {
                    "priority": val,
                    "confidence": round(float(conf), 3)
                }
            except Exception as e:
                LOGGER.warning(f"Error in ML priority prediction: {e}")

        # Rule-based fallback
        text = f"{title} {description}".lower()
        if any(w in text for w in ['emergency', 'fire', 'burst', 'accident', 'sparking', 'danger', 'hazard']):
            return {"priority": "Urgent", "confidence": 0.95}
        if any(w in text for w in ['major', 'blocking', 'overflow', 'broken', 'heavy']):
            return {"priority": "High", "confidence": 0.80}
        if len(text) > 50:
            return {"priority": "Medium", "confidence": 0.70}
        return {"priority": "Low", "confidence": 0.65}

    def detect_spam(self, title: str, description: str) -> Dict[str, Any]:
        """Evaluate spam risk and return structured assessment"""
        title = title or ""
        description = description or ""

        if self.is_loaded and self.engine:
            try:
                spam_res = self.engine.analyze_spam_risk(title, description)
                score = float(spam_res.get("score", spam_res.get("spam_score", 0.0)))
                flags = [str(f) for f in spam_res.get("flags", [])]
                return {
                    "is_spam": score >= 0.5,
                    "spam_score": round(score, 3),
                    "spam_flags": flags
                }
            except Exception as e:
                LOGGER.warning(f"Error in ML spam detection: {e}")

        # Fallback spam check
        combined = f"{title} {description}".lower()
        score = 0.0
        flags = []
        if len(title.strip()) < 4 or len(description.strip()) < 8:
            score += 0.4
            flags.append("INSUFFICIENT_DETAIL")
        if any(w in combined for w in ["win", "free money", "crypto", "casino", "lottery", "click here"]):
            score += 0.5
            flags.append("SUSPICIOUS_KEYWORD")

        return {
            "is_spam": score >= 0.5,
            "spam_score": round(score, 2),
            "spam_flags": flags
        }

    def detect_similar(self, title: str, description: str, existing_complaints: List[Any]) -> List[Dict[str, Any]]:
        """Identify potential duplicate/similar grievances"""
        if not existing_complaints:
            return []

        if self.is_loaded and self.engine:
            try:
                formatted_list = []
                for c in existing_complaints:
                    if isinstance(c, dict):
                        formatted_list.append((
                            c.get("id") or c.get("_id", ""),
                            c.get("author", ""),
                            c.get("title", ""),
                            c.get("description", ""),
                            c.get("category", ""),
                            c.get("status", ""),
                            c.get("createdAt") or c.get("timestamp")
                        ))
                    elif isinstance(c, (list, tuple)):
                        formatted_list.append(c)

                similar = self.engine.detect_similar_complaints(title, description, formatted_list)
                return [{
                    "id": str(s.get("id", "")),
                    "title": str(s.get("title", "")),
                    "category": str(s.get("category", "")),
                    "similarity": float(s.get("similarity", 0.0)),
                    "combined_score": float(s.get("combined_score", 0.0))
                } for s in similar]
            except Exception as e:
                LOGGER.warning(f"Error in similarity search: {e}")

        return []

    def full_analysis(self, title: str, description: str, category_hint: Optional[str] = None, existing_complaints: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Execute full end-to-end intelligence analysis pipeline"""
        cat_result = self.classify_category(title, description)
        category = category_hint if category_hint and category_hint != 'Other' else cat_result["category"]

        priority_result = self.predict_priority(title, description, category)
        spam_result = self.detect_spam(title, description)
        similar_results = self.detect_similar(title, description, existing_complaints or [])

        priority = priority_result["priority"]
        sentiment_score = -0.85 if priority == "Urgent" else (-0.5 if priority == "High" else -0.2)
        urgency_score = 0.95 if priority == "Urgent" else (0.75 if priority == "High" else 0.4)
        department = DEPARTMENT_MAPPING.get(category, "General Civic Administration")

        return {
            "category": category,
            "category_confidence": cat_result["confidence"],
            "priority": priority,
            "priority_confidence": priority_result["confidence"],
            "spam_score": spam_result["spam_score"],
            "is_spam": spam_result["is_spam"],
            "spam_flags": spam_result["spam_flags"],
            "sentiment_score": sentiment_score,
            "urgency_score": urgency_score,
            "department": department,
            "similar_complaints": similar_results,
            "similar_count": len(similar_results),
            "model_version": "v1.0.0-advanced"
        }

# Global singleton
ai_adapter = AIEngineAdapter()
