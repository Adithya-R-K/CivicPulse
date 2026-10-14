# CivicPulse — Master Viva Voce Preparation Guide (10 Marks)

This document provides concise, technically rigorous, and accurate answers to the fundamental architectural, engineering, and machine learning questions for the CivicPulse evaluation.

---

### Q1. What is CivicPulse, and what problem does it solve?
**Answer:**  
CivicPulse is an AI-powered community grievance redressal and municipal complaint management platform. Traditional civic portals suffer from manual triage delays, misallocated departmental assignments, duplicate issue filings, and unprioritized emergency responses. CivicPulse automates complaint categorization, priority determination, duplicate detection, and departmental dispatching using machine learning, allowing citizens to track issues in real-time and administrators to resolve public grievances efficiently.

---

### Q2. What is a microservice?
**Answer:**  
A microservice is an architectural pattern in which an application is structured as a collection of small, loosely coupled, independently runnable, and independently deployable services. Each service is organized around a specific business capability, communicates over lightweight protocols (such as HTTP REST or message brokers), and manages its own private database (Database-per-Service pattern).

---

### Q3. Why did you divide CivicPulse into two microservices?
**Answer:**  
CivicPulse separates concerns along two distinct operational axes:
1. **I/O-Intensive Core Application Logic**: Citizen authentication, complaint CRUD, commenting, and notification dispatching require high-concurrency, non-blocking asynchronous event handling.
2. **CPU-Intensive AI & Machine Learning**: Natural language processing, TF-IDF vectorization, scikit-learn model inference, and spam analysis require heavy numerical computing and Python scientific libraries.

Running both in a single monolithic process would cause CPU-heavy ML calculations to block the event loop and degrade API responsiveness. Separating them allows independent scaling (e.g., scaling the AI engine across multiple worker instances without modifying the core web server).

---

### Q4. What functionality does each service provide?
**Answer:**  
* **Civic Core Service (Node.js/Express, Port 5000)**:
  * Manages citizen registration, login, and JWT session verification (`/api/v1/auth/*`).
  * Manages complaint lifecycle CRUD (`GET`, `POST`, `PUT`, `DELETE /api/v1/complaints`).
  * Handles administrative status updates (`PATCH /api/v1/complaints/:id/status`).
  * Coordinates comment threads, upvotes, and municipal department SLAs (`/api/v1/departments`).
  * Orchestrates synchronous REST calls to the Intelligence Service upon complaint submission.
* **Civic Intelligence Service (Python/Flask, Port 5001)**:
  * Automatic category classification (`POST /api/v1/classify`).
  * Dynamic priority forecasting (`POST /api/v1/predict-priority`).
  * Spam risk assessment and keyword filtering (`POST /api/v1/detect-spam`).
  * Duplicate grievance detection via cosine similarity (`POST /api/v1/similar-complaints`).
  * End-to-end complaint analysis and SQLite audit logging (`POST /api/v1/analyze`).
  * Aggregated model performance metrics (`GET /api/v1/analytics/summary`).
  * CRUD operations for analysis history (`GET`, `POST`, `PUT`, `DELETE /api/v1/history`).

---

### Q5. Why did you choose these technologies?
**Answer:**  
* **Node.js & Express**: Selected for the Core Service because of its asynchronous, single-threaded event loop and high throughput for I/O-bound REST API operations.
* **MongoDB Atlas & Mongoose**: Selected for Core Service because civic complaints contain semi-structured, nested data (geospatial coordinates, upvote arrays, comment references, AI prediction metadata) that map naturally to BSON documents.
* **Python & Flask**: Selected for the Intelligence Service because Python provides the industry-standard ecosystem for machine learning (`scikit-learn`, `nltk`, `pandas`, `joblib`). Flask provides a lightweight, minimalist WSGI micro-framework without unnecessary ORM overhead.
* **SQLite (`intelligence.db`)**: Selected for the Intelligence Service as an embedded, zero-configuration, ACID-compliant relational store perfectly suited for microservice-isolated audit logs and analytics.
* **React 18 & Vite**: Selected for the client because of rapid Hot Module Replacement (HMR), component-driven UI architecture, and seamless single-page application (SPA) routing.

---

### Q6. How does the frontend communicate with the backend?
**Answer:**  
The React SPA communicates with the Civic Core Service via standard asynchronous HTTP REST requests using an Axios client instance (`client/src/services/api.js`).
* The base URL is configured via environment variables (`VITE_CORE_API_URL`, defaulting to `/api/v1`).
* An Axios request interceptor automatically attaches the citizen's JSON Web Token (`Authorization: Bearer <token>`) from `localStorage` to all authenticated requests.
* The frontend primarily communicates with the **Core Service**, which acts as an orchestrator, shielding the frontend from needing to coordinate multi-service calls for core operations.

