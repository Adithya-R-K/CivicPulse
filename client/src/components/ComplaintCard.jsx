import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ThumbsUp,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_COLORS = {
  Roads: 'bg-amber-50 text-amber-700 border-amber-200',
  Water: 'bg-sky-50 text-sky-700 border-sky-200',
  Electricity: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Waste: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Parks: 'bg-green-50 text-green-700 border-green-200',
  Safety: 'bg-rose-50 text-rose-700 border-rose-200',
  Construction: 'bg-purple-50 text-purple-700 border-purple-200',
  Other: 'bg-slate-50 text-slate-700 border-slate-200',
};

const PRIORITY_BADGES = {
  Urgent: 'bg-red-500 text-white',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-blue-500 text-white',
  Low: 'bg-slate-400 text-white',
};

const STATUS_BADGES = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  'In Review': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
  Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
};

const ComplaintCard = ({ complaint, onUpdate }) => {
  const { user } = useAuth();
  const [upvotes, setUpvotes] = useState(complaint.upvotesCount || complaint.upvotes?.length || 0);
  const [hasUpvoted, setHasUpvoted] = useState(
    user ? complaint.upvotes?.includes(user.id || user._id) : false
  );
  const [loadingUpvote, setLoadingUpvote] = useState(false);

  const handleUpvote = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to upvote complaints');
      return;
    }
    setLoadingUpvote(true);
    try {
      const { data } = await API.post(`/complaints/${complaint._id}/upvote`);
      if (data.success) {
        setUpvotes(data.upvotesCount);
        setHasUpvoted(data.upvoted);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Upvote failed:', err);
    } finally {
      setLoadingUpvote(false);
    }
  };

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                CATEGORY_COLORS[complaint.category] || CATEGORY_COLORS.Other
              }`}
            >
              {complaint.category}
            </span>

            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                PRIORITY_BADGES[complaint.priority] || PRIORITY_BADGES.Medium
              }`}
            >
              {complaint.priority === 'Urgent' && <Flame className="h-3 w-3 inline" />}
              <span>{complaint.priority}</span>
            </span>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              STATUS_BADGES[complaint.status] || STATUS_BADGES.Submitted
            }`}
          >
            {complaint.status}
          </span>
        </div>

        {/* Title */}
        <Link to={`/complaint/${complaint._id}`} className="block">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
            {complaint.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
          {complaint.description}
        </p>

        {/* Location Landmark */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-3 font-medium">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{complaint.location}</span>
        </div>
      </div>

      {/* Footer Meta & Actions */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpvote}
            disabled={loadingUpvote}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border font-semibold transition ${
              hasUpvoted
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'hover:bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvoted ? 'fill-blue-600' : ''}`} />
            <span>{upvotes}</span>
          </button>

          <span className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{formattedDate}</span>
          </span>
        </div>

        <Link
          to={`/complaint/${complaint._id}`}
          className="flex items-center space-x-1 text-blue-600 font-semibold hover:text-blue-700 transition"
        >
          <span>Details</span>
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </div>
  );
};

export default ComplaintCard;
