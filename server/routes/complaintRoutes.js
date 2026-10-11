const express = require('express');
const router = express.Router();
const {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaintStatus,
  toggleUpvote,
  addComment,
  deleteComplaint,
} = require('../controllers/complaintController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getComplaints);
router.post('/', protect, createComplaint);
router.get('/:id', getComplaintById);
router.put('/:id/status', protect, adminOnly, updateComplaintStatus);
router.post('/:id/upvote', protect, toggleUpvote);
router.post('/:id/comments', protect, addComment);
router.delete('/:id', protect, deleteComplaint);

module.exports = router;
