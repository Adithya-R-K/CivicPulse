const express = require('express');
const router = express.Router();
const {
  getIntegratedAnalyticsSummary,
  getDashboardStats,
  getGeoJSON,
  getDepartmentStats,
  getComplaintTrends,
  predictAI,
} = require('../controllers/analyticsController');

router.get('/summary', getIntegratedAnalyticsSummary);
router.get('/stats', getDashboardStats);
router.get('/trends', getComplaintTrends);
router.get('/geojson', getGeoJSON);
router.get('/departments', getDepartmentStats);
router.post('/predict', predictAI);

module.exports = router;
