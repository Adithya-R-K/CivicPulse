# CivicPulse — AI-Powered Community Complaint Management System
## Academic Project Report & Microservices Architecture Portfolio

---

### Abstract
Modern municipal complaint redressal systems face critical challenges including slow response times, lack of automated department routing, manual prioritization bottlenecks, and frequent duplicate filings. **CivicPulse** is an enterprise-grade civic grievance platform refactored from a monolithic codebase into an asynchronous, independently deployable **Microservices Architecture**. The system comprises:
1. **Civic Core Service** (Node.js, Express.js, MongoDB Atlas) managing core application logic, citizen identity, JWT authentication, and full complaint lifecycle CRUD.
2. **Civic Intelligence Service** (Python, Flask, SQLite, Scikit-learn, NLTK) executing natural language processing, automated category classification, multi-factor priority prediction, spam risk assessment, and similarity detection.
3. **Decoupled Frontend Client** (React 18, Vite, Tailwind CSS, Leaflet Maps) providing a responsive, accessible single-page application for citizens and municipal administrators.

Both backend microservices communicate over synchronous HTTP REST APIs with strict timeouts and bounded fallbacks, adhering strictly to the **Database-per-Service** design principle.

---

### 1. Problem Statement & Motivation
Citizens encounter numerous municipal issues daily — burst water mains, hazardous power lines, deep potholes, and uncleared garbage. Traditional municipal portals:
* Treat all grievances with identical priority, delaying emergency response.
* Require manual triage by government personnel, leading to departmental misallocation.
* Suffer from single-point-of-failure monolithic bottlenecks.

By decomposing CivicPulse into specialized microservices, the system guarantees that high-volume civic reporting remains responsive while CPU-heavy ML and NLP tasks run in an isolated runtime environment with independent horizontal scalability.

---

### 2. Architecture & Service Breakdown

```
CivicPulse (Repository Root)
├── client/                          # React 18 + Vite + Tailwind CSS SPA (Deploy: Vercel)
│   ├── src/components/              # UI components (MapView, Navbar, ComplaintCard)
│   ├── src/pages/                   # SubmitComplaint, Dashboard, AdminDashboard, ComplaintDetail
│   ├── src/services/api.js          # Axios client targeting Core Service (/api/v1)
│   └── package.json
│
├── server/                          # Microservice 1: Civic Core Service (Deploy: Render)
│   ├── config/db.js                 # MongoDB Atlas connection (family: 4, public DNS)
│   ├── models/                      # User, Complaint, Comment, Department, Notification
│   ├── controllers/                 # complaintController, authController, analyticsController
│   ├── routes/                      # Versioned /api/v1 routes with backward compatibility
│   ├── services/intelligenceClient.js# Inter-Service REST HTTP client to Intelligence Service
│   ├── tests/coreService.test.js    # 20 Jest + Supertest automated tests (100% pass)
│   └── server.js                    # Core Express server entry point (Port 5000)
│
├── intelligence_service/            # Microservice 2: Civic Intelligence Service (Deploy: Render)
│   ├── app.py                       # Flask REST API with /api/v1 endpoints (Port 5001)
│   ├── db.py                        # Independent SQLite manager (intelligence.db)
│   ├── ai_engine_adapter.py         # ML model wrapper & rule-based fallbacks
│   ├── tests/test_service.py        # 8 Python unittest automated tests (100% pass)
│   ├── requirements.txt             # Python dependencies (Flask, scikit-learn, nltk)
│   └── render.yaml                  # Independent Render deployment configuration
│
├── postman/                         # API testing artifacts
│   ├── CivicPulse_API.postman_collection.json
│   └── CivicPulse_Local.postman_environment.json
│
├── docs/                            # Comprehensive documentation suite
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── INTER_SERVICE_COMMUNICATION.md
│   ├── DEPLOYMENT.md
│   ├── TESTING.md
│   ├── PROJECT_REPORT.md
│   └── VIVA_PREPARATION.md
│
└── package.json                     # Monorepo task runner (concurrently run/test all services)
```

---

### 3. Technology Stack & Justification

| Microservice | Technology | Rationale |
| :--- | :--- | :--- |
| **Civic Core Service** | Node.js, Express.js | High-throughput asynchronous non-blocking I/O ideal for API gateways and CRUD workflows. |
| **Core Database** | MongoDB Atlas | Flexible JSON document schema for rich nested civic data, geospatial coordinates, and comments. |
| **Civic Intelligence Service** | Python, Flask, Scikit-learn | De facto industry standard for scientific computing, NLP tokenization, and machine learning pipelines. |
| **Intelligence Database** | SQLite (`intelligence.db`) | Lightweight, self-contained, ACID-compliant relational store ideal for analysis history auditing without shared DB dependencies. |
| **Frontend Client** | React 18, Vite, Tailwind CSS | Fast HMR, reactive state management, component reusability, and mobile-friendly design. |

---

### 4. Machine Learning & NLP Pipeline

1. **Category Classification**:
   * **Model**: Multinomial Naive Bayes (`MultinomialNB`) with `TfidfVectorizer` (ngram range 1–3).
   * **Input**: Combined complaint title (weighted 2x) and description.
   * **Output**: Predicted category (Roads, Water, Electricity, Waste, Parks, Safety, Construction, Other) and probability confidence score.
2. **Priority Forecasting**:
   * **Model**: Calibrated Random Forest / Gradient Boosting Classifier augmented with keyword rules.
   * **Emergency Triggers**: Detects critical emergency tokens (*sparking wire*, *gas leak*, *pipe burst*, *fire*) to elevate priority to `Urgent`.
3. **Spam & Abuse Detection**:
   * Evaluates capital letter ratios, min word counts, blacklisted solicitation patterns (casino, crypto, lotteries), and URL regex.
4. **Duplicate & Similarity Detection**:
   * Constructs TF-IDF vectors for new grievances and computes cosine similarity against recent local grievances to notify citizens of ongoing investigations.

---

### 5. Verification & Key Results

* **Automated Tests**: 28 total backend tests executed (20 Node.js Jest tests + 8 Python unittest tests), achieving 100% pass rate.
* **Frontend Build**: Vite production compilation transforms 1,609 modules in 26.6s with 0 errors.
* **Inter-Service Resilience**: Verified live HTTP exchange (`Core -> Intelligence`) with automatic fallback handling under network severance.
* **Database Independence**: Zero connection sharing between MongoDB Atlas and SQLite.
