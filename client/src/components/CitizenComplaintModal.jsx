import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  MapPin,
  Clock,
  Building,
  ThumbsUp,
  MessageSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Flame,
  Layers,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PIPELINE_STAGES = [
  { key: 'Submitted', label: '1. Submitted', desc: 'Registered in City Database' },
  { key: 'In Review', label: '2. Under Review', desc: 'AI Categorized & Validated' },
  { key: 'In Progress', label: '3. In Progress', desc: 'Assigned to Municipal Team' },
  { key: 'Resolved', label: '4. Resolved', desc: 'Issue Addressed on Ground' },
];

const CitizenComplaintModal = ({ complaint, isOpen, onClose, onUpdate }) => {
  if (!isOpen || !complaint) return null;

  const { user } = useAuth();
  const [details, setDetails] = useState(complaint);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvotes, setUpvotes] = useState(complaint.upvotesCount || complaint.upvotes?.length || 0);
  const [hasUpvoted, setHasUpvoted] = useState(
    user ? complaint.upvotes?.includes(user.id || user._id) : false
  );
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    setDetails(complaint);
    setUpvotes(complaint.upvotesCount || complaint.upvotes?.length || 0);
    setHasUpvoted(user ? complaint.upvotes?.includes(user.id || user._id) : false);
    fetchDetails(complaint._id);
  }, [complaint._id]);

  const fetchDetails = async (id) => {
    setLoadingComments(true);
    try {
      const { data } = await API.get(`/complaints/${id}`);
      if (data.success && data.complaint) {
        setDetails(data.complaint);
        setComments(data.comments || []);
        setUpvotes(data.complaint.upvotesCount || (data.complaint.upvotes && data.complaint.upvotes.length) || 0);
        if (user) {
          setHasUpvoted(data.complaint.upvotes?.includes(user.id || user._id));
        }
      }
    } catch (err) {
      console.warn('Could not fetch complaint comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) {
      alert('Please log in to upvote');
      return;
    }
    setUpvoting(true);
    try {
      const { data } = await API.post(`/complaints/${details._id}/upvote`);
      if (data.success) {
        setUpvotes(data.upvotesCount);
        setHasUpvoted(data.upvoted);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpvoting(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const { data } = await API.post(`/complaints/${details._id}/comments`, {
        comment: newComment.trim(),
      });
      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Determine active stage index
  const stageKeys = ['Submitted', 'In Review', 'In Progress', 'Resolved'];
  const currentStageIndex = stageKeys.indexOf(details.status);

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          
          {/* HEADER */}
          <div className="modal-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-3 py-1.5 rounded-pill font-monospace small">
                #{details._id.slice(-6).toUpperCase()}
              </span>
              <h5 className="modal-title fw-bold text-dark mb-0 text-truncate" style={{ maxWidth: '480px' }}>
                {details.title}
              </h5>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center"
              onClick={onClose}
              style={{ width: '34px', height: '34px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* BODY */}
          <div className="modal-body p-4 bg-light">
            
            {/* RESOLUTION PROGRESS PIPELINE */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white p-3">
              <div className="card-body p-1">
                <span className="text-muted small text-uppercase fw-bold d-block mb-3">
                  Resolution Lifecycle Progress
                </span>

                <div className="row text-center g-2 position-relative">
                  {PIPELINE_STAGES.map((stg, idx) => {
                    const isCompleted = currentStageIndex >= idx;
                    const isCurrent = currentStageIndex === idx;

                    return (
                      <div key={stg.key} className="col-3">
                        <div
                          className={`p-2 rounded-3 border transition-all ${
                            isCurrent
                              ? 'bg-primary-subtle border-primary text-primary fw-bold shadow-sm'
                              : isCompleted
                              ? 'bg-success-subtle border-success text-success'
                              : 'bg-light text-muted border-secondary-subtle'
                          }`}
                        >
                          <div className="d-flex justify-content-center mb-1">
                            {isCompleted ? (
                              <CheckCircle2 size={20} className={isCurrent ? 'text-primary' : 'text-success'} />
                            ) : (
                              <div
                                className="rounded-circle border border-2 border-secondary"
                                style={{ width: '18px', height: '18px' }}
                              ></div>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem' }}>{stg.label}</div>
                          <small
                            className="d-none d-md-block text-muted"
                            style={{ fontSize: '0.68rem', lineHeight: '1.2' }}
                          >
                            {stg.desc}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BADGES & UPVOTE BAR */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span
                  className={`badge px-3 py-1.5 rounded-pill ${
                    details.status === 'Resolved'
                      ? 'bg-success'
                      : details.status === 'In Progress'
                      ? 'bg-warning text-dark'
                      : 'bg-primary'
                  }`}
                >
                  Status: {details.status}
                </span>

                <span
                  className={`badge px-3 py-1.5 rounded-pill ${
                    details.priority === 'Urgent'
                      ? 'bg-danger'
                      : details.priority === 'High'
                      ? 'bg-warning text-dark'
                      : 'bg-info text-dark'
                  }`}
                >
                  {details.priority === 'Urgent' && <Flame size={14} className="me-1 inline" />}
                  {details.priority} Priority
                </span>

                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1.5 rounded-pill">
                  {details.category}
                </span>
              </div>

              {/* Upvote Button */}
              <button
                type="button"
                onClick={handleUpvote}
                disabled={upvoting}
                className={`btn btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center gap-1.5 ${
                  hasUpvoted ? 'btn-primary' : 'btn-outline-primary'
                }`}
              >
                <ThumbsUp size={15} />
                <span>{hasUpvoted ? 'Upvoted' : 'Upvote Issue'}</span>
                <span className="badge bg-light text-dark rounded-pill ms-1">{upvotes}</span>
              </button>
            </div>

            {/* GRIEVANCE DETAILS CARD */}
            <div className="card border-0 shadow-sm rounded-4 mb-3 bg-white p-4">
              <div className="card-body p-0">
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  Description
                </h6>
                <p className="text-secondary mb-3" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                  {details.description}
                </p>

                {/* Location & Department */}
                <div className="row g-3 pt-3 border-top">
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center gap-2 text-muted small">
                      <MapPin size={16} className="text-danger flex-shrink-0" />
                      <span>{details.location}</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center gap-2 text-muted small">
                      <Building size={16} className="text-primary flex-shrink-0" />
                      <span>Assigned: <strong>{details.department || 'Municipal Department'}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PHOTO EVIDENCE (if present) */}
            {details.imageUrl && (
              <div className="card border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden">
                <div className="card-header bg-white py-2 px-3 border-bottom small fw-bold text-muted">
                  Attached Photo Evidence
                </div>
                <div className="p-3 text-center bg-dark">
                  <img
                    src={details.imageUrl}
                    alt={details.title}
                    className="img-fluid rounded-3"
                    style={{ maxHeight: '280px', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}

            {/* OFFICIAL MUNICIPAL RESPONSES & COMMUNITY COMMENTS */}
            <div className="card border-0 shadow-sm rounded-4 bg-white p-3 mb-2">
              <div className="card-body p-1">
                <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <MessageSquare size={18} className="text-info" />
                  Official Responses &amp; Updates ({comments.length})
                </h6>

                {/* Comments List */}
                <div
                  className="space-y-2 mb-3 pe-1"
                  style={{ maxHeight: '180px', overflowY: 'auto' }}
                >
                  {comments.length === 0 ? (
                    <p className="text-muted small text-center my-3">
                      No official notes or comments recorded yet. Municipal authorities will update this thread as work progresses.
                    </p>
                  ) : (
                    comments.map((comm) => (
                      <div
                        key={comm._id || comm.id}
                        className={`p-3 rounded-3 mb-2 small ${
                          comm.isOfficialResponse
                            ? 'bg-primary-subtle text-primary-emphasis border border-primary-subtle'
                            : 'bg-light text-dark border'
                        }`}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold d-flex align-items-center gap-1.5">
                            {comm.isOfficialResponse ? (
                              <>
                                <ShieldCheck size={16} className="text-primary" />
                                <span>Official Municipal Update</span>
                              </>
                            ) : (
                              <>
                                <User size={14} className="text-muted" />
                                <span>{comm.user?.fullName || comm.user?.username || 'Citizen'}</span>
                              </>
                            )}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {comm.createdAt ? new Date(comm.createdAt).toLocaleString() : 'Recent'}
                          </span>
                        </div>
                        <p className="mb-0 text-secondary">{comm.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handlePostComment}>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Add an update or question about this grievance..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="form-control form-control-sm"
                      disabled={submittingComment}
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="btn btn-sm btn-primary px-3"
                    >
                      {submittingComment ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <>
                          <Send size={14} className="me-1 inline" /> Send
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <div className="modal-footer bg-white border-top py-2 px-4 d-flex justify-content-between">
            <Link
              to={`/complaint/${details._id}`}
              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            >
              <ExternalLink size={14} className="me-1 inline" /> Open Full Page
            </Link>
            <button
              type="button"
              className="btn btn-secondary rounded-pill px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CitizenComplaintModal;
