import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_complaints: 0,
    resolved: 0,
    in_progress: 0,
    pending: 0,
  });
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'complaints' | 'analytics' | 'users'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, compRes, deptRes, usersRes] = await Promise.all([
        API.get('/analytics/stats'),
        API.get('/complaints'),
        API.get('/analytics/departments'),
        API.get('/auth/users'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data);
      if (compRes.data.success) setComplaints(compRes.data.complaints);
      if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
      if (usersRes.data.success) setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      await API.put(`/complaints/${complaintId}/status`, { status: newStatus });
      setComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      alert('Failed to update complaint status');
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const { data } = await API.put(`/auth/users/${userId}/toggle-admin`);
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isAdmin: data.user.isAdmin } : u))
        );
      }
    } catch (e) {
      alert('Failed to update user role');
    }
  };

  const filteredComplaints = complaints.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-4">
      {/* HEADER matching templates/admin_dashboard.html */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1 text-dark">
            <i className="fas fa-tachometer-alt text-primary me-2"></i>Admin Dashboard
          </h2>
          <p className="text-muted mb-0">
            Centralized administrative control &amp; real-time system monitoring
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary rounded-pill px-3 shadow-sm"
            title="Go Back"
          >
            <i className="fas fa-arrow-left me-1"></i> Back
          </button>
          <button
            onClick={logout}
            className="btn btn-outline-danger rounded-pill px-3 shadow-sm"
            title="Sign Out"
          >
            <i className="fas fa-sign-out-alt me-1"></i> Logout
          </button>
        </div>
      </div>

      {/* STATS CARDS matching templates/admin_dashboard.html */}
      <div className="row g-4 mb-4">
        {/* Total Complaints */}
        <div className="col-md-3 col-6">
          <div className="card border-0 shadow-sm bg-primary text-white p-3" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-2 text-white-50">Total Complaints</h6>
                  <h2 className="mb-0 fw-bold">{stats.total_complaints}</h2>
                </div>
                <i className="fas fa-file-alt fa-3x opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div className="col-md-3 col-6">
          <div className="card border-0 shadow-sm bg-success text-white p-3" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-2 text-white-50">Resolved</h6>
                  <h2 className="mb-0 fw-bold">{stats.resolved}</h2>
                </div>
                <i className="fas fa-check-circle fa-3x opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="col-md-3 col-6">
          <div className="card border-0 shadow-sm bg-warning text-white p-3" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-2 text-white-50">In Progress</h6>
                  <h2 className="mb-0 fw-bold">{stats.in_progress}</h2>
                </div>
                <i className="fas fa-spinner fa-3x opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="col-md-3 col-6">
          <div className="card border-0 shadow-sm bg-info text-white p-3" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-2 text-white-50">Pending Review</h6>
                  <h2 className="mb-0 fw-bold">{stats.pending}</h2>
                </div>
                <i className="fas fa-exclamation-circle fa-3x opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS + SYSTEM STATUS */}
      <div className="row g-4 mb-4">
        {/* QUICK ACTIONS */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100 p-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3 text-dark">
                <i className="fas fa-bolt text-primary me-2"></i>Quick Actions
              </h5>

              <div className="d-grid gap-3">
                <button
                  onClick={() => setActiveSection('complaints')}
                  className={`btn ${
                    activeSection === 'complaints' ? 'btn-primary' : 'btn-outline-primary'
                  } text-start py-2.5 rounded-pill`}
                >
                  <i className="fas fa-list me-2"></i> View All Complaints ({complaints.length})
                </button>

                <button
                  onClick={() => setActiveSection('analytics')}
                  className={`btn ${
                    activeSection === 'analytics' ? 'btn-success text-white' : 'btn-outline-success'
                  } text-start py-2.5 rounded-pill`}
                >
                  <i className="fas fa-chart-bar me-2"></i> View Department SLAs &amp; Analytics
                </button>

                <button
                  onClick={() => setActiveSection('users')}
                  className={`btn ${
                    activeSection === 'users' ? 'btn-info text-white' : 'btn-outline-info'
                  } text-start py-2.5 rounded-pill`}
                >
                  <i className="fas fa-users me-2"></i> Manage Users ({users.length})
                </button>

                <button
                  onClick={() => setActiveSection('overview')}
                  className={`btn ${
                    activeSection === 'overview' ? 'btn-warning text-dark' : 'btn-outline-warning'
                  } text-start py-2.5 rounded-pill`}
                >
                  <i className="fas fa-sync me-2"></i> System Monitoring Overview
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100 p-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3 text-dark">
                <i className="fas fa-heartbeat text-danger me-2"></i>System Status
              </h5>

              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="fw-semibold">Database (MongoDB / Mongoose)</td>
                    <td className="text-end">
                      <span className="badge bg-success">Online</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">AI Routing Engine</td>
                    <td className="text-end">
                      <span className="badge bg-success">Active</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Node.js Express API Server</td>
                    <td className="text-end">
                      <span className="badge bg-success">Running</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Last Backup</td>
                    <td className="text-end">
                      <small className="text-muted">Today at 2:00 AM</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION VIEW: Complaints Management */}
      {activeSection === 'complaints' && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="card-body p-0">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold text-dark mb-0">
                <i className="fas fa-list text-primary me-2"></i>Complaints Management
              </h4>
              <div className="w-50">
                <input
                  type="text"
                  placeholder="Filter by title, category, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control form-control-sm rounded-pill px-3"
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Title &amp; Location</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status Action</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <strong className="text-dark d-block">{c.title}</strong>
                        <small className="text-muted">{c.location}</small>
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          {c.category}
                        </span>
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
                        <select
                          value={c.status}
                          onChange={(e) => handleUpdateStatus(c._id, e.target.value)}
                          className="form-select form-select-sm"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="small text-muted">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION VIEW: Analytics & SLAs */}
      {activeSection === 'analytics' && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="card-body p-0">
            <h4 className="fw-bold text-dark mb-3">
              <i className="fas fa-chart-bar text-success me-2"></i>Department SLAs &amp; Response Targets
            </h4>
            <div className="row g-3">
              {departments.map((dept) => (
                <div key={dept._id} className="col-md-4">
                  <div className="border rounded-3 p-3 bg-light">
                    <h6 className="fw-bold text-dark mb-1">{dept.name}</h6>
                    <p className="text-muted small mb-2">{dept.email}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">Target Resolution SLA:</span>
                      <span className="badge bg-primary">{dept.slaHours} Hours</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION VIEW: User Accounts */}
      {activeSection === 'users' && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="card-body p-0">
            <h4 className="fw-bold text-dark mb-3">
              <i className="fas fa-users text-info me-2"></i>Registered Users
            </h4>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="fw-bold">{u.fullName}</td>
                      <td>@{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.isAdmin ? 'bg-danger' : 'bg-secondary'}`}>
                          {u.isAdmin ? 'Admin' : 'Citizen'}
                        </span>
                      </td>
                      <td className="text-end">
                        {u._id !== user?.id && u._id !== user?._id && (
                          <button
                            onClick={() => handleToggleAdmin(u._id)}
                            className="btn btn-sm btn-outline-secondary rounded-pill"
                          >
                            {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
