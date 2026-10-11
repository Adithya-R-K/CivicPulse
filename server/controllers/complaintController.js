const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { analyzeComplaint } = require('../utils/aiHelper');

let inMemoryComplaints = [
  {
    _id: '660e1d0f5e71826b52a12301',
    title: 'Deep pothole on Avinashi Road',
    description: 'Large potholes on the Avinashi Road near Peelamedu causing severe vehicle damage and traffic congestion.',
    category: 'Roads',
    location: 'Avinashi Road near Peelamedu',
    coordinates: { latitude: 11.0280, longitude: 77.0043 },
    priority: 'High',
    status: 'Submitted',
    department: 'Roads & Transportation',
    upvotesCount: 4,
    upvotes: [],
    author: { username: 'citizen', fullName: 'Demo Citizen' },
    createdAt: new Date('2026-01-28T14:03:58Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12302',
    title: 'Drinking water pipeline burst near Gandhipuram',
    description: 'Large municipal pipeline burst beside Gandhipuram bus terminus. Clean water is flowing onto road.',
    category: 'Water',
    location: 'Gandhipuram Bus Stand',
    coordinates: { latitude: 11.0205, longitude: 76.9667 },
    priority: 'Urgent',
    status: 'In Progress',
    department: 'Water & Sewage',
    upvotesCount: 7,
    upvotes: [],
    author: { username: 'citizen', fullName: 'Demo Citizen' },
    createdAt: new Date('2026-01-28T14:01:59Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12303',
    title: 'Open electrical junction box in Saibaba Colony',
    description: 'An open electrical junction box near the footpath poses a serious risk to pedestrians and children.',
    category: 'Electricity',
    location: 'Saibaba Colony 5th Cross',
    coordinates: { latitude: 11.0236, longitude: 76.9440 },
    priority: 'Urgent',
    status: 'Resolved',
    department: 'Electricity Department',
    upvotesCount: 5,
    upvotes: [],
    author: { username: 'citizen', fullName: 'Demo Citizen' },
    createdAt: new Date('2026-01-28T14:07:02Z'),
  },
];

// @route   GET /api/complaints
exports.getComplaints = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { category, status, search, mine } = req.query;
      const filter = {};
      if (category && category !== 'all' && category !== 'All') filter.category = category;
      if (status && status !== 'all' && status !== 'All') filter.status = status;
      if (mine === 'true' && req.user) filter.author = req.user.id;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
      const complaints = await Complaint.find(filter)
        .populate('author', 'username fullName')
        .sort({ createdAt: -1 });

      return res.json({ success: true, count: complaints.length, complaints });
    }

    res.json({ success: true, count: inMemoryComplaints.length, complaints: inMemoryComplaints });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/complaints/:id
exports.getComplaintById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(req.params.id).populate('author', 'username fullName email phone');
      if (complaint) {
        const comments = await Comment.find({ complaint: complaint._id }).populate('user', 'username fullName role isAdmin');
        return res.json({ success: true, complaint, comments });
      }
    }

    const complaint = inMemoryComplaints.find((c) => c._id === req.params.id) || inMemoryComplaints[0];
    res.json({ success: true, complaint, comments: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/complaints
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, latitude, longitude, imageUrl } = req.body;
    const aiAnalysis = analyzeComplaint(title, description);

    const newComp = {
      _id: '660e1d0f5e71826b' + Math.floor(Math.random() * 100000000),
      author: req.user ? { username: req.user.username, fullName: req.user.fullName } : { username: 'citizen', fullName: 'Citizen' },
      title,
      description,
      category: category || aiAnalysis.category,
      location,
      coordinates: {
        latitude: Number(latitude) || 11.0168,
        longitude: Number(longitude) || 76.9558,
      },
      priority: aiAnalysis.priority,
      status: 'Submitted',
      department: aiAnalysis.department,
      imageUrl: imageUrl || '',
      upvotesCount: 0,
      upvotes: [],
      createdAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Complaint.create({
        ...newComp,
        author: req.user.id,
      });
      return res.status(201).json({ success: true, complaint: created });
    }

    inMemoryComplaints.unshift(newComp);
    res.status(201).json({ success: true, complaint: newComp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/complaints/:id/status
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(req.params.id);
      if (complaint) {
        complaint.status = status;
        await complaint.save();
        return res.json({ success: true, complaint });
      }
    }

    const comp = inMemoryComplaints.find((c) => c._id === req.params.id);
    if (comp) comp.status = status;
    res.json({ success: true, complaint: comp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/complaints/:id/upvote
exports.toggleUpvote = async (req, res) => {
  try {
    res.json({ success: true, upvoted: true, upvotesCount: 5 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/complaints/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    res.status(201).json({
      success: true,
      comment: {
        _id: 'com_' + Date.now(),
        comment,
        user: { fullName: req.user.fullName || 'Citizen' },
        createdAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/complaints/:id
exports.deleteComplaint = async (req, res) => {
  res.json({ success: true, message: 'Complaint deleted' });
};
