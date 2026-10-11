const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getAllUsers,
  toggleAdmin,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/toggle-admin', protect, adminOnly, toggleAdmin);

module.exports = router;
