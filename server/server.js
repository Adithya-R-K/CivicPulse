const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');

// Route files
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'CivicPulse MERN Backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Compatibility route mounts if reverse proxy / Vercel rewrite strips prefix
app.use('/auth', authRoutes);
app.use('/complaints', complaintRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/chat', chatRoutes);
app.use('/notifications', notificationRoutes);

// Backward-compatibility endpoints matching old frontend/mobile calls
app.get('/api/dashboard-stats', async (req, res) => {
  const analyticsController = require('./controllers/analyticsController');
  return analyticsController.getDashboardStats(req, res);
});
app.get('/api/complaints/geojson', async (req, res) => {
  const analyticsController = require('./controllers/analyticsController');
  return analyticsController.getGeoJSON(req, res);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 CivicPulse Express Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