---

### Q7. How do the two microservices communicate?
**Answer:**  
The two backend microservices communicate using synchronous **HTTP REST requests over TCP/IP**:
1. When a complaint is submitted, the Core Service invokes `analyzeComplaintWithIntelligenceService()` inside `server/services/intelligenceClient.js`.
2. The Core Service sends an HTTP `POST` request to `http://localhost:5001/api/v1/analyze` containing the complaint text, category hint, and recent complaints for similarity context.
3. The request includes an `X-Correlation-ID` header for distributed tracing and an `X-Service-Name: civic-core-service` header.
4. The Intelligence Service processes the request, persists an audit record into SQLite, and returns HTTP 200 with structured JSON.
5. In addition, when an admin requests analytics, the Core Service calls `GET http://localhost:5001/api/v1/analytics/summary` to fetch AI performance metrics and merges them with MongoDB operational stats.

---

### Q8. What is a REST API?
**Answer:**  
A REST (Representational State Transfer) API is an architectural style for networked applications based on stateless client-server communication using standard HTTP methods:
* **GET**: Retrieve resource representation without side effects (safe & idempotent).
* **POST**: Create a new resource or execute a processing task (not idempotent).
* **PUT**: Replace or update an entire existing resource (idempotent).
* **PATCH**: Partially update specific fields of a resource (e.g., updating just the status).
* **DELETE**: Remove a resource (idempotent).
REST uses standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`) and communicates via JSON.

---

### Q9. What are CRUD operations? Give examples from the project.
**Answer:**  
CRUD stands for **Create, Read, Update, Delete**.

#### In Civic Core Service (MongoDB Atlas):
* **Create**: `POST /api/v1/complaints` (inserts complaint document into `complaints` collection).
* **Read**: `GET /api/v1/complaints` and `GET /api/v1/complaints/:id` (queries complaints by ID or filters).
* **Update**: `PUT /api/v1/complaints/:id` (updates complaint details) and `PATCH /api/v1/complaints/:id/status` (updates status).
* **Delete**: `DELETE /api/v1/complaints/:id` (deletes complaint document from MongoDB).

#### In Civic Intelligence Service (SQLite):
* **Create**: `POST /api/v1/history` (inserts audit record into `analysis_history` table).
* **Read**: `GET /api/v1/history` and `GET /api/v1/history/:id` (queries analysis records).
* **Update**: `PUT /api/v1/history/:id` (updates priority or verification flags in SQLite).
* **Delete**: `DELETE /api/v1/history/:id` (removes record from `analysis_history`).

---

### Q10. Why does each microservice own its database?
**Answer:**  
This implements the fundamental **Database-per-Service** microservices pattern:
1. **Loose Coupling**: If both services shared a single database, changing a schema or column in one service could silently break the other service.
2. **Polyglot Persistence**: The Core Service benefits from MongoDB's flexible document model for nested civic data, while the Intelligence Service benefits from SQLite's lightweight relational structure for structured historical auditing.
3. **Independent Scalability & Maintenance**: Either database can be backed up, migrated, or restarted without impacting the operational uptime of the other service.
4. **Security & Boundary Enforcement**: The Intelligence Service has zero direct access to user passwords or sensitive citizen profile data.

---

### Q11. How does AI classify a complaint?
**Answer:**  
1. **Preprocessing**: The incoming text is tokenized, stripped of punctuation, converted to lowercase, and filtered against English stopwords using NLTK.
2. **Text Weighting**: The title is concatenated twice (`title + " " + title + " " + description`) to give headline keywords higher weight.
3. **TF-IDF Vectorization**: Text is transformed into numerical feature vectors using `TfidfVectorizer` (unigrams, bigrams, and trigrams).
4. **Model Inference**: A pre-trained `MultinomialNB` (Multinomial Naive Bayes) classifier calculates posterior class probabilities across municipal categories (Roads, Water, Electricity, Waste, Parks, Safety, Construction).
5. **Confidence Thresholding**: If the highest probability falls below the minimum confidence threshold (0.3), the category defaults to `Other` to prevent erroneous routing.

---

### Q12. How is complaint priority predicted?
**Answer:**  
Priority is determined through a hybrid **Machine Learning + Heuristic Rules Pipeline**:
1. **ML Model**: A Calibrated Random Forest Classifier predicts base priority (`Low`, `Medium`, `High`, `Critical`).
2. **Emergency Keyword Elevation**: The text is scanned for life-threatening or severe emergency tokens (*fire*, *gas leak*, *sparking wire*, *burst main*, *accident*, *collapse*). If detected, priority is elevated to `Urgent` with a confidence boost.
3. **Category Weighting**: Complaints categorized as `Safety`, `Electricity`, or `Water` with active risk keywords automatically receive elevated baseline priorities.
4. **VADER Sentiment Analysis**: Sentiment polarity scores below `-0.5` (extreme negative sentiment/distress) automatically escalate the grievance by one priority level.

---

### Q13. How does the system handle a failed service request?
**Answer:**  
CivicPulse implements **Graceful Degradation with Bounded Timeouts**:
1. In `server/services/intelligenceClient.js`, HTTP requests to the Intelligence Service have a strict **4500ms timeout**.
2. If the Intelligence Service is down or times out (`ECONNREFUSED` / `ETIMEDOUT`), the Core Service catches the error and executes `generateLocalFallbackAnalysis()`.
3. The fallback runs local deterministic keyword heuristics to assign a reasonable category and priority.
4. The complaint is safely saved in MongoDB Atlas with `aiAnalysis.serviceStatus = 'fallback'`, ensuring **zero complaint loss**.
5. The citizen receives an HTTP 201 response confirming registration without interruption.

---

### Q14. How are APIs tested in Postman?
**Answer:**  
1. Import `postman/CivicPulse_API.postman_collection.json` and `postman/CivicPulse_Local.postman_environment.json`.
2. The environment defines `{{core_base_url}}` (`http://localhost:5000`) and `{{intelligence_base_url}}` (`http://localhost:5001`).
3. Running `Auth - Login Citizen` executes a Postman test script:
   ```javascript
   const json = pm.response.json();
   if (json.token) pm.collectionVariables.set('token', json.token);
   ```
   This automatically persists the JWT token for all subsequent authenticated requests.
