const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: [
        'Roads',
        'Water',
        'Electricity',
        'Waste',
        'Parks',
        'Safety',
        'Construction',
        'Other',
      ],
      default: 'Roads',
    },
    subcategory: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      required: [true, 'Please specify the location or landmark'],
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        default: 11.0168, // Default to Coimbatore
      },
      longitude: {
        type: Number,
        default: 76.9558,
      },
    },
    status: {
      type: String,
      enum: ['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Submitted',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvotesCount: {
      type: Number,
      default: 0,
    },
    department: {
      type: String,
      default: 'Roads & Transportation',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    aiPrediction: {
      predictedCategory: String,
      confidence: Number,
      spamScore: Number,
      sentimentScore: Number,
      urgencyScore: Number,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search & geospatial queries
complaintSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Complaint', complaintSchema);
