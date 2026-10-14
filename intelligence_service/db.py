"""
Civic Intelligence Service — SQLite Database Manager
Owns independent data store: intelligence.db
Implements CRUD operations for intelligence records and audit logs.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any

DB_PATH = os.environ.get("INTELLIGENCE_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "intelligence.db"))

def get_connection():
    """Create a thread-safe connection with dictionary cursor support and WAL mode"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    """Initialize SQLite schema for intelligence service"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                complaint_id TEXT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                category_confidence REAL NOT NULL,
                priority TEXT NOT NULL,
                priority_confidence REAL NOT NULL,
                spam_score REAL NOT NULL,
                is_spam INTEGER NOT NULL DEFAULT 0,
                spam_flags TEXT,
                sentiment_score REAL NOT NULL,
                urgency_score REAL NOT NULL,
                department TEXT NOT NULL,
                similar_count INTEGER DEFAULT 0,
                source_service TEXT DEFAULT 'civic-core-service',
                model_version TEXT DEFAULT 'v1.0.0',
                correlation_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                service TEXT DEFAULT 'civic-intelligence-service',
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Indexes for fast analytics queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_category ON analysis_history(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_priority ON analysis_history(priority);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_created ON analysis_history(created_at);")
        conn.commit()

# ==================== CRUD OPERATIONS ====================

def create_analysis_record(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new analysis record in SQLite (CREATE)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        spam_flags_json = json.dumps(data.get("spam_flags", []))
        
        cursor.execute("""
            INSERT INTO analysis_history (
                complaint_id, title, description, category, category_confidence,
                priority, priority_confidence, spam_score, is_spam, spam_flags,
                sentiment_score, urgency_score, department, similar_count,
                source_service, model_version, correlation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(data.get("complaint_id", "")),
            str(data.get("title", "")),
            str(data.get("description", "")),
            str(data.get("category", "Roads")),
            float(data.get("category_confidence", 0.8)),
            str(data.get("priority", "Medium")),
            float(data.get("priority_confidence", 0.75)),
            float(data.get("spam_score", 0.0)),
            1 if data.get("is_spam") else 0,
            spam_flags_json,
            float(data.get("sentiment_score", -0.3)),
            float(data.get("urgency_score", 0.5)),
            str(data.get("department", "General Civic Administration")),
            int(data.get("similar_count", 0)),
            str(data.get("source_service", "civic-core-service")),
            str(data.get("model_version", "v1.0.0")),
            str(data.get("correlation_id", ""))
        ))
        conn.commit()
        record_id = cursor.lastrowid
        return get_analysis_by_id(record_id)

def get_analysis_by_id(record_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve an analysis record by ID (READ)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_history WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        if not row:
            return None
        res = dict(row)
        try:
            res["spam_flags"] = json.loads(res["spam_flags"]) if res.get("spam_flags") else []
        except:
            res["spam_flags"] = []
        res["is_spam"] = bool(res["is_spam"])
        return res

def list_analyses(limit: int = 50, offset: int = 0, category: Optional[str] = None, is_spam: Optional[bool] = None) -> Dict[str, Any]:
    """List analysis records with optional filtering and pagination (READ)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM analysis_history WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if is_spam is not None:
            query += " AND is_spam = ?"
            params.append(1 if is_spam else 0)

        # Count total
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        records = []
        for r in rows:
            item = dict(r)
            try:
                item["spam_flags"] = json.loads(item["spam_flags"]) if item.get("spam_flags") else []
            except:
                item["spam_flags"] = []
            item["is_spam"] = bool(item["is_spam"])
            records.append(item)

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "records": records
        }

def update_analysis_record(record_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update fields of an analysis record (UPDATE)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        allowed_fields = ["category", "priority", "department", "is_spam", "complaint_id"]
        set_clauses = []
        params = []

        for field in allowed_fields:
            if field in updates:
                set_clauses.append(f"{field} = ?")
                if field == "is_spam":
                    params.append(1 if updates[field] else 0)
                else:
                    params.append(updates[field])

        if not set_clauses:
            return get_analysis_by_id(record_id)

        params.append(record_id)
        query = f"UPDATE analysis_history SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()

        if cursor.rowcount == 0:
            return None
        return get_analysis_by_id(record_id)

def delete_analysis_record(record_id: int) -> bool:
    """Delete an analysis record (DELETE)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM analysis_history WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0

def get_analytics_summary() -> Dict[str, Any]:
    """Generate aggregate statistics across all recorded intelligence predictions"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM analysis_history")
        total_analyses = cursor.fetchone()[0]

        if total_analyses == 0:
            return {
                "total_analyses": 0,
                "category_distribution": {},
                "priority_distribution": {},
                "spam_statistics": {"total_spam": 0, "clean_count": 0, "spam_rate_percentage": 0.0},
                "average_metrics": {
                    "avg_category_confidence": 0.0,
                    "avg_priority_confidence": 0.0,
                    "avg_sentiment_score": 0.0,
                    "avg_urgency_score": 0.0
                },
                "recent_analyses": []
            }

        # Category breakdown
        cursor.execute("SELECT category, COUNT(*) as count FROM analysis_history GROUP BY category ORDER BY count DESC")
        cat_dist = {row["category"]: row["count"] for row in cursor.fetchall()}

        # Priority breakdown
        cursor.execute("SELECT priority, COUNT(*) as count FROM analysis_history GROUP BY priority ORDER BY count DESC")
        priority_dist = {row["priority"]: row["count"] for row in cursor.fetchall()}

        # Spam statistics
        cursor.execute("SELECT SUM(is_spam) as spam_count, AVG(spam_score) as avg_spam_score FROM analysis_history")
        spam_row = cursor.fetchone()
        spam_count = spam_row["spam_count"] or 0
        avg_spam_score = spam_row["avg_spam_score"] or 0.0

        # Average metrics
        cursor.execute("""
            SELECT 
                AVG(category_confidence) as avg_cat_conf,
                AVG(priority_confidence) as avg_prio_conf,
                AVG(sentiment_score) as avg_sent,
                AVG(urgency_score) as avg_urg
            FROM analysis_history
        """)
        avg_row = cursor.fetchone()

        # Recent 5 items
        cursor.execute("SELECT id, title, category, priority, is_spam, created_at FROM analysis_history ORDER BY created_at DESC LIMIT 5")
        recent = [dict(r) for r in cursor.fetchall()]

        return {
            "total_analyses": total_analyses,
            "category_distribution": cat_dist,
            "priority_distribution": priority_dist,
            "spam_statistics": {
                "total_spam": spam_count,
                "clean_count": total_analyses - spam_count,
                "spam_rate_percentage": round((spam_count / total_analyses) * 100, 2)
            },
            "average_metrics": {
                "avg_category_confidence": round(avg_row["avg_cat_conf"] or 0.0, 3),
                "avg_priority_confidence": round(avg_row["avg_prio_conf"] or 0.0, 3),
                "avg_sentiment_score": round(avg_row["avg_sent"] or 0.0, 3),
                "avg_urgency_score": round(avg_row["avg_urg"] or 0.0, 3)
            },
            "recent_analyses": recent
        }

def log_audit_event(event_type: str, details: Dict[str, Any]):
    """Log system and model events into audit_logs"""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO audit_logs (event_type, details) VALUES (?, ?)", (event_type, json.dumps(details)))
            conn.commit()
    except Exception as e:
        print(f"Failed to log audit event: {e}")
