import os
import re
import json
import joblib
import logging
import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer, PorterStemmer
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.sentiment import SentimentIntensityAnalyzer

# -------------------- SETUP & CONFIGURATION --------------------

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
LOGGER = logging.getLogger("AI_ENGINE_ADVANCED")

# Download required NLTK data
nltk_resources = ["stopwords", "wordnet", "punkt", "punkt_tab", "vader_lexicon"]
for resource in nltk_resources:
    try:
        nltk.download(resource, quiet=True)
    except:
        LOGGER.warning(f"Could not download {resource}")

MODEL_DIR = "models"
DATA_DIR = "data"
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

# -------------------- DATA CLASSES & ENUMS --------------------

class PriorityLevel(Enum):
    LOW = "Low"
    MEDIUM = "Medium" 
    HIGH = "High"
    CRITICAL = "Critical"

class ComplaintStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

@dataclass
class Complaint:
    id: str
    title: str
    description: str
    category: str
    priority: str
    timestamp: datetime
    location: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class PredictionResult:
    category: str
    category_confidence: float
    priority: PriorityLevel
    priority_confidence: float
    spam_score: float
    spam_flags: List[str]
    sentiment_score: float
    urgency_indicator: float
    similar_complaints: List[Dict]
    metadata: Dict[str, Any]
    
    def to_dict(self):
        return {
            "category": self.category,
            "category_confidence": self.category_confidence,
            "priority": self.priority.value,
            "priority_confidence": self.priority_confidence,
            "spam_score": self.spam_score,
            "spam_flags": self.spam_flags,
            "sentiment_score": self.sentiment_score,
            "urgency_indicator": self.urgency_indicator,
            "similar_complaints": self.similar_complaints,
            "metadata": self.metadata
        }

# -------------------- CONFIGURATION MANAGER --------------------

