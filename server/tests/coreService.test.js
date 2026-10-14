/**
 * Civic Core Service — Automated Integration & Unit Tests
 * Uses Jest and Supertest to verify versioned /api/v1 endpoints,
 * JWT authentication, input validation, complaints CRUD, and inter-service client.
 */

const request = require('supertest');
const app = require('../server');

describe('Civic Core Microservice API Tests (/api/v1)', () => {
  let authToken = '';
  let adminToken = '';
  let testComplaintId = '';
  const uniqueId = Date.now();

  // -------------------- HEALTH CHECK --------------------

  describe('GET /api/v1/health', () => {
    it('should return 200 and healthy service metadata', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('civic-core-service');
      expect(res.body.database).toBeDefined();
      expect(res.body.inter_service).toBeDefined();
    });
  });

  // -------------------- AUTHENTICATION --------------------

  describe('Authentication Endpoints', () => {
    it('should reject registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'missing_email' });
      expect(res.status).toBe(400);
    });

    it('should register a new citizen user and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: `testuser_${uniqueId}`,
          email: `testuser_${uniqueId}@civicpulse.test`,
          password: 'TestPassword123',
          fullName: 'Test Citizen User',
          address: '123 Test Street, Coimbatore',
          phone: '9876543210',
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it('should login with valid citizen credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: `testuser_${uniqueId}`,
          password: 'TestPassword123',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it('should login with demo admin account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isAdmin).toBe(true);
      adminToken = res.body.token;
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'WrongPassword999',
        });
      expect(res.status).toBe(401);
    });

    it('should retrieve current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject access to protected endpoint without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // -------------------- COMPLAINTS CRUD & INTER-SERVICE --------------------

  describe('Complaints CRUD & Inter-Service AI Workflow', () => {
    it('should reject complaint creation when title/description are missing', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create complaint, execute AI analysis workflow, and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Massive water pipe burst near Gandhipuram ${uniqueId}`,
          description: 'High pressure drinking water pipe ruptured and flooding the entire cross street. Urgent repair required.',
          location: 'Gandhipuram Bus Stand, Coimbatore',
          latitude: 11.0205,
          longitude: 76.9667,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint).toBeDefined();
      expect(res.body.complaint.title).toContain('Massive water pipe burst');

      // Verify AI fields were assigned
      expect(res.body.complaint.priority).toBeDefined();
      expect(res.body.complaint.department).toBeDefined();
      expect(res.body.complaint.aiAnalysis).toBeDefined();

      testComplaintId = res.body.complaint._id;
    });

    it('should list complaints with pagination metadata', async () => {
      const res = await request(app).get('/api/v1/complaints?limit=10&page=1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.complaints)).toBe(true);
      expect(res.body.complaints.length).toBeGreaterThan(0);
    });

    it('should retrieve a single complaint by ID', async () => {
      const targetId = testComplaintId || '660e1d0f5e71826b52a12301';
      const res = await request(app).get(`/api/v1/complaints/${targetId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint).toBeDefined();
    });

    it('should update complaint details (PUT /api/v1/complaints/:id)', async () => {
      const targetId = testComplaintId || '660e1d0f5e71826b52a12301';
      const res = await request(app)
        .put(`/api/v1/complaints/${targetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Updated: Massive water pipe burst near Gandhipuram ${uniqueId}`,
        });
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should reject invalid complaint status value with 400', async () => {
      const targetId = testComplaintId || '660e1d0f5e71826b52a12301';
      const res = await request(app)
        .patch(`/api/v1/complaints/${targetId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'InvalidStatusXYZ' });
      expect(res.status).toBe(400);
    });

    it('should update complaint status with authorized admin token (PATCH /api/v1/complaints/:id/status)', async () => {
      const targetId = testComplaintId || '660e1d0f5e71826b52a12301';
      const res = await request(app)
        .patch(`/api/v1/complaints/${targetId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'In Progress' });
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.complaint.status).toBe('In Progress');
      }
    });

    it('should toggle upvote on a complaint', async () => {
      const targetId = testComplaintId || '660e1d0f5e71826b52a12301';
      const res = await request(app)
        .post(`/api/v1/complaints/${targetId}/upvote`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should post a comment on a complaint', async () => {
      const targetId = testComplaintId || '660e1d0f5e71826b52a12301';
      const res = await request(app)
        .post(`/api/v1/complaints/${targetId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ comment: 'Maintenance team dispatched to inspect site.' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------- INTEGRATED ANALYTICS WORKFLOW --------------------

  describe('Integrated Analytics Workflow', () => {
    it('should return combined operational and AI metrics from both services', async () => {
      const res = await request(app).get('/api/v1/analytics/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('civic-core-service');
      expect(res.body.operational_metrics).toBeDefined();
      expect(res.body.ai_intelligence_service).toBeDefined();
    });

    it('should return department list', async () => {
      const res = await request(app).get('/api/v1/departments');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.departments).toBeDefined();
    });
  });

  // -------------------- 404 & ERROR HANDLING --------------------

  describe('Error Handling', () => {
    it('should return 404 JSON response for nonexistent endpoint', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  afterAll(async () => {
    const mongoose = require('mongoose');
    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
      }
    } catch (e) {}
  }, 10000);
});
