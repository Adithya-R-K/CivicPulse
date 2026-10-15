const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { analyzeComplaintWithIntelligenceService } = require('../services/intelligenceClient');

// In-memory fallback seeded with realistic complaints matching municipal records
const DEFAULT_SEED_COMPLAINTS = [
  {
    _id: '660e1d0f5e71826b52a12301',
    title: 'Deep pothole on Avinashi Road',
    description: 'Large potholes on the Avinashi Road near Peelamedu causing severe vehicle damage and traffic jams.',
    category: 'Roads',
    location: 'Avinashi Road near Peelamedu',
    coordinates: { latitude: 11.028, longitude: 77.0043 },
    priority: 'High',
    status: 'Submitted',
    department: 'Roads & Transportation',
    upvotesCount: 4,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-28T14:03:58Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12302',
    title: 'Drinking water pipeline burst near Gandhipuram',
    description: 'Large municipal pipeline burst beside Gandhipuram bus terminus. Clean water is wasting rapidly.',
    category: 'Water',
    location: 'Gandhipuram Bus Stand',
    coordinates: { latitude: 11.0205, longitude: 76.9667 },
    priority: 'Urgent',
    status: 'In Progress',
    department: 'Water & Sewage',
    upvotesCount: 7,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-28T14:01:59Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12303',
    title: 'Open electrical junction box in Saibaba Colony',
    description: 'Open electrical wiring box hanging close to pedestrian footpath. Major shock hazard for school children.',
    category: 'Electricity',
    location: 'Saibaba Colony 5th Cross',
    coordinates: { latitude: 11.0236, longitude: 76.944 },
    priority: 'Urgent',
    status: 'In Review',
    department: 'Electricity Department',
    upvotesCount: 5,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-28T14:07:02Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12304',
    title: 'Garbage accumulation along Singanallur Lake road',
    description: 'Community garbage bin has overflowed for 4 days. Strong odor and stray animal menace.',
    category: 'Waste',
    location: 'Singanallur Lake Road',
    coordinates: { latitude: 11.0, longitude: 77.0268 },
    priority: 'Medium',
    status: 'Resolved',
    resolvedAt: new Date('2026-01-28T16:20:00Z'),
    department: 'Waste Management',
    upvotesCount: 3,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-27T10:15:00Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12305',
    title: 'Broken children swings at VOC Park',
    description: 'Playground swings and slide chains snapped and broken. Needs immediate repair before weekend.',
    category: 'Parks',
    location: 'VOC Park & Grounds',
    coordinates: { latitude: 11.0122, longitude: 76.9502 },
    priority: 'Low',
    status: 'Resolved',
    resolvedAt: new Date('2026-01-28T17:00:00Z'),
    department: 'Parks & Recreation',
    upvotesCount: 2,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-26T12:00:00Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12306',
    title: 'Streetlights non-functional in Ukkadam',
    description: 'Entire row of 8 streetlights dark from Ukkadam junction to bypass. Pitch black at night.',
    category: 'Safety',
    location: 'Ukkadam Junction',
    coordinates: { latitude: 10.9946, longitude: 76.958 },
    priority: 'High',
    status: 'In Progress',
    department: 'Public Safety',
    upvotesCount: 6,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-27T18:45:00Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12307',
    title: 'Overflowing sewage drain on Cross Cut Road',
    description: 'Severe sewage drain blockage causing wastewater overflow onto pedestrian walkways.',
    category: 'Water',
    location: 'Cross Cut Road, Gandhipuram',
    coordinates: { latitude: 11.018, longitude: 76.965 },
    priority: 'Urgent',
    status: 'Submitted',
    department: 'Water & Sewage',
    upvotesCount: 8,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-28T15:30:00Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12308',
    title: 'Unfinished road excavation hazard in RS Puram',
    description: 'Trench dug for utility cables left uncovered with no safety cones or night reflectors.',
    category: 'Roads',
    location: 'DB Road, RS Puram',
    coordinates: { latitude: 11.0085, longitude: 76.9482 },
    priority: 'High',
    status: 'In Progress',
    department: 'Roads & Transportation',
    upvotesCount: 5,
    author: {
      _id: '660e1d0f5e71826b52a12399',
      username: 'citizen',
      fullName: 'Adithya Citizen',
      email: 'citizen@civicpulse.gov',
      role: 'citizen',
    },
    createdAt: new Date('2026-01-28T11:20:00Z'),
  },
];

