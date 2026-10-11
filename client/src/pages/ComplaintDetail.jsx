import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  Clock,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Send,
  User,
  ArrowLeft,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const STATUSES = ['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'];

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const fetchComplaint = async () => {
    try {
      const { data } = await API.get(`/complaints/${id}`);
      if (data.success) {
        setComplaint(data.complaint);
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Error fetching complaint details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) {
      alert('Please log in to upvote complaints');
      return;
    }
    try {
      const { data } = await API.post(`/complaints/${id}/upvote`);
      if (data.success) {
        setComplaint((prev) => ({
          ...prev,
          upvotesCount: data.upvotesCount,
          upvotes: data.upvoted
            ? [...(prev.upvotes || []), user.id || user._id]
            : (prev.upvotes || []).filter((uId) => uId !== (user.id || user._id)),
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    if (!user) {
      alert('Please log in to leave a response');
      return;
    }

    setSubmittingComment(true);
    try {
      const { data } = await API.post(`/complaints/${id}/comments`, {
        comment: newComment.trim(),
        isOfficialResponse: isAdmin,
      });

      if (data.success) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const { data } = await API.put(`/complaints/${id}/status`, {
        status: newStatus,
      });
      if (data.success) {
        setComplaint((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading grievance details...</div>;
  }

  if (!complaint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Complaint Not Found</h2>
        <Link to="/" className="text-blue-600 font-bold hover:underline">
          &larr; Return to Public Feed
        </Link>
      </div>
    );
  }

  const hasUpvoted = user && complaint.upvotes?.includes(user.id || user._id);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm"
        >
          <i className="fas fa-arrow-left me-1"></i> Back
        </button>
        {user && (
          <button
            type="button"
            onClick={logout}
            className="btn btn-outline-danger btn-sm rounded-pill px-3 shadow-sm"
          >
            <i className="fas fa-sign-out-alt me-1"></i> Logout
          </button>
        )}
      </div>

      <div className="card border-0 shadow-sm p-4 p-md-5 mb-4" style={{ borderRadius: '20px' }}>
        {/* Header badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              {complaint.category}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white flex items-center space-x-1">
              <Flame className="h-3 w-3" />
              <span>{complaint.priority} Priority</span>
            </span>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            {complaint.status}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
          {complaint.title}
        </h1>

        {/* Author & Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>Reported by {complaint.author?.fullName || complaint.author?.username || 'Citizen'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>{complaint.location}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Description Body */}
        <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
          {complaint.description}
        </p>

        {/* Optional Image */}
        {complaint.imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-96">
            <img
              src={complaint.imageUrl}
              alt="Grievance Evidence"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* AI Analysis Card */}
        {complaint.aiPrediction && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2 text-xs">
            <h4 className="font-extrabold text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Automated Municipal Routing Intelligence</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">Routing Confidence</span>
                <span className="font-bold text-slate-700">
                  {Math.round((complaint.aiPrediction.confidence || 0.8) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Assigned Dept</span>
                <span className="font-bold text-slate-700">{complaint.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Spam Risk</span>
                <span className="font-bold text-emerald-600">Low (Clean)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">SLA Target</span>
                <span className="font-bold text-slate-700">24-48 Hours</span>
              </div>
            </div>
          </div>
        )}

        {/* Upvote Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleUpvote}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl border font-bold text-xs transition ${
              hasUpvoted
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{hasUpvoted ? 'Upvoted by You' : 'Upvote Issue'}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">
              {complaint.upvotesCount || complaint.upvotes?.length || 0}
            </span>
          </button>
        </div>

        {/* Admin Status Switcher */}
        {isAdmin && (
          <div className="pt-6 border-t border-slate-200 space-y-3 bg-amber-50/50 p-4 rounded-2xl border">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <span>Admin Action: Update Grievance Status</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((st) => (
                <button
                  key={st}
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    complaint.status === st
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Discussion Thread */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span>Responses & Community Discussion ({comments.length})</span>
        </h3>

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No replies yet. Be the first to share an update or follow-up note!
            </p>
          ) : (
            comments.map((cm) => (
              <div
                key={cm._id}
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  cm.isOfficialResponse
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">
                      {cm.user?.fullName || cm.user?.username || 'Citizen'}
                    </span>
                    {cm.isOfficialResponse && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                        Official Response
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(cm.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{cm.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            required
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              user ? 'Write a municipal response or community update...' : 'Please log in to comment...'
            }
            disabled={!user || submittingComment}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!user || submittingComment || !newComment.trim()}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
          >
            <span>Reply</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ComplaintDetail;
