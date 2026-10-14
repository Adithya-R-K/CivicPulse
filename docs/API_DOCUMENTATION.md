# CivicPulse — Comprehensive API Documentation

## Base URLs
* **Civic Core Service**: `http://localhost:5000/api/v1` (Production: Render URL)
* **Civic Intelligence Service**: `http://localhost:5001/api/v1` (Production: Render URL)

---

# Part 1: Civic Core Service APIs

### 1. Health Check
* **Endpoint**: `GET /api/v1/health`
* **Auth**: None
* **Description**: Returns Core Service operational status, MongoDB connection health, and inter-service connectivity state.
* **Response (200 OK)**:
```json
{
  "status": "healthy",
  "service": "civic-core-service",
  "version": "1.0.0",
  "database": {
    "type": "mongodb",
    "name": "civicpulse",
    "status": "connected"
  },
  "inter_service": {
    "intelligence_service": "connected",
    "url": "http://localhost:5001"
  },
  "timestamp": "2026-10-14T17:15:00.000Z"
}
```

---

### 2. User Registration
* **Endpoint**: `POST /api/v1/auth/register`
* **Auth**: None
* **Request Body**:
```json
{
  "username": "citizen_demo",
  "email": "citizen_demo@civicpulse.gov",
  "password": "Password123",
  "fullName": "Demo Citizen",
  "address": "Gandhipuram, Coimbatore",
  "phone": "9876543210"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": "660e1d0f5e71826b52a12399",
    "username": "citizen_demo",
    "email": "citizen_demo@civicpulse.gov",
    "fullName": "Demo Citizen",
    "role": "citizen",
    "isAdmin": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. User Login
* **Endpoint**: `POST /api/v1/auth/login`
* **Auth**: None
* **Request Body**:
```json
{
  "username": "citizen",
  "password": "Citizen123"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "660e1d0f5e71826b52a12346",
    "username": "citizen",
    "email": "citizen@civicpulse.gov",
    "fullName": "Demo Citizen",
    "role": "citizen",
    "isAdmin": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 4. Submit Complaint (with Inter-Service AI Analysis)
* **Endpoint**: `POST /api/v1/complaints`
* **Auth**: Bearer JWT (`Authorization: Bearer <token>`)
* **Request Body**:
```json
{
  "title": "Severe road pothole near Peelamedu Flyover",
  "description": "Large deep craters in the tarmac on Avinashi Road causing heavy vehicle damage and traffic stalls.",
  "location": "Avinashi Road near Peelamedu, Coimbatore",
  "latitude": 11.0280,
  "longitude": 77.0043,
  "imageUrl": "https://example.com/pothole.jpg"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Complaint created and successfully analyzed by Civic Intelligence Service",
  "complaint": {
    "_id": "670da414e2d3b94218817a1a",
    "title": "Severe road pothole near Peelamedu Flyover",
    "description": "Large deep craters in the tarmac on Avinashi Road causing heavy vehicle damage and traffic stalls.",
    "category": "Roads",
    "priority": "High",
    "status": "Submitted",
    "department": "Roads & Transportation",
    "location": "Avinashi Road near Peelamedu, Coimbatore",
    "coordinates": { "latitude": 11.0280, "longitude": 77.0043 },
    "aiAnalysis": {
      "analysisId": 14,
      "predictedCategory": "Roads",
      "categoryConfidence": 0.88,
      "predictedPriority": "High",
      "priorityConfidence": 0.85,
      "spamScore": 0.0,
      "isSpam": false,
      "sentimentScore": -0.5,
      "urgencyScore": 0.75,
      "serviceStatus": "completed",
      "correlationId": "req_1791997930665"
    },
    "createdAt": "2026-10-14T17:15:10.000Z"
  },
  "aiAnalysisStatus": "completed"
}
```

---

### 5. List Complaints (with Pagination & Filters)
* **Endpoint**: `GET /api/v1/complaints?category=Roads&status=Submitted&page=1&limit=10`
* **Auth**: None
* **Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "complaints": [ ... ]
}
```

---

### 6. Get Complaint By ID
* **Endpoint**: `GET /api/v1/complaints/:id`
* **Auth**: None
* **Response (200 OK)**: Returns complaint document and attached comment thread.

---

### 7. Update Complaint Details
* **Endpoint**: `PUT /api/v1/complaints/:id`
* **Auth**: Bearer JWT (Author or Admin)
* **Request Body**: `{ "title": "Updated Title", "location": "Updated Landmark" }`
* **Response (200 OK)**: Returns updated complaint object.

---

### 8. Update Complaint Status
* **Endpoint**: `PATCH /api/v1/complaints/:id/status` (or `PUT /api/v1/complaints/:id/status`)
* **Auth**: Bearer JWT (Admin only)
* **Request Body**: `{ "status": "In Progress" }`
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Status updated to In Progress",
  "complaint": { ... }
}
```