class ConfigManager:
    """Manages configuration for the AI Engine"""
    
    DEFAULT_CONFIG = {
        "model_params": {
            "category": {
                "max_features": 2000,
                "ngram_range": (1, 3),
                "min_df": 2,
                "max_df": 0.9,
                "alpha": 0.01
            },
            "priority": {
                "n_estimators": 300,
                "max_depth": 15,
                "learning_rate": 0.1,
                "random_state": 42,
                "class_weight": "balanced"
            }
        },
        "thresholds": {
            "similarity": 0.5,
            "spam_high": 0.7,
            "spam_medium": 0.4,
            "confidence_low": 0.3
        },
        "weights": {
            "title_weight": 1.5,
            "description_weight": 1.0,
            "category_weight": 0.8
        },
        "spam_rules": {
            "max_caps_ratio": 0.6,
            "min_words_description": 10,
            "max_similarity_threshold": 0.9,
            "blacklist_words": ["free", "win", "urgent", "click", "subscribe"]
        },
        "retraining": {
            "batch_size": 100,
            "retrain_interval_days": 7,
            "min_samples_for_retrain": 50
        }
    }
    
    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self.config = self.load_config()
    
    def load_config(self) -> Dict:
        """Load configuration from file or create default"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            LOGGER.info("Config file not found, creating default")
            self.save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG.copy()
    
    def save_config(self, config: Dict):
        """Save configuration to file"""
        config_dir = os.path.dirname(self.config_path)
        if config_dir and not os.path.exists(config_dir):
            os.makedirs(config_dir, exist_ok=True)
        with open(self.config_path, 'w') as f:
            json.dump(config, f, indent=2)
    
    def update_config(self, updates: Dict):
        """Update configuration with new values"""
        self.config.update(updates)
        self.save_config(self.config)
        LOGGER.info("Configuration updated")

# -------------------- ADVANCED AI ENGINE --------------------

class AdvancedAIEngine:
    """
    Advanced AI Engine for Civic Complaint Intelligence with enhanced features
    """
    
    def __init__(self, config: Optional[Dict] = None):
        self.config_manager = ConfigManager()
        self.config = config or self.config_manager.config
        
        # Complaint categories
        self.categories = [
            "Roads", "Water", "Electricity", "Waste",
            "Parks", "Safety", "Construction", "Healthcare",
            "Education", "Transportation", "Environment", "Other"
        ]
        
        # NLP components
        self.stop_words = set(stopwords.words("english"))
        self.lemmatizer = WordNetLemmatizer()
        self.stemmer = PorterStemmer()
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        
        # Models
        self.category_model = None
        self.priority_model = None
        self.similarity_vectorizer = None
        self.label_encoders = {}
        
        # Cache for performance
        self.similarity_cache = {}
        self.preprocessing_cache = {}
        self.cache_max_size = 1000
        
        # Statistics
        self.prediction_stats = {
            "total_predictions": 0,
            "category_distribution": {},
            "priority_distribution": {}
        }
        
        # Load or train models
        self._initialize_models()
        
        # Load historical data for context
        self.historical_data = self._load_historical_data()
        
        LOGGER.info("Advanced AI Engine initialized successfully")
    
    # -------------------- INITIALIZATION --------------------
    
    def _initialize_models(self):
        """Initialize or load ML models"""
        try:
            self._load_models()
            LOGGER.info("Models loaded from cache")
        except Exception as e:
            LOGGER.warning(f"Could not load models: {e}")
            LOGGER.info("Training new models with enhanced data")
            self._train_with_enhanced_data()
    
    def _load_historical_data(self) -> pd.DataFrame:
        """Load historical complaint data for context"""
        historical_path = os.path.join(DATA_DIR, "historical_complaints.csv")
        try:
            if os.path.exists(historical_path):
                df = pd.read_csv(historical_path)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                return df
        except Exception as e:
            LOGGER.warning(f"Could not load historical data: {e}")
        
        return pd.DataFrame()
    
    def _save_historical_data(self, complaints: List[Complaint]):
        """Save new complaints to historical data"""
        if not complaints:
            return
        
        os.makedirs(DATA_DIR, exist_ok=True)
        historical_path = os.path.join(DATA_DIR, "historical_complaints.csv")
        
        new_data = pd.DataFrame([{
            'id': c.id,
            'title': c.title,
            'description': c.description,
            'category': c.category,
            'priority': c.priority,
            'timestamp': c.timestamp,
            'location': c.location
        } for c in complaints])
        
        if os.path.exists(historical_path):
            existing_data = pd.read_csv(historical_path)
            combined_data = pd.concat([existing_data, new_data], ignore_index=True)
            combined_data = combined_data.drop_duplicates(subset=['id'])
        else:
            combined_data = new_data
        
        combined_data.to_csv(historical_path, index=False)
    
    # -------------------- ENHANCED NLP PROCESSING --------------------
    
    def preprocess_text(self, text: str, use_cache: bool = True) -> str:
        """Enhanced text preprocessing with caching"""
        if not isinstance(text, str):
            return ""
        
        # Check cache
        cache_key = hashlib.md5(text.encode()).hexdigest()[:16]
        if use_cache and cache_key in self.preprocessing_cache:
            return self.preprocessing_cache[cache_key]
        
        # Lowercase
        text = text.lower()
        
        # Remove URLs and special patterns
        text = re.sub(r'http\S+|www\S+', '[URL]', text)
        text = re.sub(r'\b\d{10,}\b', '[PHONE]', text)  # Phone numbers
        text = re.sub(r'\b\d+\.\d+\b', '[NUMBER]', text)  # Decimal numbers
        
        # Remove special characters but keep important punctuation
        text = re.sub(r'[^\w\s.!?\-]', ' ', text)
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # Process tokens
        processed_tokens = []
        for token in tokens:
            if token in ['.', '!', '?', '[URL]', '[PHONE]', '[NUMBER]']:
                processed_tokens.append(token)
                continue
            
            if len(token) <= 2 or token in self.stop_words:
                continue
            
            # Lemmatize and stem
            lemma = self.lemmatizer.lemmatize(token)
            stem = self.stemmer.stem(lemma)
            processed_tokens.append(stem)
        
        result = ' '.join(processed_tokens)
        
        # Update cache
        if use_cache:
            if len(self.preprocessing_cache) >= self.cache_max_size:
                self.preprocessing_cache.pop(next(iter(self.preprocessing_cache)))
            self.preprocessing_cache[cache_key] = result
        
        return result
    
    def extract_features(self, title: str, description: str) -> Dict[str, Any]:
        """Extract advanced features from complaint text"""
        full_text = f"{title} {description}"
        processed_text = self.preprocess_text(full_text, use_cache=False)
        
        features = {
            # Text statistics
            'title_length': len(title),
            'desc_length': len(description),
            'word_count': len(full_text.split()),
            'sentence_count': len(sent_tokenize(full_text)),
            'avg_word_length': np.mean([len(w) for w in full_text.split()]) if full_text.split() else 0,
            'caps_ratio': sum(1 for c in full_text if c.isupper()) / len(full_text) if full_text else 0,
            
            # NLP features
            'has_urgency_words': int(bool(re.search(r'\burgent|emergency|immediate|asap\b', full_text, re.I))),
            'has_location': int(bool(re.search(r'\bstreet|road|avenue|lane|block\b', full_text, re.I))),
            'question_count': full_text.count('?'),
            'exclamation_count': full_text.count('!'),
            
            # Sentiment
            'sentiment': self.sentiment_analyzer.polarity_scores(full_text)['compound'],
            
            # Readability (simplified)
            'readability_score': len(description) / max(len(title), 1)
        }
        
        return features
    
    # -------------------- ENHANCED MODEL TRAINING --------------------
    
    def _train_with_enhanced_data(self):
        """Train models with comprehensive sample data"""
        sample_data = [
            # Water-related
            ("Water pipe burst flooding street", "Major water pipe burst causing flooding on Main Street", "Water", "Critical"),
            ("Minor leak in bathroom", "Small water leak under sink in apartment 3B", "Water", "Low"),
            ("No water pressure", "Low water pressure throughout the building all day", "Water", "Medium"),
            
            # Road-related
            ("Large pothole dangerous", "Massive pothole on Oak Street causing accidents", "Roads", "High"),
            ("Road cracks need repair", "Multiple cracks developing on Highway 101", "Roads", "Medium"),
            ("Speed bump damaged", "Speed bump broken near school zone", "Roads", "Low"),
            
            # Electricity
            ("Street light outage", "All street lights out on Maple Avenue", "Electricity", "High"),
            ("Power flickering", "Lights flickering intermittently in downtown area", "Electricity", "Medium"),
            ("Broken power line", "Fallen power line sparking on Elm Street - DANGER", "Electricity", "Critical"),
            
            # Safety
            ("Suspicious activity", "Unknown persons loitering near park at night", "Safety", "Medium"),
            ("Traffic accident", "Car accident at intersection, injuries reported", "Safety", "Critical"),
            ("Broken sidewalk", "Uneven sidewalk causing tripping hazard", "Safety", "Medium"),
            
            # Waste
            ("Garbage overflow", "Trash cans overflowing for 3 days", "Waste", "Medium"),
            ("Illegal dumping", "Construction waste dumped in vacant lot", "Waste", "High"),
            ("Recycling not collected", "Recycling bins missed this week", "Waste", "Low"),
            
            # Parks
            ("Broken playground equipment", "Swing set broken in city park", "Parks", "Medium"),
            ("Overgrown grass", "Grass needs cutting in Memorial Park", "Parks", "Low"),
            ("Vandalism in park", "Graffiti on park benches and tables", "Parks", "Medium"),
            
            # Additional categories
            ("Hospital wait times", "Emergency room wait times exceeding 8 hours", "Healthcare", "High"),
            ("School building repair", "Leaking roof in elementary school classrooms", "Education", "Medium"),
            ("Bus schedule issues", "Buses consistently 15+ minutes late", "Transportation", "Medium"),
            ("Air pollution concern", "Strong chemical smell near industrial area", "Environment", "High"),
        ]
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(sample_data, columns=['title', 'description', 'category', 'priority'])
        
        # Prepare texts with weighting
        texts = []
        for _, row in df.iterrows():
            weighted_text = (
                f"{row['title']} {row['title']} "  # Title weighted twice
                f"{row['description']} "
                f"{row['category']}"
            )
            texts.append(self.preprocess_text(weighted_text))
        
        # Train models
        self._train_models(df, texts)
        
        # Initialize similarity vectorizer
        self.similarity_vectorizer = TfidfVectorizer(
            max_features=self.config['model_params']['category']['max_features'],
            ngram_range=self.config['model_params']['category']['ngram_range']
        ).fit(texts)
        
        # Save models
        self._save_models()
        
        LOGGER.info("Enhanced models trained and saved")
    
    def _train_models(self, df: pd.DataFrame, texts: List[str]):
        """Train category and priority models with advanced techniques"""
        
        # Train category model
        self.category_model = Pipeline([
            ("tfidf", TfidfVectorizer(
                max_features=self.config['model_params']['category']['max_features'],
                ngram_range=self.config['model_params']['category']['ngram_range'],
                min_df=self.config['model_params']['category']['min_df'],
                max_df=self.config['model_params']['category']['max_df']
            )),
            ("clf", MultinomialNB(alpha=self.config['model_params']['category']['alpha']))
        ]).fit(texts, df['category'].values)
        
        # Train priority model with additional features
        X_priority = texts
        y_priority = df['priority'].values
        
        # Encode priority labels
        self.label_encoders['priority'] = LabelEncoder()
        y_priority_encoded = self.label_encoders['priority'].fit_transform(y_priority)
        
        self.priority_model = Pipeline([
            ("tfidf", TfidfVectorizer(
                max_features=self.config['model_params']['category']['max_features'],
                ngram_range=self.config['model_params']['category']['ngram_range']
            )),
            ("clf", GradientBoostingClassifier(
                n_estimators=self.config['model_params']['priority']['n_estimators'],
                max_depth=self.config['model_params']['priority']['max_depth'],
                learning_rate=self.config['model_params']['priority']['learning_rate'],
                random_state=self.config['model_params']['priority']['random_state']
            ))
        ]).fit(X_priority, y_priority_encoded)
    
    def _load_models(self):
        """Load trained models from disk"""
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        model_files = {
            'category': f"{MODEL_DIR}/category_model.pkl",
            'priority': f"{MODEL_DIR}/priority_model.pkl",
            'similarity': f"{MODEL_DIR}/similarity_vectorizer.pkl",
            'encoders': f"{MODEL_DIR}/label_encoders.pkl"
        }
        
        # Check if all model files exist
        for file_path in model_files.values():
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Model file not found: {file_path}")
        
        self.category_model = joblib.load(model_files['category'])
        self.priority_model = joblib.load(model_files['priority'])
        self.similarity_vectorizer = joblib.load(model_files['similarity'])
        self.label_encoders = joblib.load(model_files['encoders'])
    
    def _save_models(self):
        """Save trained models to disk"""
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        joblib.dump(self.category_model, f"{MODEL_DIR}/category_model.pkl")
        joblib.dump(self.priority_model, f"{MODEL_DIR}/priority_model.pkl")
        joblib.dump(self.similarity_vectorizer, f"{MODEL_DIR}/similarity_vectorizer.pkl")
        joblib.dump(self.label_encoders, f"{MODEL_DIR}/label_encoders.pkl")
    
    # -------------------- ADVANCED PREDICTIONS --------------------
    
    def predict_category(self, title: str, description: str) -> Dict[str, Any]:
        """Predict complaint category with enhanced features"""
        # Create weighted text
        weighted_text = (
            f"{title} {title} " +  # Title appears twice for weighting
            f"{description}"
        )
        text = self.preprocess_text(weighted_text)
        
        if not text.strip():
            return {"category": "Other", "confidence": 0.3, "all_probabilities": {}}
        
        # Get probabilities
        try:
            probs = self.category_model.predict_proba([text])[0]
            idx = np.argmax(probs)
            confidence = float(probs[idx])
            
            # Get all probabilities
            all_probs = {
                self.category_model.classes_[i]: float(probs[i])
                for i in range(len(probs))
            }
            
            # Apply confidence threshold
            if confidence < self.config['thresholds']['confidence_low']:
                predicted_category = "Other"
                confidence = max(confidence, 0.4)  # Ensure minimum confidence
            else:
                predicted_category = self.category_model.classes_[idx]
            
            return {
                "category": predicted_category,
                "confidence": round(confidence, 3),
                "all_probabilities": all_probs
            }
            
        except Exception as e:
            LOGGER.error(f"Category prediction error: {e}")
            return {"category": "Other", "confidence": 0.3, "all_probabilities": {}}
    
    def predict_priority(self, title: str, description: str, category: str) -> Tuple[PriorityLevel, float]:
        """Predict complaint priority with rule-based enhancements"""
        # Combine text with category
        combined_text = f"{title} {description} {category}"
        text = self.preprocess_text(combined_text)
        
        if not text.strip():
            return PriorityLevel.LOW, 0.3
        
        try:
            # ML prediction
            if hasattr(self.priority_model, 'predict_proba'):
                proba = self.priority_model.predict_proba([text])[0]
                pred_idx = np.argmax(proba)
                ml_confidence = float(proba[pred_idx])
                
                # Decode prediction
                if 'priority' in self.label_encoders:
                    ml_pred = self.label_encoders['priority'].inverse_transform([pred_idx])[0]
                else:
                    ml_pred = self.priority_model.predict([text])[0]
            else:
                pred_idx = self.priority_model.predict([text])[0]
                ml_pred = self.label_encoders['priority'].inverse_transform([pred_idx])[0]
                ml_confidence = 0.7  # Default confidence
        except Exception as e:
            LOGGER.error(f"Priority model prediction error: {e}")
            ml_pred = "Medium"
            ml_confidence = 0.5
        
        # Rule-based adjustments
        base_priority = PriorityLevel(ml_pred)
        final_priority = base_priority
        rule_confidence_boost = 0.0
        
        # Check for emergency keywords
        emergency_keywords = ['emergency', 'accident', 'injured', 'fire', 'flood', 'danger', 'hazard', 'urgent']
        if any(keyword in text.lower() for keyword in emergency_keywords):
            if final_priority.value in ["Low", "Medium"]:
                final_priority = PriorityLevel.HIGH
                rule_confidence_boost = 0.2
        
        # Category-specific rules
        category_rules = {
            "Safety": PriorityLevel.HIGH,
            "Water": PriorityLevel.HIGH if any(w in text for w in ['burst', 'flood', 'leak']) else PriorityLevel.MEDIUM,
            "Electricity": PriorityLevel.HIGH if any(w in text for w in ['spark', 'outage', 'down']) else PriorityLevel.MEDIUM
        }
        
        if category in category_rules:
            if isinstance(category_rules[category], PriorityLevel):
                final_priority = category_rules[category]
                rule_confidence_boost = max(rule_confidence_boost, 0.15)
        
        # Sentiment-based adjustment
        sentiment = self.sentiment_analyzer.polarity_scores(f"{title} {description}")['compound']
        if sentiment < -0.5:  # Very negative sentiment
            if final_priority.value in ["Low", "Medium"]:
                final_priority = PriorityLevel(
                    self._increase_priority(final_priority.value)
                )
        
        # Calculate final confidence
        final_confidence = min(ml_confidence + rule_confidence_boost, 0.95)
        
        return final_priority, round(final_confidence, 3)
    
    def _increase_priority(self, current_priority: str) -> str:
        """Increase priority level by one step"""
        priority_order = ["Low", "Medium", "High", "Critical"]
        current_idx = priority_order.index(current_priority)
        if current_idx < len(priority_order) - 1:
            return priority_order[current_idx + 1]
        return current_priority
    
    # -------------------- ADVANCED SIMILARITY DETECTION --------------------
    
    def detect_similar_complaints(
        self,
        title: str,
        description: str,
        existing_complaints: List[Tuple],
        threshold: Optional[float] = None,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """Find similar complaints with advanced filtering"""
        if not existing_complaints:
            return []
        
        threshold = threshold or self.config['thresholds']['similarity']
        new_text = f"{title} {description}"
        processed_new = self.preprocess_text(new_text)
        
        # Prepare existing complaints
        existing_data = []
        existing_ids = []
        
        for complaint in existing_complaints:
            if len(complaint) >= 4:
                comp_text = f"{complaint[2]} {complaint[3]}"  # title + description
                existing_data.append(self.preprocess_text(comp_text))
                existing_ids.append({
                    "id": complaint[0],
                    "title": complaint[2],
                    "description": complaint[3] if len(complaint) > 3 else "",
                    "category": complaint[4] if len(complaint) > 4 else "Unknown",
                    "status": complaint[5] if len(complaint) > 5 else "unknown",
                    "timestamp": complaint[6] if len(complaint) > 6 else None
                })
        
        # Calculate similarity
        try:
            all_texts = existing_data + [processed_new]
            tfidf_matrix = self.similarity_vectorizer.transform(all_texts)
            
            # Calculate cosine similarity
            new_vector = tfidf_matrix[-1:]
            existing_vectors = tfidf_matrix[:-1]
            
            similarities = cosine_similarity(new_vector, existing_vectors)[0]
            
            # Collect results
            results = []
            for i, similarity in enumerate(similarities):
                if similarity >= threshold:
                    result = {
                        "id": existing_ids[i]["id"],
                        "title": existing_ids[i]["title"],
                        "category": existing_ids[i]["category"],
                        "status": existing_ids[i]["status"],
                        "similarity": round(float(similarity), 3),
                        "recency_weight": self._calculate_recency_weight(existing_ids[i].get("timestamp")),
                        "combined_score": round(
                            similarity * self._calculate_recency_weight(existing_ids[i].get("timestamp")),
                            3
                        )
                    }
                    results.append(result)
            
            # Sort by combined score and limit results
            results.sort(key=lambda x: x["combined_score"], reverse=True)
            return results[:max_results]
            
        except Exception as e:
            LOGGER.error(f"Similarity detection error: {e}")
            return []
    
    def _calculate_recency_weight(self, timestamp) -> float:
        """Calculate weight based on complaint recency"""
        if not timestamp:
            return 0.7
        
        try:
            if isinstance(timestamp, str):
                complaint_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                complaint_time = timestamp
            
            days_old = (datetime.now() - complaint_time).days
            
            # Recent complaints get higher weight
            if days_old < 7:
                return 1.0
            elif days_old < 30:
                return 0.8
            elif days_old < 90:
                return 0.6
            else:
                return 0.4
        except:
            return 0.7
    
    # -------------------- ADVANCED SPAM DETECTION --------------------
    
    def analyze_spam_risk(self, title: str, description: str) -> Dict[str, Any]:
        """Analyze complaint for spam risk with multiple factors"""
        full_text = f"{title} {description}".lower()
        processed_text = self.preprocess_text(full_text, use_cache=False)
        
        score = 0.0
        flags = []
        details = {}
        
        # 1. Caps ratio check
        caps_ratio = sum(1 for c in title if c.isupper()) / len(title) if title else 0
        if caps_ratio > self.config['spam_rules']['max_caps_ratio']:
            score += 0.3
            flags.append("EXCESSIVE_CAPS")
            details['caps_ratio'] = round(caps_ratio, 2)
        
        # 2. Text length check
        word_count = len(description.split())
        if word_count < self.config['spam_rules']['min_words_description']:
            score += 0.2
            flags.append("INSUFFICIENT_DETAIL")
            details['word_count'] = word_count
        
        # 3. URL/Link detection
        url_pattern = r'(http|https|www\.|\.com|\.net|\.org)'
        if re.search(url_pattern, full_text):
            score += 0.4
            flags.append("CONTAINS_LINKS")
        
        # 4. Blacklist words
        blacklist_words = self.config['spam_rules']['blacklist_words']
        found_blacklist = [word for word in blacklist_words if word in full_text]
        if found_blacklist:
            score += 0.25
            flags.append("SUSPICIOUS_KEYWORDS")
            details['blacklist_words_found'] = found_blacklist
        
        # 5. Repetition detection
        words = processed_text.split()
        if len(words) > 10:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.3:  # High repetition
                score += 0.3
                flags.append("HIGH_REPETITION")
                details['unique_word_ratio'] = round(unique_ratio, 2)
        
        # 6. Gibberish detection (simplified)
        vowel_ratio = sum(1 for c in description.lower() if c in 'aeiou') / len(description) if description else 0
        if 0 < vowel_ratio < 0.1:  # Very low vowel ratio might indicate gibberish
            score += 0.2
            flags.append("LOW_VOWEL_RATIO")
            details['vowel_ratio'] = round(vowel_ratio, 2)
        
        # Cap score at 1.0
        final_score = min(score, 1.0)
        
        # Determine risk level
        if final_score >= self.config['thresholds']['spam_high']:
            risk_level = "HIGH"
        elif final_score >= self.config['thresholds']['spam_medium']:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        return {
            "spam_score": round(final_score, 3),
            "risk_level": risk_level,
            "flags": flags,
            "details": details,
            "requires_review": risk_level in ["HIGH", "MEDIUM"]
        }
    
    # -------------------- SENTIMENT ANALYSIS --------------------
    
    def analyze_sentiment(self, title: str, description: str) -> Dict[str, Any]:
        """Perform sentiment analysis on complaint text"""
        full_text = f"{title} {description}"
        
        # Get VADER sentiment scores
        vader_scores = self.sentiment_analyzer.polarity_scores(full_text)
        
        # Additional sentiment indicators
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'angry', 'frustrated']
        positive_words = ['good', 'great', 'excellent', 'thank', 'appreciate', 'happy']
        
        negative_count = sum(1 for word in negative_words if word in full_text.lower())
        positive_count = sum(1 for word in positive_words if word in full_text.lower())
        
        # Calculate custom sentiment score
        word_bias = (negative_count - positive_count) / 10  # Normalize
        custom_score = vader_scores['compound'] + word_bias
        custom_score = max(-1.0, min(1.0, custom_score))  # Clamp to [-1, 1]
        
        # Determine sentiment label
        if custom_score >= 0.05:
            sentiment_label = "POSITIVE"
        elif custom_score <= -0.05:
            sentiment_label = "NEGATIVE"
        else:
            sentiment_label = "NEUTRAL"
        
        return {
            "vader_scores": vader_scores,
            "custom_score": round(custom_score, 3),
            "sentiment_label": sentiment_label,
            "negative_word_count": negative_count,
            "positive_word_count": positive_count,
            "emotion_intensity": abs(custom_score)
        }
    
    # -------------------- URGENCY CALCULATION --------------------
    
    def calculate_urgency(self, title: str, description: str, category: str, priority: str) -> float:
        """Calculate urgency score combining multiple factors"""
        urgency_score = 0.0
        
        # Base urgency from priority
        priority_weights = {
            "Low": 0.2,
            "Medium": 0.5,
            "High": 0.8,
            "Critical": 1.0
        }
        urgency_score += priority_weights.get(priority, 0.5)
        
        # Sentiment contribution
        sentiment = self.analyze_sentiment(title, description)
        urgency_score += abs(sentiment['custom_score']) * 0.2
        
        # Time-sensitive keywords
        time_keywords = ['now', 'today', 'immediate', 'asap', 'urgent', 'emergency']
        if any(keyword in f"{title} {description}".lower() for keyword in time_keywords):
            urgency_score += 0.3
        
        # Category-based urgency
        urgent_categories = ["Safety", "Water", "Electricity"]
        if category in urgent_categories:
            urgency_score += 0.2
        
        # Cap at 1.0
        return min(urgency_score, 1.0)
    
    # -------------------- MASTER ANALYSIS PIPELINE --------------------
    
    def analyze_complaint(
        self,
        title: str,
        description: str,
        location: Optional[str] = None,
        user_id: Optional[str] = None,
        existing_complaints: Optional[List[Tuple]] = None,
        include_metadata: bool = True
    ) -> PredictionResult:
        """
        Complete analysis of a complaint
        
        Args:
            title: Complaint title
            description: Complaint description
            location: Optional location
            user_id: Optional user identifier
            existing_complaints: List of existing complaints for similarity check
            include_metadata: Whether to include additional metadata in result
        
        Returns:
            PredictionResult object with all analysis results
        """
        LOGGER.info(f"Analyzing complaint: {title[:50]}...")
        
        # Update statistics
        self.prediction_stats['total_predictions'] += 1
        
        # 1. Category prediction
        category_result = self.predict_category(title, description)
        
        # 2. Priority prediction
        priority, priority_confidence = self.predict_priority(
            title, description, category_result['category']
        )
        
        # 3. Spam analysis
        spam_result = self.analyze_spam_risk(title, description)
        
        # 4. Sentiment analysis
        sentiment_result = self.analyze_sentiment(title, description)
        
        # 5. Similar complaints
        similar_complaints = []
        if existing_complaints:
            similar_complaints = self.detect_similar_complaints(
                title, description, existing_complaints
            )
        
        # 6. Urgency calculation
        urgency = self.calculate_urgency(
            title, description,
            category_result['category'],
            priority.value
        )
        
        # 7. Extract features
        features = self.extract_features(title, description)
        
        # 8. Update statistics
        self._update_statistics(category_result['category'], priority.value)
        
        # 9. Prepare metadata
        metadata = {}
        if include_metadata:
            metadata = {
                "features": features,
                "processing_timestamp": datetime.now().isoformat(),
                "text_length": len(description),
                "word_count": len(description.split()),
                "has_location": bool(location),
                "user_provided": bool(user_id),
                "similar_complaints_count": len(similar_complaints),
                "category_probabilities": category_result.get('all_probabilities', {})
            }
        
        # Create result object
        result = PredictionResult(
            category=category_result['category'],
            category_confidence=category_result['confidence'],
            priority=priority,
            priority_confidence=priority_confidence,
            spam_score=spam_result['spam_score'],
            spam_flags=spam_result['flags'],
            sentiment_score=sentiment_result['custom_score'],
            urgency_indicator=round(urgency, 3),
            similar_complaints=similar_complaints,
            metadata=metadata
        )
        
        LOGGER.info(f"Analysis complete: {category_result['category']} - {priority.value}")
        
        return result
    
    def _update_statistics(self, category: str, priority: str):
        """Update prediction statistics"""
        # Update category distribution
        if category in self.prediction_stats['category_distribution']:
            self.prediction_stats['category_distribution'][category] += 1
        else:
            self.prediction_stats['category_distribution'][category] = 1
        
        # Update priority distribution
        if priority in self.prediction_stats['priority_distribution']:
            self.prediction_stats['priority_distribution'][priority] += 1
        else:
            self.prediction_stats['priority_distribution'][priority] = 1
    
    # -------------------- MODEL MANAGEMENT --------------------
    
    def retrain_models(self, new_data: List[Tuple]):
        """
        Retrain models with new data
        
        Args:
            new_data: List of tuples (title, description, category, priority)
        """
        if len(new_data) < self.config['retraining']['min_samples_for_retrain']:
            LOGGER.warning(f"Not enough data for retraining. Need {self.config['retraining']['min_samples_for_retrain']}, got {len(new_data)}")
            return
        
        LOGGER.info(f"Retraining models with {len(new_data)} new samples")
        
        try:
            # Convert new data to DataFrame
            df_new = pd.DataFrame(new_data, columns=['title', 'description', 'category', 'priority'])
            
            # Load existing historical data
            df_existing = self.historical_data
            
            # Combine data
            if not df_existing.empty:
                df_combined = pd.concat([df_existing, df_new], ignore_index=True)
            else:
                df_combined = df_new
            
            # Prepare texts
            texts = []
            for _, row in df_combined.iterrows():
                weighted_text = f"{row['title']} {row['title']} {row['description']} {row['category']}"
                texts.append(self.preprocess_text(weighted_text))
            
            # Retrain models
            self._train_models(df_combined, texts)
            
            # Update similarity vectorizer
            self.similarity_vectorizer = TfidfVectorizer(
                max_features=self.config['model_params']['category']['max_features'],
                ngram_range=self.config['model_params']['category']['ngram_range']
            ).fit(texts)
            
            # Save updated models
            self._save_models()
            
            # Update historical data
            self.historical_data = df_combined
            self._save_historical_data([])  # Save the combined dataframe
            
            LOGGER.info("Models retrained successfully")
            
        except Exception as e:
            LOGGER.error(f"Error retraining models: {e}")
            raise
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get engine statistics"""
        return {
            "predictions": self.prediction_stats,
            "cache_size": len(self.preprocessing_cache),
            "similarity_cache_size": len(self.similarity_cache),
            "models_loaded": all([
                self.category_model is not None,
                self.priority_model is not None,
                self.similarity_vectorizer is not None
            ]),
            "historical_data_size": len(self.historical_data) if not self.historical_data.empty else 0,
            "categories_supported": len(self.categories),
            "config": {
                "similarity_threshold": self.config['thresholds']['similarity'],
                "spam_thresholds": {
                    "high": self.config['thresholds']['spam_high'],
                    "medium": self.config['thresholds']['spam_medium']
                }
            }
        }
    
    def clear_cache(self):
        """Clear all caches"""
        self.preprocessing_cache.clear()
        self.similarity_cache.clear()
        LOGGER.info("Caches cleared")

