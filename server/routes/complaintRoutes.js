const express = require('express');
const router = express.Router();
const {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  updateComplaintStatus,
  deleteComplaint,
  toggleUpvote,
  addComment,
  getMyComplaints,
} = require('../controllers/complaintController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getComplaints);
router.post('/', protect, createComplaint);
router.get('/user/my', protect, getMyComplaints);
router.get('/:id', getComplaintById);
router.put('/:id', protect, updateComplaint);
router.put('/:id/status', protect, adminOnly, updateComplaintStatus);
router.patch('/:id/status', protect, adminOnly, updateComplaintStatus);
router.post('/:id/upvote', protect, toggleUpvote);
router.post('/:id/comments', protect, addComment);
router.delete('/:id', protect, deleteComplaint);

module.exports = router;
