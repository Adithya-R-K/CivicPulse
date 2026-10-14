"""
Civic Intelligence Microservice — Flask REST API
Service 2 of 2 in CivicPulse Microservices Architecture
Port: 5001 (configurable via PORT / INTELLIGENCE_PORT)
Exposes versioned endpoints under /api/v1 with independent SQLite persistence.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS

from db import (
    init_db,
    create_analysis_record,
    get_analysis_by_id,
    list_analyses,
    update_analysis_record,
    delete_analysis_record,
    get_analytics_summary,
    log_audit_event
)
from ai_engine_adapter import ai_adapter

# -------------------- INITIALIZATION --------------------

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] (CivicIntelligence) %(message)s'
)
logger = logging.getLogger("CIVIC_INTELLIGENCE")

# Initialize database schema on startup
init_db()
log_audit_event("SERVICE_STARTED", {"timestamp": datetime.now(timezone.utc).isoformat(), "port": os.environ.get("PORT", 5001)})

# Middleware: Request ID / Correlation ID
@app.before_request
def assign_correlation_id():
    request.correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())

# -------------------- HEALTH CHECK --------------------

@app.route("/api/v1/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint indicating model readiness and service status"""
    return jsonify({
        "status": "healthy",
        "service": "civic-intelligence-service",
        "version": "1.0.0",
        "models_ready": ai_adapter.is_loaded,
        "database": "sqlite (intelligence.db)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "correlation_id": getattr(request, "correlation_id", None)
    }), 200

# -------------------- AI PIPELINE ENDPOINTS --------------------

@app.route("/api/v1/analyze", methods=["POST"])
@app.route("/api/ai/analyze", methods=["POST"])
def analyze():
    """
    Primary Inter-Service Communication Endpoint
    Called by Civic Core Service upon complaint submission.
    Executes category classification, priority prediction, spam risk assessment,
    sentiment analysis, and similarity detection.
    Persists audit record into SQLite and returns structured JSON.
    """
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        category_hint = data.get("category")
        complaint_id = data.get("complaint_id", "")
        existing_complaints = data.get("existing_complaints", [])

        if not title and not description:
            return jsonify({
                "success": False,
                "error": "Validation failed: 'title' or 'description' is required."
            }), 400

        # Execute AI analysis
        analysis = ai_adapter.full_analysis(
            title=title,
            description=description,
            category_hint=category_hint,
            existing_complaints=existing_complaints
        )

        # Persist into independent SQLite database
        record_payload = {
            "complaint_id": complaint_id,
            "title": title,
            "description": description,
            "category": analysis["category"],
            "category_confidence": analysis["category_confidence"],
            "priority": analysis["priority"],
            "priority_confidence": analysis["priority_confidence"],
            "spam_score": analysis["spam_score"],
            "is_spam": analysis["is_spam"],
            "spam_flags": analysis["spam_flags"],
            "sentiment_score": analysis["sentiment_score"],
            "urgency_score": analysis["urgency_score"],
            "department": analysis["department"],
            "similar_count": analysis["similar_count"],
            "source_service": request.headers.get("X-Service-Name", "civic-core-service"),
            "model_version": analysis["model_version"],
            "correlation_id": request.correlation_id
        }

        saved_record = create_analysis_record(record_payload)
        analysis_id = saved_record["id"] if saved_record else None

        logger.info(f"Processed complaint analysis id={analysis_id} category={analysis['category']} priority={analysis['priority']}")

        return jsonify({
            "success": True,
            "analysis_id": analysis_id,
            "analysis": analysis,
            "stored_in_sqlite": True,
            "correlation_id": request.correlation_id
        }), 200

    except Exception as e:
        logger.error(f"Error during complaint analysis: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Internal Intelligence Service error: {str(e)}",
            "correlation_id": getattr(request, "correlation_id", None)
        }), 500

@app.route("/api/v1/classify", methods=["POST"])
def classify():
    """Predict civic category for a complaint"""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "")
    description = data.get("description", "")

    if not title and not description:
        return jsonify({"success": False, "error": "Title or description required"}), 400

    result = ai_adapter.classify_category(title, description)
    return jsonify({
        "success": True,
        **result,
        "correlation_id": request.correlation_id
    }), 200

