/**
 * Civic Core Microservice — Node.js & Express REST API
 * Service 1 of 2 in CivicPulse Microservices Architecture
 * Owns independent MongoDB data store (Atlas / local).
 * Exposes versioned REST API under /api/v1 with backward-compatibility mounts.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const connectDB = require('./config/db');
const { checkIntelligenceServiceHealth } = require('./services/intelligenceClient');

// Route files
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsController = require('./controllers/analyticsController');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ==================== HEALTH CHECK ENDPOINTS ====================

const healthHandler = async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'connecting_or_offline';
  const intelligenceHealth = await checkIntelligenceServiceHealth();

  res.json({
    status: 'healthy',
    service: 'civic-core-service',
    version: '1.0.0',
    database: {
      type: 'mongodb',
      name: mongoose.connection.name || 'civicpulse',
      status: dbStatus,
    },
    inter_service: {
      intelligence_service: intelligenceHealth.online ? 'connected' : 'unreachable_fallback_active',
      url: process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:5001',
    },
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/v1/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ==================== VERSIONED API ROUTES (/api/v1) ====================

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.get('/api/v1/departments', analyticsController.getDepartmentStats);

// ==================== BACKWARD COMPATIBILITY MOUNTS (/api & root) ====================

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.get('/api/departments', analyticsController.getDepartmentStats);

// Root path compatibility for reverse proxies
app.use('/auth', authRoutes);
app.use('/complaints', complaintRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/chat', chatRoutes);
app.use('/notifications', notificationRoutes);

// Compatibility endpoints matching legacy frontend/mobile calls
app.get('/api/dashboard-stats', analyticsController.getDashboardStats);
app.get('/api/complaints/geojson', analyticsController.getGeoJSON);

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found on Civic Core Service`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Core Service Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    service: 'civic-core-service',
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Civic Core Microservice running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;
