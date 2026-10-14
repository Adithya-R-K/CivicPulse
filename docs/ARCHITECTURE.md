# CivicPulse — Microservices Architecture Specification

## 1. System Overview

**CivicPulse** is an AI-powered community grievance redressal and municipal complaint management platform. The application is architected into **two independent backend microservices**, a decoupled **React SPA frontend**, and independent database layers.

```mermaid
graph TD
    subgraph Client Tier
        UI[React 18 + Vite SPA Client<br/>Port 5173 / Vercel]
    end

    subgraph Microservice 1: Civic Core Service
        Core[Node.js + Express.js API<br/>Port 5000 / Render]
        MongoDB[(MongoDB Atlas<br/>Database: civicpulse)]
    end

    subgraph Microservice 2: Civic Intelligence Service
        AI[Python 3.12/3.13 + Flask API<br/>Port 5001 / Render]
        SQLite[(SQLite Data Store<br/>Database: intelligence.db)]
        MLModels[Scikit-Learn ML Models & NLP<br/>MultinomialNB, Random Forest, VADER]
    end

    UI -->|HTTP REST / JWT Auth| Core
    Core -->|Mongoose Driver| MongoDB
    Core -->|Synchronous HTTP REST POST /api/v1/analyze| AI
    Core -->|HTTP REST GET /api/v1/analytics/summary| AI
    AI -->|Python sqlite3| SQLite
    AI -->|In-Memory Pipeline| MLModels
```

---

## 2. Service Separation & Domain Boundaries

### Microservice 1: Civic Core Service
* **Technology Stack**: Node.js, Express.js, Mongoose, JWT, Axios, Jest, Supertest.
* **Port**: `5000` (configurable via `PORT`).
* **Domain Ownership**: Core civic grievance lifecycle, citizen identity, authentication, role-based authorization, comment threads, upvotes, municipal routing, and notifications.
* **Data Ownership**: Dedicated connection to **MongoDB Atlas** (`civicpulse` database). Owns collections:
  * `users`
  * `complaints`
  * `departments`
  * `comments`
  * `notifications`
* **API Prefix**: `/api/v1` (with `/api` compatibility aliases).

### Microservice 2: Civic Intelligence Service
* **Technology Stack**: Python 3.12+, Flask, Flask-CORS, Scikit-learn, NLTK, SQLite.
* **Port**: `5001` (configurable via `PORT` / `INTELLIGENCE_PORT`).
* **Domain Ownership**: Natural Language Processing, machine learning categorization, priority forecasting, spam risk assessment, TF-IDF cosine similarity detection, sentiment scoring, and AI analysis auditing.
* **Data Ownership**: Dedicated connection to **SQLite** (`intelligence.db`). Owns tables:
  * `analysis_history` (stores all prediction audit trails with correlation IDs)
  * `audit_logs` (tracks service and model lifecycle events)
* **API Prefix**: `/api/v1`.

---

## 3. Mandatory Inter-Service Communication Sequence

The following sequence diagram details the end-to-end communication between the React Frontend, Civic Core Service, and Civic Intelligence Service during complaint submission:

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen / User
    participant Client as React SPA (Client)
    participant Core as Civic Core Service (Node.js)
    participant MongoDB as MongoDB Atlas (civicpulse)
    participant Intelligence as Civic Intelligence Service (Flask)
    participant SQLite as SQLite (intelligence.db)

    Citizen->>Client: Fills complaint form & clicks "Submit"
    Client->>Core: POST /api/v1/complaints (Bearer JWT)
    Note over Core: Validate payload (title, description, location)
    Core->>MongoDB: Fetch recent complaints (for similarity context)
    MongoDB-->>Core: Return recent complaints
    Core->>Intelligence: HTTP POST /api/v1/analyze (X-Correlation-ID, title, description)
    Note over Intelligence: Run MultinomialNB category classifier<br/>Run priority predictor<br/>Calculate spam risk & sentiment<br/>Compute cosine similarity
    Intelligence->>SQLite: INSERT INTO analysis_history
    SQLite-->>Intelligence: Record saved (analysis_id)
    Intelligence-->>Core: HTTP 200 { success: true, analysis_id, analysis: { ... } }
    Note over Core: Enrich complaint with AI predictions,<br/>SLA, and assigned department
    Core->>MongoDB: INSERT INTO complaints (status: 'Submitted', aiAnalysis: { ... })
    MongoDB-->>Core: Complaint created (ObjectId)
    Core-->>Client: HTTP 201 { success: true, complaint }
    Client-->>Citizen: Display grievance with predicted priority, category & SLA
```

---

## 4. Resilience, Bounded Retries & Fallback Strategy

To ensure zero complaint loss in production, Civic Core Service implements a **Circuit Breaker / Fallback** pattern:
1. **Timeout**: The Core Service limits inter-service HTTP requests to **4500ms**.
2. **Graceful Fallback**: If the Intelligence Service is unreachable or times out, the Core Service immediately falls back to local heuristic rule-based classification (`serviceStatus: 'fallback'`).
3. **Auditability**: The complaint is safely stored in MongoDB Atlas with a `pending-analysis` or `fallback` flag so a background worker can re-analyze it without user disruption.

---

## 5. Database Ownership Matrix

| Entity / Table | Database | Owning Microservice | Sharing Mode |
| :--- | :--- | :--- | :--- |
| `users` | MongoDB Atlas (`civicpulse`) | Civic Core Service | Private to Core Service |
| `complaints` | MongoDB Atlas (`civicpulse`) | Civic Core Service | Private to Core Service |
| `departments` | MongoDB Atlas (`civicpulse`) | Civic Core Service | Private to Core Service |
| `comments` | MongoDB Atlas (`civicpulse`) | Civic Core Service | Private to Core Service |
| `notifications` | MongoDB Atlas (`civicpulse`) | Civic Core Service | Private to Core Service |
| `analysis_history` | SQLite (`intelligence.db`) | Civic Intelligence Service | Private to Intelligence Service |
| `audit_logs` | SQLite (`intelligence.db`) | Civic Intelligence Service | Private to Intelligence Service |