@app.route("/api/v1/predict-priority", methods=["POST"])
def predict_priority():
    """Predict priority level (Low, Medium, High, Urgent)"""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "")
    description = data.get("description", "")
    category = data.get("category", "Roads")

    result = ai_adapter.predict_priority(title, description, category)
    return jsonify({
        "success": True,
        **result,
        "correlation_id": request.correlation_id
    }), 200

@app.route("/api/v1/detect-spam", methods=["POST"])
def detect_spam():
    """Assess spam score and flags"""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "")
    description = data.get("description", "")

    result = ai_adapter.detect_spam(title, description)
    return jsonify({
        "success": True,
        **result,
        "correlation_id": request.correlation_id
    }), 200

@app.route("/api/v1/similar-complaints", methods=["POST"])
def similar_complaints():
    """Find similar complaints based on TF-IDF cosine similarity"""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "")
    description = data.get("description", "")
    existing = data.get("existing_complaints", [])

    results = ai_adapter.detect_similar(title, description, existing)
    return jsonify({
        "success": True,
        "count": len(results),
        "similar_complaints": results,
        "correlation_id": request.correlation_id
    }), 200

# -------------------- ANALYTICS ENDPOINT --------------------

@app.route("/api/v1/analytics/summary", methods=["GET"])
@app.route("/api/analytics/ai-summary", methods=["GET"])
def analytics_summary():
    """
    Returns aggregated AI intelligence metrics from the SQLite database.
    Consumed by Civic Core Service for admin dashboard integration.
    """
    try:
        summary = get_analytics_summary()
        return jsonify({
            "success": True,
            "data": summary,
            "service": "civic-intelligence-service",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error fetching analytics summary: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# -------------------- CRUD OPERATIONS FOR ANALYSIS HISTORY --------------------

@app.route("/api/v1/history", methods=["GET"])
def get_history():
    """List analysis history records with pagination and filtering (READ)"""
    limit = min(request.args.get("limit", 20, type=int), 100)
    offset = request.args.get("offset", 0, type=int)
    category = request.args.get("category")
    is_spam_param = request.args.get("is_spam")
    is_spam = None
    if is_spam_param is not None:
        is_spam = is_spam_param.lower() in ("true", "1")

    result = list_analyses(limit=limit, offset=offset, category=category, is_spam=is_spam)
    return jsonify({"success": True, **result}), 200

@app.route("/api/v1/history/<int:record_id>", methods=["GET"])
def get_history_by_id(record_id):
    """Retrieve a single analysis record by ID (READ)"""
    record = get_analysis_by_id(record_id)
    if not record:
        return jsonify({"success": False, "message": "Analysis record not found"}), 404
    return jsonify({"success": True, "record": record}), 200

@app.route("/api/v1/history", methods=["POST"])
def create_history_record():
    """Create a manual analysis or audit record (CREATE)"""
    data = request.get_json(silent=True) or {}
    if not data.get("title") or not data.get("description"):
        return jsonify({"success": False, "error": "'title' and 'description' are required"}), 400

    analysis = ai_adapter.full_analysis(data["title"], data["description"], data.get("category"))
    record_payload = {
        **analysis,
        "title": data["title"],
        "description": data["description"],
        "complaint_id": data.get("complaint_id", ""),
        "source_service": "manual-api",
        "correlation_id": request.correlation_id
    }
    saved = create_analysis_record(record_payload)
    return jsonify({"success": True, "record": saved}), 201

@app.route("/api/v1/history/<int:record_id>", methods=["PUT", "PATCH"])
def update_history(record_id):
    """Update fields on an analysis record (UPDATE)"""
    data = request.get_json(silent=True) or {}
    updated = update_analysis_record(record_id, data)
    if not updated:
        return jsonify({"success": False, "message": "Record not found or nothing to update"}), 404
    return jsonify({"success": True, "record": updated}), 200

@app.route("/api/v1/history/<int:record_id>", methods=["DELETE"])
def delete_history(record_id):
    """Delete an analysis record from SQLite (DELETE)"""
    success = delete_analysis_record(record_id)
    if not success:
        return jsonify({"success": False, "message": "Record not found"}), 404
    return jsonify({"success": True, "message": f"Record {record_id} deleted successfully"}), 200

# -------------------- ENTRY POINT --------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("INTELLIGENCE_PORT", 5001)))
    logger.info(f"Starting Civic Intelligence Microservice on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
