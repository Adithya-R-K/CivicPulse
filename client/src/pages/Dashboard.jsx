import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const { data } = await API.get('/complaints');
        if (data.success) {
          setComplaints(data.complaints);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const submitted = complaints.filter((c) => c.status === 'Submitted').length;

  return (
    <div className="container py-4">
      {/* Top Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            <i className="fas fa-columns text-primary me-2"></i>My Grievance Dashboard
          </h2>
          <p className="text-muted mb-0">
            Welcome back, <strong>{user?.fullName || user?.username}</strong>! Track your reported issues below.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary rounded-pill px-3 shadow-sm"
          >
            <i className="fas fa-arrow-left me-1"></i> Back
          </button>
          <Link to="/submit" className="btn btn-primary rounded-pill px-4 shadow-sm">
            <i className="fas fa-plus-circle me-1"></i> Submit Complaint
          </Link>
          <button
            onClick={logout}
            className="btn btn-outline-danger rounded-pill px-3 shadow-sm"
          >
            <i className="fas fa-sign-out-alt me-1"></i> Logout
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h3 className="fw-bold text-primary mb-0">{total}</h3>
              <small className="text-muted">Total Filed</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h3 className="fw-bold text-success mb-0">{resolved}</h3>
              <small className="text-muted">Resolved</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h3 className="fw-bold text-warning mb-0">{inProgress}</h3>
              <small className="text-muted">In Progress</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h3 className="fw-bold text-danger mb-0">{submitted}</h3>
              <small className="text-muted">Submitted</small>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card border-0 shadow-sm p-4">
        <div className="card-body p-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold text-dark mb-0">
              <i className="fas fa-list-alt text-primary me-2"></i>Your Submitted Grievances
            </h4>
          </div>

          {loading ? (
            <p className="text-muted text-center py-5">Loading grievances...</p>
          ) : complaints.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-inbox fa-3x mb-3 text-secondary"></i>
              <p>No complaints submitted yet. Click "Submit Complaint" to report an issue.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Title &amp; Category</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <strong className="text-dark d-block">{c.title}</strong>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          {c.category}
                        </span>
                      </td>
                      <td className="text-muted small">
                        <i className="fas fa-map-marker-alt text-danger me-1"></i>
                        {c.location}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.priority === 'Urgent'
                              ? 'bg-danger'
                              : c.priority === 'High'
                              ? 'bg-warning text-dark'
                              : 'bg-info text-dark'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === 'Resolved'
                              ? 'bg-success'
                              : c.status === 'In Progress'
                              ? 'bg-warning text-dark'
                              : 'bg-secondary'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/complaint/${c._id}`}
                          className="btn btn-sm btn-outline-primary rounded-pill px-3"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