# -------------------- USAGE EXAMPLE --------------------

def example_usage():
    """Example of how to use the AdvancedAIEngine"""
    
    # Initialize engine
    engine = AdvancedAIEngine()
    
    # Example complaint
    title = "Major water leak flooding Main Street"
    description = "There's a major water pipe burst on Main Street near the intersection with Oak. Water is flooding the road and nearby properties. Cars cannot pass through. This is an emergency situation that needs immediate attention."
    location = "Main Street and Oak Avenue"
    
    # Existing complaints (simulated)
    existing = [
        ("comp1", "user123", "Water leak on Maple", "Small leak on Maple Street", "Water", "pending", "2024-01-15T10:30:00"),
        ("comp2", "user456", "Pothole on Highway", "Large pothole causing accidents", "Roads", "in_progress", "2024-01-14T14:20:00"),
        ("comp3", "user789", "Power outage downtown", "All lights out in downtown area", "Electricity", "resolved", "2024-01-10T18:45:00"),
    ]
    
    # Analyze complaint
    result = engine.analyze_complaint(
        title=title,
        description=description,
        location=location,
        existing_complaints=existing
    )
    
    # Display results
    print("\n" + "="*50)
    print("COMPLAINT ANALYSIS RESULTS")
    print("="*50)
    
    print(f"\nComplaint: {title}")
    print(f"Category: {result.category} (confidence: {result.category_confidence})")
    print(f"Priority: {result.priority.value} (confidence: {result.priority_confidence})")
    print(f"Spam Score: {result.spam_score}")
    if result.spam_flags:
        print(f"Spam Flags: {', '.join(result.spam_flags)}")
    print(f"Sentiment: {result.sentiment_score:.3f}")
    print(f"Urgency Indicator: {result.urgency_indicator:.3f}")
    
    if result.similar_complaints:
        print(f"\nSimilar Complaints Found: {len(result.similar_complaints)}")
        for i, similar in enumerate(result.similar_complaints[:3], 1):
            print(f"  {i}. {similar['title']} (similarity: {similar['similarity']})")
    
    # Get statistics
    stats = engine.get_statistics()
    print(f"\nEngine Statistics:")
    print(f"  Total Predictions: {stats['predictions']['total_predictions']}")
    print(f"  Cache Size: {stats['cache_size']}")
    print(f"  Categories Supported: {stats['categories_supported']}")
    
    return result

if __name__ == "__main__":
    # Run example
    example_usage()