const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const { analyzeComplaint } = require('../utils/aiHelper');

const DEFAULT_COMPLAINTS = [
  {
    _id: '660e1d0f5e71826b52a12301',
    title: 'Deep pothole on Avinashi Road',
    description: 'Large potholes on the Avinashi Road near Peelamedu causing severe vehicle damage and traffic jams.',
    category: 'Roads',
    location: 'Avinashi Road near Peelamedu',
    coordinates: { latitude: 11.0280, longitude: 77.0043 },
    priority: 'High',
    status: 'Submitted',
    department: 'Roads & Transportation',
    upvotesCount: 4,
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
    createdAt: new Date('2026-01-28T14:07:02Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12304',
    title: 'Garbage not cleared near Singanallur Lake',
    description: 'Garbage has been piled up for several days near Singanallur Lake Road, causing foul smell.',
    category: 'Waste',
    location: 'Singanallur Lake Road',
    coordinates: { latitude: 11.0000, longitude: 77.0268 },
    priority: 'Medium',
    status: 'Resolved',
    department: 'Waste Management',
    upvotesCount: 3,
    createdAt: new Date('2026-01-28T14:07:34Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12305',
    title: 'Broken playground equipment at VOC Park',
    description: 'Playground equipment in VOC Park is damaged and unsafe for children.',
    category: 'Parks',
    location: 'VOC Park & Grounds',
    coordinates: { latitude: 11.0122, longitude: 76.9502 },
    priority: 'Low',
    status: 'Resolved',
    department: 'Parks & Recreation',
    upvotesCount: 2,
    createdAt: new Date('2026-01-28T14:08:09Z'),
  },
  {
    _id: '660e1d0f5e71826b52a12306',
    title: 'Streetlight not working near Ukkadam',
    description: 'Multiple streetlights are not functioning near Ukkadam junction, making the area unsafe at night.',
    category: 'Safety',
    location: 'Ukkadam Junction',
    coordinates: { latitude: 10.9946, longitude: 76.9580 },
    priority: 'High',
    status: 'In Progress',
    department: 'Public Safety',
    upvotesCount: 6,
    createdAt: new Date('2026-01-28T15:41:58Z'),
  },
];

// @route   GET /api/analytics/stats
exports.getDashboardStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const totalComplaints = await Complaint.countDocuments();
      const resolved = await Complaint.countDocuments({ status: 'Resolved' });
      const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
      const submitted = await Complaint.countDocuments({ status: 'Submitted' });

      return res.json({
        success: true,
        total_complaints: totalComplaints,
        resolved,
        in_progress: inProgress,
        pending: submitted,
        resolution_rate: totalComplaints > 0 ? Number(((resolved / totalComplaints) * 100).toFixed(1)) : 0,
      });
    }

    // Default stats
    res.json({
      success: true,
      total_complaints: 18,
      resolved: 8,
      in_progress: 2,
      pending: 8,
      resolution_rate: 44.4,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/analytics/geojson
exports.getGeoJSON = async (req, res) => {
  try {
    let complaints = DEFAULT_COMPLAINTS;
    if (mongoose.connection.readyState === 1) {
      complaints = await Complaint.find();
    }

    const features = complaints.map((c) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [c.coordinates.longitude, c.coordinates.latitude],
      },
      properties: {
        id: c._id,
        title: c.title,
        description: c.description ? c.description.substring(0, 80) + '...' : '',
        category: c.category,
        priority: c.priority,
        status: c.status,
        location: c.location,
        date: c.createdAt,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/analytics/departments
exports.getDepartmentStats = async (req, res) => {
  res.json({
    success: true,
    departments: [
      { _id: '1', name: 'Roads & Transportation', email: 'roads@city.gov', slaHours: 48 },
      { _id: '2', name: 'Water & Sewage', email: 'water@city.gov', slaHours: 24 },
      { _id: '3', name: 'Electricity Department', email: 'power@city.gov', slaHours: 12 },
      { _id: '4', name: 'Waste Management', email: 'waste@city.gov', slaHours: 72 },
      { _id: '5', name: 'Parks & Recreation', email: 'parks@city.gov', slaHours: 120 },
      { _id: '6', name: 'Public Safety', email: 'safety@city.gov', slaHours: 6 },
    ],
  });
};

// @route   POST /api/ai/predict
exports.predictAI = async (req, res) => {
  try {
    const { title, description } = req.body;
    const prediction = analyzeComplaint(title || '', description || '');
    res.json({ success: true, prediction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
