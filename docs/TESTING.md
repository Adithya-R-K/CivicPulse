# CivicPulse — Automated Testing & Verification Report

## 1. Summary of Test Execution

All test suites were executed live on the system. **100% of the tests passed with zero failures.**

| Component | Test Framework | Test File | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Civic Core Service** | Jest & Supertest | `server/tests/coreService.test.js` | 20 | 20 | 0 | **PASSED** |
| **Civic Intelligence Service** | Python `unittest` | `intelligence_service/tests/test_service.py` | 8 | 8 | 0 | **PASSED** |
| **Frontend Production Build** | Vite Build | `client/package.json` | 1 | 1 | 0 | **PASSED** |
| **Total** | | | **29** | **29** | **0** | **ALL PASSED** |

---

## 2. Test Execution Commands

### Run Full Test Suite from Project Root:
```bash
npm test
```
*(Executes both the Node.js Jest suite and the Python unittest suite).*

### Run Core Service Tests Independently:
```bash
cd server
npm test
```

### Run Intelligence Service Tests Independently:
```bash
cd intelligence_service
python -m unittest tests/test_service.py
```

### Build Frontend Production Assets:
```bash
cd client
npm run build
```

---

## 3. Verified Execution Outputs

### Civic Core Service Test Output (`npm test --prefix server`):
```text
PASS tests/coreService.test.js
  Civic Core Microservice API Tests (/api/v1)
    GET /api/v1/health
      ✓ should return 200 and healthy service metadata (100 ms)
    Authentication Endpoints
      ✓ should reject registration when required fields are missing (33 ms)
      ✓ should register a new citizen user and return JWT (19 ms)
      ✓ should login with valid citizen credentials (16 ms)
      ✓ should login with demo admin account (15 ms)
      ✓ should reject login with invalid password (22 ms)
      ✓ should retrieve current user profile with valid Bearer token (19 ms)
      ✓ should reject access to protected endpoint without token (14 ms)
    Complaints CRUD & Inter-Service AI Workflow
      ✓ should reject complaint creation when title/description are missing (20 ms)
      ✓ should create complaint, execute AI analysis workflow, and return 201 (132 ms)
      ✓ should list complaints with pagination metadata (17 ms)
      ✓ should retrieve a single complaint by ID (16 ms)
      ✓ should update complaint details (PUT /api/v1/complaints/:id) (18 ms)
      ✓ should reject invalid complaint status value with 400 (27 ms)
      ✓ should update complaint status with authorized admin token (PATCH /api/v1/complaints/:id/status) (17 ms)
      ✓ should toggle upvote on a complaint (15 ms)
      ✓ should post a comment on a complaint (17 ms)
    Integrated Analytics Workflow
      ✓ should return combined operational and AI metrics from both services (40 ms)
      ✓ should return department list (11 ms)
    Error Handling
      ✓ should return 404 JSON response for nonexistent endpoint (11 ms)

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Time:        4.732 s
```

### Civic Intelligence Service Test Output:
```text
test_01_health_check (tests.test_service.TestCivicIntelligenceService) ... ok
test_02_classify_category (tests.test_service.TestCivicIntelligenceService) ... ok
test_03_predict_priority (tests.test_service.TestCivicIntelligenceService) ... ok
test_04_detect_spam (tests.test_service.TestCivicIntelligenceService) ... ok
test_05_full_analyze_and_persistence (tests.test_service.TestCivicIntelligenceService) ... ok
test_06_sqlite_crud_operations (tests.test_service.TestCivicIntelligenceService) ... ok
test_07_analytics_summary (tests.test_service.TestCivicIntelligenceService) ... ok
test_08_invalid_input_handling (tests.test_service.TestCivicIntelligenceService) ... ok

----------------------------------------------------------------------
Ran 8 tests in 3.597s

OK
```

---

## 4. Postman API Testing Instructions

1. Open Postman.
2. Click **Import** &rarr; Select:
   - `postman/CivicPulse_API.postman_collection.json`
   - `postman/CivicPulse_Local.postman_environment.json`
3. Select the **CivicPulse Local Environment** from the environment dropdown in Postman.
4. Execute the requests in sequence:
   - **Auth - Login Citizen** (automatically populates `{{token}}` in collection variables).
   - **Complaints - Submit with AI Analysis** (transmits to Core Service, calls Intelligence Service, updates `{{complaint_id}}`).
   - **AI - Full Analyze & Persist to SQLite** (directly tests Intelligence Service and sets `{{analysis_id}}`).
   - **SQLite CRUD - List Analysis History** (verifies persistence in `intelligence.db`).
   - **Analytics - Integrated Summary** (tests inter-service data merger).
5. All test scripts in the Postman collection will display green checkmarks (**PASS**).
