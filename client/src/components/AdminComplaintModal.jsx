import React, { useState, useEffect } from 'react';
import API from '../services/api';
import {
  X,
  MapPin,
  Clock,
  User,
  Mail,
  Building,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
  Send,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Check,
  Flame,
  Layers,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_OPTIONS = ['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'];

const AdminComplaintModal = ({
  complaint,
  isOpen,
  onClose,
  onStatusUpdate,
  onDelete,
}) => {
  if (!isOpen || !complaint) return null;

  const [details, setDetails] = useState(complaint);
  const [comments, setComments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(complaint.status || 'Submitted');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [officialRemark, setOfficialRemark] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setDetails(complaint);
    setSelectedStatus(complaint.status || 'Submitted');
    fetchFullDetails(complaint._id);
  }, [complaint._id]);

  const fetchFullDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const { data } = await API.get(`/complaints/${id}`);
      if (data.success && data.complaint) {
        setDetails(data.complaint);
        setSelectedStatus(data.complaint.status);
        setComments(data.comments || []);
      }
    } catch (err) {
      console.warn('Could not fetch additional complaint details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (selectedStatus === details.status) return;
    setUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await onStatusUpdate(details._id, selectedStatus);
      setDetails((prev) => ({ ...prev, status: selectedStatus }));
      setStatusMessage({ type: 'success', text: `Status updated to "${selectedStatus}"` });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      setStatusMessage({ type: 'danger', text: 'Failed to update status' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostOfficialRemark = async (e) => {
    e.preventDefault();
    if (!officialRemark.trim() || submittingRemark) return;

    setSubmittingRemark(true);
    try {
      const { data } = await API.post(`/complaints/${details._id}/comments`, {
        comment: officialRemark.trim(),
        isOfficialResponse: true,
      });

      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setOfficialRemark('');
        setStatusMessage({ type: 'success', text: 'Official response dispatched to citizen!' });
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err) {
      console.error('Error posting official remark:', err);
      setStatusMessage({ type: 'danger', text: 'Failed to post official response' });
    } finally {
      setSubmittingRemark(false);
    }
  };

  const handleDeleteComplaint = async () => {
    try {
      await onDelete(details._id);
      onClose();
    } catch (err) {
      alert('Failed to delete complaint');
    }
  };

  const ai = details.aiAnalysis || details.aiPrediction || {};
  const categoryConfidence = Math.round(
    ((ai.categoryConfidence || ai.confidence || 0.85) * 100)
  );
  const priorityConfidence = Math.round(
    ((ai.priorityConfidence || 0.9) * 100)
  );
  const spamScore = Math.round(
    ((ai.spamScore !== undefined ? ai.spamScore : (ai.isSpam ? 0.85 : 0.05)) * 100)
  );
  const isSpam = ai.isSpam || spamScore > 50;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          
          {/* MODAL HEADER */}
          <div className="modal-header bg-dark text-white border-bottom border-secondary py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-3 py-2 rounded-pill font-monospace">
                #{details._id.slice(-6).toUpperCase()}
              </span>
              <h5 className="modal-title fw-bold mb-0 text-truncate" style={{ maxWidth: '650px' }}>
                {details.title}
              </h5>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-light rounded-circle p-2 d-flex align-items-center justify-content-center"
              onClick={onClose}
              style={{ width: '36px', height: '36px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* STATUS TOAST NOTIFICATION */}
          {statusMessage && (
            <div className={`alert alert-${statusMessage.type} mb-0 py-2 px-4 rounded-0 d-flex align-items-center gap-2`}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span className="small fw-semibold">{statusMessage.text}</span>
            </div>
          )}

          {/* MODAL BODY */}
          <div className="modal-body p-4 bg-light">
            <div className="row g-4">
              
              {/* LEFT COLUMN: Complaint Overview & Reporter Details */}
              <div className="col-lg-7">
                
                {/* Meta Badges Ribbon */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span
                    className={`badge px-3 py-2 rounded-pill ${
                      details.status === 'Resolved'
                        ? 'bg-success'
                        : details.status === 'In Progress'
                        ? 'bg-warning text-dark'
                        : details.status === 'Rejected'
                        ? 'bg-danger'
                        : 'bg-primary'
                    }`}
                  >
                    <i className="fas fa-circle me-1 small"></i>
                    Status: {details.status}
                  </span>

                  <span
                    className={`badge px-3 py-2 rounded-pill ${
                      details.priority === 'Urgent'
                        ? 'bg-danger'
                        : details.priority === 'High'
                        ? 'bg-warning text-dark'
                        : 'bg-secondary'
                    }`}
                  >
                    {details.priority === 'Urgent' && <Flame size={14} className="me-1 inline" />}
                    Priority: {details.priority}
                  </span>

                  <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-2 rounded-pill">
                    <Layers size={14} className="me-1 inline" />
                    Category: {details.category}
                  </span>

                  <span className="badge bg-light text-dark border px-3 py-2 rounded-pill">
                    <ThumbsUp size={14} className="me-1 inline text-primary" />
                    {details.upvotesCount || (details.upvotes && details.upvotes.length) || 0} Citizens Upvoted
                  </span>
                </div>

                {/* Description Card */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-body p-4">
                    <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                      <FileText size={18} className="text-primary" />
                      Grievance Description
                    </h6>
                    <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                      {details.description || 'No detailed description provided.'}
                    </p>
                  </div>
                </div>

                {/* Photo Evidence (if any) */}
                {details.imageUrl && (
                  <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                    <div className="card-header bg-white py-3 px-4 border-bottom">
                      <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                        <i className="fas fa-camera text-primary"></i> Attached Photo Evidence
                      </h6>
                    </div>
                    <div className="card-body p-3 text-center bg-dark">
                      <img
                        src={details.imageUrl}
                        alt={details.title}
                        className="img-fluid rounded-3 shadow-sm"
                        style={{ maxHeight: '320px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Citizen Reporter & Location Cards */}
                <div className="row g-3 mb-4">
                  {/* Reporter Box */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
                      <div className="card-body p-2">
                        <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                          <User size={16} className="text-primary" />
                          Citizen Reporter
                        </h6>
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '42px', height: '42px' }}
                          >
                            {(details.author?.fullName || details.author?.username || 'C')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">
                              {details.author?.fullName || 'Registered Citizen'}
                            </div>
                            <small className="text-muted d-block">
                              @{details.author?.username || 'anonymous'}
                            </small>
                            {details.author?.email && (
                              <small className="text-muted d-flex align-items-center gap-1">
                                <Mail size={12} /> {details.author.email}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location & Department */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
                      <div className="card-body p-2">
                        <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                          <MapPin size={16} className="text-danger" />
                          Location &amp; Routing
                        </h6>
                        <div className="mb-2">
                          <span className="fw-semibold text-dark">{details.location}</span>
                          {details.coordinates && (
                            <small className="text-muted d-block font-monospace">
                              {details.coordinates.latitude?.toFixed(4)},{' '}
                              {details.coordinates.longitude?.toFixed(4)}
                            </small>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 pt-2 border-top">
                          <Building size={14} className="text-secondary" />
                          <small className="text-dark fw-semibold">
                            Dept: {details.department || 'Municipal Corporation'}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submission Timestamp */}
                <div className="text-muted small d-flex align-items-center gap-2 px-1">
                  <Clock size={14} />
                  <span>Submitted on: {new Date(details.createdAt).toLocaleString()}</span>
                  {details.resolvedAt && (
                    <span className="ms-auto text-success fw-semibold">
                      Resolved: {new Date(details.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: AI Analysis & Admin Actions */}
              <div className="col-lg-5">
                
                {/* 1. CIVIC INTELLIGENCE ENGINE BREAKDOWN */}
                <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ background: '#f8fafc' }}>
                  <div className="card-header bg-white py-3 px-4 border-bottom rounded-top-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        AI Intelligence Diagnostics
                      </h6>
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                        REST Service Live
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    
                    {/* Category Confidence Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Category Classification</span>
                        <span className="fw-bold text-dark">
                          {ai.predictedCategory || details.category} ({categoryConfidence}%)
                        </span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-primary"
                          role="progressbar"
                          style={{ width: `${categoryConfidence}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Priority Urgency Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Predicted Priority</span>
                        <span className="fw-bold text-dark">
                          {ai.predictedPriority || details.priority} ({priorityConfidence}%)
                        </span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-warning"
                          role="progressbar"
                          style={{ width: `${priorityConfidence}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Spam & Sentiment Grid */}
                    <div className="row g-2 pt-2 border-top">
                      <div className="col-6">
                        <div className="p-2 border rounded-3 bg-white text-center">
                          <small className="text-muted d-block">Spam Probability</small>
                          <span className={`fw-bold ${isSpam ? 'text-danger' : 'text-success'}`}>
                            {isSpam ? '⚠️ Flagged' : '🛡️ Clean'} ({spamScore}%)
                          </span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 border rounded-3 bg-white text-center">
                          <small className="text-muted d-block">Citizen Sentiment</small>
                          <span className="fw-bold text-dark">
                            {ai.sentimentScore !== undefined
                              ? ai.sentimentScore < -0.2
                                ? '😠 Urgent/Frustrated'
                                : ai.sentimentScore > 0.2
                                ? '🙂 Satisfied'
                                : '😐 Neutral'
                              : '😐 Neutral'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {ai.correlationId && (
                      <div className="text-muted small mt-2 text-truncate font-monospace" style={{ fontSize: '0.72rem' }}>
                        Trace ID: {ai.correlationId}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. ADMIN STATUS WORKFLOW CONTROLLER */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-header bg-white py-3 px-4 border-bottom rounded-top-4">
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <CheckCircle2 size={18} className="text-success" />
                      Status Workflow Action
                    </h6>
                  </div>
                  <div className="card-body p-4">
                    <label className="form-label small fw-semibold text-muted">
                      Transition Complaint State:
                    </label>
                    <div className="input-group mb-3">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="form-select"
                        disabled={updatingStatus}
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleStatusChangeSubmit}
                        disabled={updatingStatus || selectedStatus === details.status}
                        className="btn btn-primary px-3"
                      >
                        {updatingStatus ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <>
                            <Check size={16} className="me-1 inline" /> Save
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick 1-Click State Buttons */}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatus('In Progress');
                          onStatusUpdate(details._id, 'In Progress');
                          setDetails((p) => ({ ...p, status: 'In Progress' }));
                        }}
                        disabled={details.status === 'In Progress'}
                        className="btn btn-sm btn-outline-warning rounded-pill flex-grow-1"
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatus('Resolved');
                          onStatusUpdate(details._id, 'Resolved');
                          setDetails((p) => ({ ...p, status: 'Resolved' }));
                        }}
                        disabled={details.status === 'Resolved'}
                        className="btn btn-sm btn-outline-success rounded-pill flex-grow-1"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. OFFICIAL MUNICIPAL RESPONSE & AUDIT LOG */}
                <div className="card border-0 shadow-sm rounded-4 mb-3">
                  <div className="card-header bg-white py-3 px-4 border-bottom rounded-top-4">
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <MessageSquare size={18} className="text-info" />
                      Official Response &amp; Citizen Audit Log ({comments.length})
                    </h6>
                  </div>
                  <div className="card-body p-3">
                    
                    {/* Existing Comments List */}
                    <div
                      className="space-y-3 mb-3 pe-1"
                      style={{ maxHeight: '180px', overflowY: 'auto' }}
                    >
                      {comments.length === 0 ? (
                        <p className="text-muted small text-center my-3">
                          No official responses or notes recorded yet.
                        </p>
                      ) : (
                        comments.map((comm) => (
                          <div
                            key={comm._id || comm.id}
                            className={`p-2 rounded-3 mb-2 small ${
                              comm.isOfficialResponse
                                ? 'bg-primary-subtle text-primary-emphasis border border-primary-subtle'
                                : 'bg-light text-dark border'
                            }`}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="fw-bold">
                                {comm.isOfficialResponse ? '🏛️ Official Municipal Action' : comm.user?.fullName || 'Citizen'}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {comm.createdAt ? new Date(comm.createdAt).toLocaleDateString() : 'Just now'}
                              </span>
                            </div>
                            <div>{comm.comment}</div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Dispatch New Official Response */}
                    <form onSubmit={handlePostOfficialRemark}>
                      <div className="mb-2">
                        <textarea
                          rows="2"
                          placeholder="Type official municipal response / update to citizen..."
                          value={officialRemark}
                          onChange={(e) => setOfficialRemark(e.target.value)}
                          className="form-control form-control-sm"
                          disabled={submittingRemark}
                        ></textarea>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">Citizens will receive an instant notification.</small>
                        <button
                          type="submit"
                          disabled={submittingRemark || !officialRemark.trim()}
                          className="btn btn-sm btn-primary rounded-pill px-3"
                        >
                          {submittingRemark ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <>
                              <Send size={14} className="me-1 inline" /> Dispatch
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* 4. FOOTER QUICK ACTIONS (Danger & Link) */}
                <div className="d-flex justify-content-between align-items-center pt-2">
                  <Link
                    to={`/complaint/${details._id}`}
                    target="_blank"
                    className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                  >
                    <ExternalLink size={14} className="me-1 inline" /> Full Public Page
                  </Link>

                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="btn btn-sm btn-outline-danger rounded-pill px-3"
                    >
                      <Trash2 size={14} className="me-1 inline" /> Delete Grievance
                    </button>
                  ) : (
                    <div className="d-flex align-items-center gap-1">
                      <span className="small text-danger fw-bold me-1">Confirm?</span>
                      <button
                        type="button"
                        onClick={handleDeleteComplaint}
                        className="btn btn-sm btn-danger rounded-pill px-2"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn btn-sm btn-secondary rounded-pill px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="modal-footer bg-white border-top py-2 px-4 d-flex justify-content-between">
            <span className="small text-muted font-monospace">
              System ID: {details._id}
            </span>
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

export default AdminComplaintModal;