---

### 9. Delete Complaint
* **Endpoint**: `DELETE /api/v1/complaints/:id`
* **Auth**: Bearer JWT (Author or Admin)
* **Response (200 OK)**: `{ "success": true, "message": "Complaint deleted successfully" }`

---

### 10. Integrated Analytics Summary
* **Endpoint**: `GET /api/v1/analytics/summary`
* **Auth**: None
* **Description**: Queries Core MongoDB stats and combines them via REST with Intelligence Service SQLite metrics.
* **Response (200 OK)**:
```json
{
  "success": true,
  "service": "civic-core-service",
  "operational_metrics": {
    "total_complaints": 8,
    "resolved": 2,
    "in_progress": 2,
    "pending": 4,
    "resolution_rate": 25.0,
    "category_breakdown": { "Roads": 3, "Water": 3, "Electricity": 2 }
  },
  "ai_intelligence_service": {
    "connected": true,
    "data_source": "SQLite (intelligence.db) via REST API",
    "metrics": {
      "total_analyses": 8,
      "category_distribution": { "Roads": 3, "Water": 3, "Electricity": 2 },
      "spam_statistics": { "spam_rate_percentage": 0.0 },
      "average_metrics": {
        "avg_category_confidence": 0.86,
        "avg_priority_confidence": 0.81,
        "avg_sentiment_score": -0.42
      }
    }
  }
}
```

---

# Part 2: Civic Intelligence Service APIs

### 1. Health Check
* **Endpoint**: `GET /api/v1/health`
* **Response (200 OK)**:
```json
{
  "status": "healthy",
  "service": "civic-intelligence-service",
  "version": "1.0.0",
  "models_ready": true,
  "database": "sqlite (intelligence.db)",
  "timestamp": "2026-10-14T17:15:00.000000+00:00"
}
```

---

### 2. Full Complaint Analysis (Inter-Service Endpoint)
* **Endpoint**: `POST /api/v1/analyze`
* **Request Body**:
```json
{
  "title": "Broken transformer sparking near residential apartments",
  "description": "High voltage sparks bursting from transformer on 4th street. Huge fire risk.",
  "category": "Electricity"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "analysis_id": 4,
  "stored_in_sqlite": true,
  "analysis": {
    "category": "Electricity",
    "category_confidence": 0.92,
    "priority": "Urgent",
    "priority_confidence": 0.95,
    "spam_score": 0.0,
    "is_spam": false,
    "spam_flags": [],
    "sentiment_score": -0.85,
    "urgency_score": 0.95,
    "department": "Electricity Department",
    "similar_complaints": [],
    "similar_count": 0,
    "model_version": "v1.0.0-advanced"
  }
}
```

---

### 3. Category Classification
* **Endpoint**: `POST /api/v1/classify`
* **Request Body**: `{ "title": "Pothole on road", "description": "Road surface collapsed." }`
* **Response (200 OK)**: `{ "success": true, "category": "Roads", "confidence": 0.85 }`

---

### 4. Priority Prediction
* **Endpoint**: `POST /api/v1/predict-priority`
* **Request Body**: `{ "title": "Gas leak near school", "description": "Severe gas smell", "category": "Safety" }`
* **Response (200 OK)**: `{ "success": true, "priority": "Urgent", "confidence": 0.95 }`

---

### 5. Spam Risk Detection
* **Endpoint**: `POST /api/v1/detect-spam`
* **Request Body**: `{ "title": "CLICK HERE WIN CASINO CRYPTO", "description": "Free jackpot!" }`
* **Response (200 OK)**: `{ "success": true, "is_spam": true, "spam_score": 0.8, "spam_flags": ["SUSPICIOUS_KEYWORD"] }`

---

### 6. Similarity Detection
* **Endpoint**: `POST /api/v1/similar-complaints`
* **Request Body**:
```json
{
  "title": "Avinashi Road pothole",
  "description": "Potholes on road near Peelamedu",
  "existing_complaints": [
    { "id": "1", "title": "Avinashi Road pothole near Peelamedu", "description": "Large potholes" }
  ]
}
```
* **Response (200 OK)**: `{ "success": true, "count": 1, "similar_complaints": [ ... ] }`

---

### 7. SQLite CRUD: Analysis History
* `GET /api/v1/history?limit=20&offset=0` — List logged predictions
* `GET /api/v1/history/:id` — Retrieve single analysis record
* `POST /api/v1/history` — Create manual analysis entry
* `PUT /api/v1/history/:id` — Update analysis record
* `DELETE /api/v1/history/:id` — Delete analysis record