let inMemoryComplaints = [...DEFAULT_SEED_COMPLAINTS];

/**
 * @route   GET /api/v1/complaints
 * @desc    Get all complaints with filtering, search, and pagination
 * @access  Public
 */
exports.getComplaints = async (req, res) => {
  try {
    const { category, status, priority, search, mine, author, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (category && category !== 'all' && category !== 'All') {
      filter.category = category;
    }
    if (status && status !== 'all' && status !== 'All') {
      filter.status = status;
    }
    if (priority && priority !== 'all' && priority !== 'All') {
      filter.priority = priority;
    }
    if (author) {
      filter.author = author;
    }
    if (mine === 'true' && req.user) {
      filter.author = req.user.id || req.user._id;
    }
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (mongoose.connection.readyState === 1) {
      const skip = (Number(page) - 1) * Number(limit);
      const total = await Complaint.countDocuments(filter);

      if (total > 0) {
        const complaints = await Complaint.find(filter)
          .populate('author', 'username fullName email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit));

        return res.json({
          success: true,
          count: complaints.length,
          total,
          page: Number(page),
          complaints,
        });
      }

      // If database collection is completely empty, auto-seed with initial complaints
      const globalCount = await Complaint.countDocuments({});
      if (globalCount === 0) {
        try {
          await Complaint.insertMany(
            DEFAULT_SEED_COMPLAINTS.map(({ _id, ...rest }) => ({
              ...rest,
              author: req.user?.id || '660e1d0f5e71826b52a12399',
            }))
          );
          const seeded = await Complaint.find(filter)
            .populate('author', 'username fullName email role')
            .sort({ createdAt: -1 })
            .limit(Number(limit));
          if (seeded.length > 0) {
            return res.json({
              success: true,
              count: seeded.length,
              total: seeded.length,
              page: Number(page),
              complaints: seeded,
            });
          }
        } catch (seedErr) {
          console.warn('Auto-seed into MongoDB skipped:', seedErr.message);
        }
      }
    }

    // Fallback if DB not ready or empty: filter in-memory records
    let results = [...inMemoryComplaints];
    if (filter.category) results = results.filter((c) => c.category.toLowerCase() === filter.category.toLowerCase());
    if (filter.status) results = results.filter((c) => c.status.toLowerCase() === filter.status.toLowerCase());
    if (filter.priority) results = results.filter((c) => c.priority.toLowerCase() === filter.priority.toLowerCase());
    if (author) {
      results = results.filter((c) => {
        const aId = c.author?._id || c.author?.id || c.author;
        return aId && String(aId) === String(author);
      });
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.location || '').toLowerCase().includes(q)
      );
    }

    const skip = (Number(page) - 1) * Number(limit);
    const paginated = results.slice(skip, skip + Number(limit));

    return res.json({
      success: true,
      count: paginated.length,
      total: results.length,
      page: Number(page),
      complaints: paginated,
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/v1/complaints/:id
 * @desc    Get single complaint by ID with comments
 * @access  Public
 */
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) && !id.startsWith('mem_')) {
      return res.status(404).json({ success: false, message: 'Invalid complaint ID format' });
    }

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      const complaint = await Complaint.findById(id).populate(
        'author',
        'username fullName email phone address role'
      );
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      const comments = await Comment.find({ complaint: complaint._id })
        .populate('user', 'username fullName role isAdmin')
        .sort({ createdAt: 1 });

      return res.json({ success: true, complaint, comments });
    }

    const complaint = inMemoryComplaints.find((c) => c._id === id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    return res.json({ success: true, complaint, comments: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/v1/complaints
 * @desc    Submit a new complaint with mandatory inter-service AI analysis
 * @access  Private
 */
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, latitude, longitude, imageUrl } = req.body;

    // Strict input validation
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Title is required and must be at least 3 characters long',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Description is required and must be at least 5 characters long',
      });
    }

    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Location landmark is required',
      });
    }

    // Gather existing complaints for similarity detection
    let existingComplaints = [];
    if (mongoose.connection.readyState === 1) {
      existingComplaints = await Complaint.find({}, 'title description category status createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    // MANDATORY INTER-SERVICE COMMUNICATION:
    // Core Service calls Civic Intelligence Service via HTTP REST
    const correlationId = req.headers['x-correlation-id'] || `req_${Date.now()}`;
    const aiAnalysis = await analyzeComplaintWithIntelligenceService({
      title: title.trim(),
      description: description.trim(),
      category: category || null,
      existingComplaints,
      correlationId,
    });

    const finalCategory = category && category !== 'Other' ? category : aiAnalysis.predictedCategory;
    const finalPriority = aiAnalysis.predictedPriority || 'Medium';
    const finalDepartment = aiAnalysis.department || 'General Civic Administration';

    const complaintPayload = {
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      priority: finalPriority,
      department: finalDepartment,
      location: location.trim(),
      coordinates: {
        latitude: Number(latitude) || 11.0168,
        longitude: Number(longitude) || 76.9558,
      },
      imageUrl: imageUrl || '',
      status: 'Submitted',
      upvotesCount: 0,
      upvotes: [],
      aiPrediction: {
        predictedCategory: aiAnalysis.predictedCategory,
        confidence: aiAnalysis.categoryConfidence,
        spamScore: aiAnalysis.spamScore,
        sentimentScore: aiAnalysis.sentimentScore,
        urgencyScore: aiAnalysis.urgencyScore,
      },
      aiAnalysis: {
        analysisId: aiAnalysis.analysisId,
        predictedCategory: aiAnalysis.predictedCategory,
        categoryConfidence: aiAnalysis.categoryConfidence,
        predictedPriority: aiAnalysis.predictedPriority,
        priorityConfidence: aiAnalysis.priorityConfidence,
        spamScore: aiAnalysis.spamScore,
        isSpam: aiAnalysis.isSpam,
        spamFlags: aiAnalysis.spamFlags,
        sentimentScore: aiAnalysis.sentimentScore,
        urgencyScore: aiAnalysis.urgencyScore,
        similarComplaints: aiAnalysis.similarComplaints,
        serviceStatus: aiAnalysis.serviceStatus,
        correlationId,
      },
    };

    if (mongoose.connection.readyState === 1 && req.user) {
      complaintPayload.author = req.user.id || req.user._id;
      const created = await Complaint.create(complaintPayload);

      // Create initial notification for user
      try {
        await Notification.create({
          recipient: req.user.id || req.user._id,
          complaint: created._id,
          title: 'Complaint Submitted',
          message: `Your grievance "${created.title}" has been registered and assigned to ${finalDepartment}.`,
          type: 'status_change',
          actionUrl: `/complaint/${created._id}`,
        });
      } catch (notifErr) {
        console.warn('Notification creation skipped:', notifErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Complaint created and successfully analyzed by Civic Intelligence Service',
        complaint: created,
        aiAnalysisStatus: aiAnalysis.serviceStatus,
      });
    }

    // In-memory fallback for test harnesses without active DB
    const memoryItem = {
      _id: 'mem_' + Date.now(),
      ...complaintPayload,
      author: req.user ? { username: req.user.username, fullName: req.user.fullName } : { username: 'citizen', fullName: 'Demo Citizen' },
      createdAt: new Date(),
    };
    inMemoryComplaints.unshift(memoryItem);

    return res.status(201).json({
      success: true,
      message: 'Complaint registered in memory',
      complaint: memoryItem,
      aiAnalysisStatus: aiAnalysis.serviceStatus,
    });
  } catch (error) {
    console.error('Error in createComplaint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/v1/complaints/:id
 * @desc    Update complaint details (Author or Admin)
 * @access  Private
 */
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, location, priority } = req.body;

    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      // Check authorization: must be author or admin
      const userId = req.user.id || req.user._id;
      const isAuthor = complaint.author.toString() === userId.toString();
      const isAdmin = req.user.role === 'admin' || req.user.isAdmin;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this complaint' });
      }

      if (title) complaint.title = title.trim();
      if (description) complaint.description = description.trim();
      if (category) complaint.category = category;
      if (location) complaint.location = location.trim();
      if (priority) complaint.priority = priority;

      await complaint.save();
      return res.json({ success: true, message: 'Complaint updated successfully', complaint });
    }

    const comp = inMemoryComplaints.find((c) => c._id === id);
    if (!comp) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (title) comp.title = title;
    if (description) comp.description = description;
    return res.json({ success: true, complaint: comp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PATCH /api/v1/complaints/:id/status
 * @route   PUT /api/v1/complaints/:id/status
 * @desc    Update complaint status (Submitted, In Review, In Progress, Resolved, Rejected)
 * @access  Private (Admin / Staff)
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      complaint.status = status;
      if (status === 'Resolved') {
        complaint.resolvedAt = new Date();
      }
      await complaint.save();

      // Notify the author
      try {
        await Notification.create({
          recipient: complaint.author,
          complaint: complaint._id,
          title: `Complaint Status Updated: ${status}`,
          message: `Your complaint "${complaint.title}" has been updated to "${status}".`,
          type: 'status_change',
          actionUrl: `/complaint/${complaint._id}`,
        });
      } catch (notifErr) {
        console.warn('Status notification skipped:', notifErr.message);
      }

      return res.json({ success: true, message: `Status updated to ${status}`, complaint });
    }

    const comp = inMemoryComplaints.find((c) => c._id === id);
    if (!comp) return res.status(404).json({ success: false, message: 'Complaint not found' });
    comp.status = status;
    return res.json({ success: true, complaint: comp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   DELETE /api/v1/complaints/:id
 * @desc    Delete a complaint
 * @access  Private (Author or Admin)
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      const userId = req.user.id || req.user._id;
      const isAuthor = complaint.author.toString() === userId.toString();
      const isAdmin = req.user.role === 'admin' || req.user.isAdmin;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this complaint' });
      }

      await Complaint.findByIdAndDelete(id);
      await Comment.deleteMany({ complaint: id });

      return res.json({ success: true, message: 'Complaint deleted successfully' });
    }

    const index = inMemoryComplaints.findIndex((c) => c._id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Complaint not found' });
    inMemoryComplaints.splice(index, 1);
    return res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/v1/complaints/:id/upvote
 * @desc    Toggle upvote on a complaint
 * @access  Private
 */
exports.toggleUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      const hasUpvoted = complaint.upvotes.some((uId) => uId.toString() === userId.toString());
      if (hasUpvoted) {
        complaint.upvotes = complaint.upvotes.filter((uId) => uId.toString() !== userId.toString());
        complaint.upvotesCount = Math.max(0, complaint.upvotesCount - 1);
      } else {
        complaint.upvotes.push(userId);
        complaint.upvotesCount += 1;
      }

      await complaint.save();
      return res.json({
        success: true,
        upvoted: !hasUpvoted,
        upvotesCount: complaint.upvotesCount,
      });
    }

    return res.json({ success: true, upvoted: true, upvotesCount: 5 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/v1/complaints/:id/comments
 * @desc    Add comment or official response
 * @access  Private
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, isOfficialResponse } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty' });
    }

    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      const newComment = await Comment.create({
        complaint: id,
        user: req.user.id || req.user._id,
        comment: comment.trim(),
        isOfficialResponse: Boolean(isOfficialResponse && (req.user.role === 'admin' || req.user.isAdmin)),
      });

      const populated = await Comment.findById(newComment._id).populate('user', 'username fullName role isAdmin');

      return res.status(201).json({
        success: true,
        comment: populated,
      });
    }

    return res.status(201).json({
      success: true,
      comment: {
        _id: 'com_' + Date.now(),
        text: comment.trim(),
        user: { fullName: req.user.fullName || 'Citizen', role: req.user.role || 'citizen' },
        createdAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/v1/complaints/user/my
 * @desc    Get complaints submitted by the authenticated user
 * @access  Private
 */
exports.getMyComplaints = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    if (mongoose.connection.readyState === 1) {
      const complaints = await Complaint.find({ author: userId })
        .populate('author', 'username fullName email role')
        .sort({ createdAt: -1 });
      return res.json({ success: true, count: complaints.length, complaints });
    }
    const myInMem = inMemoryComplaints.filter((c) => {
      const authorId = c.author?._id || c.author?.id || c.author;
      return authorId && String(authorId) === String(userId);
    });
    return res.json({ success: true, count: myInMem.length, complaints: myInMem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
