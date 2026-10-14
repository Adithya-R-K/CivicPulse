"""
Civic Intelligence Service — Automated Unit Test Suite
Uses Python unittest to verify all endpoints, SQLite CRUD, and AI pipelines.
"""

import os
import sys
import json
import unittest

# Ensure service directory is in path
SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

TEST_DB_PATH = os.path.join(SERVICE_DIR, "test_intelligence.db")
os.environ["INTELLIGENCE_DB_PATH"] = TEST_DB_PATH

from app import app
from db import init_db

class TestCivicIntelligenceService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except:
                pass
        init_db()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except:
                pass

    def setUp(self):
        self.client = app.test_client()

    def test_01_health_check(self):
        """Verify health check endpoint returns 200 and healthy status"""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "civic-intelligence-service")

    def test_02_classify_category(self):
        """Verify complaint category classification endpoint"""
        payload = {
            "title": "Huge water leakage on main road",
            "description": "Clean municipal water pipe burst near market and flooding the street."
        }
        response = self.client.post(
            "/api/v1/classify",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertIn("category", data)
        self.assertIn("confidence", data)
        self.assertGreater(data["confidence"], 0.0)

    def test_03_predict_priority(self):
        """Verify priority prediction endpoint"""
        payload = {
            "title": "Live electric wire sparking near school gate - DANGER",
            "description": "High voltage wire snapped and hanging low. Immediate threat of electric shock.",
            "category": "Electricity"
        }
        response = self.client.post(
            "/api/v1/predict-priority",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertIn(data["priority"], ["Urgent", "High", "Critical"])

    def test_04_detect_spam(self):
        """Verify spam detection for clean and spam submissions"""
        clean_payload = {
            "title": "Pothole on 5th cross street",
            "description": "Large deep pothole damaging two-wheelers on 5th cross street."
        }
        res_clean = self.client.post(
            "/api/v1/detect-spam",
            data=json.dumps(clean_payload),
            content_type="application/json"
        )
        data_clean = json.loads(res_clean.data)
        self.assertFalse(data_clean["is_spam"])

        spam_payload = {
            "title": "FREE MONEY",
            "description": "Click here to win casino crypto jackpot"
        }
        res_spam = self.client.post(
            "/api/v1/detect-spam",
            data=json.dumps(spam_payload),
            content_type="application/json"
        )
        data_spam = json.loads(res_spam.data)
        self.assertTrue(data_spam["is_spam"])

    def test_05_full_analyze_and_persistence(self):
        """Verify primary inter-service analyze endpoint persists record to SQLite"""
        payload = {
            "complaint_id": "comp_test_101",
            "title": "Broken street light causing complete darkness",
            "description": "Street lights not working for three days on 2nd main street. Safety concern for women."
        }
        response = self.client.post(
            "/api/v1/analyze",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertTrue(data["stored_in_sqlite"])
        self.assertIsNotNone(data["analysis_id"])
        self.assertIn("category", data["analysis"])
        self.assertIn("priority", data["analysis"])
        self.assertIn("department", data["analysis"])

    def test_06_sqlite_crud_operations(self):
        """Verify full CRUD lifecycle on independent SQLite database"""
        # 1. CREATE
        create_payload = {
            "title": "Garbage pile near park entrance",
            "description": "Waste bins not cleared for a week.",
            "category": "Waste"
        }
        res_create = self.client.post(
            "/api/v1/history",
            data=json.dumps(create_payload),
            content_type="application/json"
        )
        self.assertEqual(res_create.status_code, 201)
        created_data = json.loads(res_create.data)
        record_id = created_data["record"]["id"]
        self.assertIsNotNone(record_id)

        # 2. READ (Single)
        res_get = self.client.get(f"/api/v1/history/{record_id}")
        self.assertEqual(res_get.status_code, 200)
        data_get = json.loads(res_get.data)
        self.assertEqual(data_get["record"]["title"], "Garbage pile near park entrance")

        # 3. READ (List)
        res_list = self.client.get("/api/v1/history?limit=10")
        self.assertEqual(res_list.status_code, 200)
        data_list = json.loads(res_list.data)
        self.assertGreater(data_list["total"], 0)

        # 4. UPDATE
        update_payload = {"priority": "Urgent"}
        res_update = self.client.put(
            f"/api/v1/history/{record_id}",
            data=json.dumps(update_payload),
            content_type="application/json"
        )
        self.assertEqual(res_update.status_code, 200)
        data_update = json.loads(res_update.data)
        self.assertEqual(data_update["record"]["priority"], "Urgent")

        # 5. DELETE
        res_delete = self.client.delete(f"/api/v1/history/{record_id}")
        self.assertEqual(res_delete.status_code, 200)

        # Verify Deleted
        res_verify = self.client.get(f"/api/v1/history/{record_id}")
        self.assertEqual(res_verify.status_code, 404)

    def test_07_analytics_summary(self):
        """Verify analytics summary aggregates data from SQLite"""
        # Seed an analysis record first
        self.client.post(
            "/api/v1/analyze",
            data=json.dumps({
                "title": "Overflowing sewage pipe",
                "description": "Severe sewage water overflow onto main road."
            }),
            content_type="application/json"
        )

        response = self.client.get("/api/v1/analytics/summary")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertIn("total_analyses", data["data"])
        self.assertGreater(data["data"]["total_analyses"], 0)
        self.assertIn("category_distribution", data["data"])
        self.assertIn("spam_statistics", data["data"])

    def test_08_invalid_input_handling(self):
        """Verify structured 400 error response on empty/invalid input"""
        response = self.client.post(
            "/api/v1/analyze",
            data=json.dumps({"title": "", "description": ""}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data["success"])
        self.assertIn("error", data)

if __name__ == "__main__":
    unittest.main()