4. Running `Complaints - Submit with AI Analysis` automatically captures the generated `_id` into `{{complaint_id}}` to test status updates and detail retrieval.

---

### Q15. How are the two services deployed independently?
**Answer:**  
* **Civic Core Service**: Deployed on Render as a Web Service configured via `server/render.yaml`. Builds with `npm install` and starts with `node server.js`. Connects to MongoDB Atlas via `MONGO_URI` and references the Intelligence Service via `INTELLIGENCE_SERVICE_URL`.
* **Civic Intelligence Service**: Deployed on Render as a separate Python Web Service configured via `intelligence_service/render.yaml`. Builds with `pip install -r requirements.txt` and runs via `gunicorn app:app`. Mounts a persistent volume for `intelligence.db`.
* **Frontend**: Deployed on Vercel as a static Single Page Application building from `client/` via `npm run build`.

---

### Q16. How do you verify that the deployed application works end to end?
**Answer:**  
1. **Health Probes**: Send HTTP GET to both public health endpoints (`https://<core>/api/v1/health` and `https://<ai>/api/v1/health`) and verify HTTP 200 responses.
2. **Citizen Submission Test**: Open the Vercel frontend, log in, and submit a grievance. Verify that network requests return HTTP 201 and that the card renders with an AI-predicted category and priority.
3. **Database Audit**: Verify in MongoDB Atlas that the document contains `aiAnalysis.serviceStatus: "completed"` and verify in the Intelligence Service SQLite database that the corresponding `analysis_history` record exists with matching `correlation_id`.
4. **Automated Test Run**: Run `npm test` from the root directory to verify that all 28 automated tests pass across both services.

---

### Q17. What are the advantages and limitations of the architecture?
**Answer:**  
#### Advantages:
* **Fault Isolation**: If the Python AI service crashes or requires model retraining, the Core Service remains operational and handles citizen submissions via fallback heuristics.
* **Technology Specialization**: Uses JavaScript/Node.js for high-speed I/O and Python for machine learning.
* **Independent Scalability**: High submission traffic can be handled by scaling Core instances, while heavy text classification can be scaled on GPU/compute-optimized nodes.
* **Continuous Deployment**: The AI models can be updated and redeployed without redeploying the core web application.

#### Limitations:
* **Network Latency**: Synchronous inter-service REST calls introduce network overhead compared to in-memory function calls.
* **Operational Complexity**: Requires managing separate deployment pipelines, monitoring two processes, and tracking distributed correlation IDs.

---

### Q18. How are authentication and authorization implemented?
**Answer:**  
* **Authentication**: Implemented using stateless **JSON Web Tokens (JWT)**. Passwords are encrypted before storage using **bcryptjs** with a salt round of 10 (`server/models/User.js`). Upon login, the Core Service generates a signed token carrying the user ID.
* **Authorization**: Implemented using Express middleware (`server/middleware/authMiddleware.js`):
  * `protect`: Verifies the JWT Bearer token in the `Authorization` header, extracts the user ID, and attaches `req.user`.
  * `adminOnly`: Inspects `req.user.role === 'admin'` or `req.user.isAdmin === true`. Non-admin users attempting administrative actions (such as `PATCH /api/v1/complaints/:id/status`) are rejected with `403 Forbidden`.
