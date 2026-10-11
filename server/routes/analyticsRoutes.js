const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getGeoJSON,
  getDepartmentStats,
  predictAI,
} = require('../controllers/analyticsController');

router.get('/stats', getDashboardStats);
router.get('/geojson', getGeoJSON);
router.get('/departments', getDepartmentStats);
router.post('/predict', predictAI);

module.exports = router;
