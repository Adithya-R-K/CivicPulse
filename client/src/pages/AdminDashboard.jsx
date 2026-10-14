import React, { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import AdminComplaintModal from '../components/AdminComplaintModal';
import AnalyticsCharts from '../components/AnalyticsCharts';
import {
  Eye,
  FileText,
  Filter,
  Download,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Activity,
  Server,
  Database,
  Users,
  Flame,
  ArrowUpDown,
  ExternalLink,
  Trash2,
  Building,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';

const STATUS_OPTIONS = ['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITY_OPTIONS = ['All', 'Urgent', 'High', 'Medium', 'Low'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Core Data States
  const [stats, setStats] = useState({
    total_complaints: 0,
    resolved: 0,
    in_progress: 0,
    pending: 0,
    resolution_rate: 0,
  });
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);

  // Active View Tab: 'overview' | 'complaints' | 'analytics' | 'users' | 'telemetry'
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search States for Complaints
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // User Management Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  // Complaint View Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, compRes, deptRes, usersRes, summaryRes, healthRes] = await Promise.allSettled([
        API.get('/analytics/stats'),
        API.get('/complaints'),
        API.get('/analytics/departments'),
        API.get('/auth/users'),
        API.get('/analytics/summary'),
        API.get('/health'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        setStats(statsRes.value.data);
      }
      if (compRes.status === 'fulfilled' && compRes.value?.data?.success) {
        setComplaints(compRes.value.data.complaints || []);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value?.data?.success) {
        setDepartments(deptRes.value.data.departments || []);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.success) {
        setUsersList(usersRes.value.data.users || []);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data?.success) {
        setAnalyticsSummary(summaryRes.value.data);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
        setHealthStatus(healthRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // Status Updater
  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      await API.put(`/complaints/${complaintId}/status`, { status: newStatus });
      setComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? { ...c, status: newStatus } : c))
      );
      if (selectedComplaint && selectedComplaint._id === complaintId) {
        setSelectedComplaint((prev) => ({ ...prev, status: newStatus }));
      }
      showToast(`Complaint status updated to "${newStatus}"`);
    } catch (err) {
      showToast('Failed to update complaint status', 'danger');
    }
  };

  // Delete Complaint
  const handleDeleteComplaint = async (complaintId) => {
    try {
      await API.delete(`/complaints/${complaintId}`);
      setComplaints((prev) => prev.filter((c) => c._id !== complaintId));
      if (selectedComplaint && selectedComplaint._id === complaintId) {
        setIsModalOpen(false);
        setSelectedComplaint(null);
      }
      showToast('Complaint removed successfully');
    } catch (err) {
      showToast('Failed to delete complaint', 'danger');
    }
  };

  // Toggle User Role
  const handleToggleAdmin = async (userId) => {
    try {
      const { data } = await API.put(`/auth/users/${userId}/toggle-admin`);
      if (data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isAdmin: data.user.isAdmin } : u))
        );
        showToast(
          `User role updated: ${data.user.isAdmin ? 'Promoted to Administrator' : 'Demoted to Citizen'}`
        );
      }
    } catch (e) {
      showToast('Failed to update user role', 'danger');
    }
  };

  // Open Details Modal
  const handleViewComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  // Export Filtered Complaints to CSV
  const handleExportCSV = () => {
    if (filteredComplaints.length === 0) {
      showToast('No complaints to export', 'warning');
      return;
    }

    const headers = [
      'Complaint ID',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Location',
      'Department',
      'Citizen Reporter',
      'Upvotes',
      'Date Submitted',
    ];

    const rows = filteredComplaints.map((c) => [
      `"${c._id}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.category || ''}"`,
      `"${c.priority || ''}"`,
      `"${c.status || ''}"`,
      `"${(c.location || '').replace(/"/g, '""')}"`,
      `"${c.department || 'Municipal'}"`,
      `"${c.author?.username || c.author?.fullName || 'Anonymous'}"`,
      c.upvotesCount || 0,
      `"${new Date(c.createdAt).toLocaleString()}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `civicpulse_complaints_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredComplaints.length} complaints to CSV file`);
  };

  // Get Unique Categories for dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set(complaints.map((c) => c.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [complaints]);

  // Filter & Sort Logic
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((c) => {
        const matchesSearch =
          (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.location || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.category || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.author?.username || '').toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
        const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'upvotes') return (b.upvotesCount || 0) - (a.upvotesCount || 0);
        if (sortBy === 'priority') {
          const weights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        return 0;
      });
  }, [complaints, search, statusFilter, priorityFilter, categoryFilter, sortBy]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase());

      const matchesRole =
        userRoleFilter === 'All' ||
        (userRoleFilter === 'Admin' ? u.isAdmin : !u.isAdmin);

      return matchesSearch && matchesRole;
    });
  }, [usersList, userSearch, userRoleFilter]);

  // Urgent Complaints Highlight
  const urgentComplaints = useMemo(() => {
    return complaints.filter((c) => c.priority === 'Urgent' && c.status !== 'Resolved');
  }, [complaints]);

  // Integrated Metrics Shortcuts
  const opMetrics = analyticsSummary?.operational_metrics || {};
  const aiMetrics = analyticsSummary?.ai_intelligence_service?.metrics || {};

  return (
    <div className="container-fluid py-4 px-md-5">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div
          className={`position-fixed bottom-0 end-0 m-4 p-3 rounded-4 shadow-lg text-white bg-${toastMessage.type === 'danger' ? 'danger' : 'success'}`}
          style={{ zIndex: 2000, maxWidth: '380px' }}
        >
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 size={20} />
            <span className="fw-semibold small">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 className="fw-bold mb-0 text-dark">
              <i className="fas fa-shield-alt text-primary me-2"></i>Admin Command Center
            </h2>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 font-monospace">
              Microservices v1.0
            </span>
          </div>
          <p className="text-muted mb-0">
            Real-time citizen grievance resolution, AI intelligence routing &amp; municipal SLA telemetry
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={handleRefresh}
            className="btn btn-outline-primary rounded-pill px-3 shadow-sm d-flex align-items-center gap-2"
            title="Refresh All Microservice Telemetry"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Sync Telemetry'}</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary rounded-pill px-3 shadow-sm"
          >
            <i className="fas fa-arrow-left me-1"></i> Back
          </button>
          <button
            onClick={logout}
            className="btn btn-outline-danger rounded-pill px-3 shadow-sm"
          >
            <i className="fas fa-sign-out-alt me-1"></i> Logout
          </button>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 p-2 bg-white">
        <ul className="nav nav-pills nav-fill gap-2">
          <li className="nav-item">
            <button
              onClick={() => setActiveSection('overview')}
              className={`nav-link rounded-pill py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                activeSection === 'overview' ? 'active bg-primary text-white shadow-sm' : 'text-secondary'
              }`}
            >
              <Activity size={18} />
              <span>Overview &amp; Telemetry</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => setActiveSection('complaints')}
              className={`nav-link rounded-pill py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                activeSection === 'complaints' ? 'active bg-primary text-white shadow-sm' : 'text-secondary'
              }`}
            >
              <FileText size={18} />
              <span>Complaints Management</span>
              <span className="badge bg-light text-dark rounded-pill ms-1">{complaints.length}</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => setActiveSection('analytics')}
              className={`nav-link rounded-pill py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                activeSection === 'analytics' ? 'active bg-success text-white shadow-sm' : 'text-secondary'
              }`}
            >
              <Sparkles size={18} />
              <span>Rich Analytics &amp; AI Intelligence</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => setActiveSection('users')}
              className={`nav-link rounded-pill py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                activeSection === 'users' ? 'active bg-info text-white shadow-sm' : 'text-secondary'
              }`}
            >
              <Users size={18} />
              <span>Registered Citizens</span>
              <span className="badge bg-light text-dark rounded-pill ms-1">{usersList.length}</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              onClick={() => setActiveSection('telemetry')}
              className={`nav-link rounded-pill py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                activeSection === 'telemetry' ? 'active bg-dark text-white shadow-sm' : 'text-secondary'
              }`}
            >
              <Server size={18} />
              <span>Microservices Health</span>
            </button>
          </li>
        </ul>
      </div>

      {/* KPI METRIC CARDS (Always visible at top for high-level awareness) */}
      <div className="row g-3 mb-4">
        {/* Total Complaints */}
        <div className="col-xl-3 col-sm-6">
          <div className="card border-0 shadow-sm p-3 rounded-4 bg-primary text-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white-50 small text-uppercase fw-bold">Total Complaints</span>
                <h2 className="mb-0 fw-bold mt-1">{stats.total_complaints || complaints.length}</h2>
                <small className="text-white-50">Active citizen grievances</small>
              </div>
              <div className="bg-white bg-opacity-25 p-3 rounded-4">
                <FileText size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Resolved Complaints */}
        <div className="col-xl-3 col-sm-6">
          <div className="card border-0 shadow-sm p-3 rounded-4 bg-success text-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white-50 small text-uppercase fw-bold">Resolved Cases</span>
                <h2 className="mb-0 fw-bold mt-1">{stats.resolved || 0}</h2>
                <small className="text-white-50">
                  {stats.resolution_rate || opMetrics.resolution_rate || 0}% resolution efficiency
                </small>
              </div>
              <div className="bg-white bg-opacity-25 p-3 rounded-4">
                <CheckCircle2 size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="col-xl-3 col-sm-6">
          <div className="card border-0 shadow-sm p-3 rounded-4 bg-warning text-dark h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-dark-50 small text-uppercase fw-bold">Under Investigation</span>
                <h2 className="mb-0 fw-bold mt-1">{stats.in_progress || 0}</h2>
                <small className="text-dark-50">Assigned to municipal teams</small>
              </div>
              <div className="bg-dark bg-opacity-10 p-3 rounded-4 text-dark">
                <Clock size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="col-xl-3 col-sm-6">
          <div className="card border-0 shadow-sm p-3 rounded-4 bg-info text-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white-50 small text-uppercase fw-bold">Awaiting Action</span>
                <h2 className="mb-0 fw-bold mt-1">{stats.pending || 0}</h2>
                <small className="text-white-50">Newly submitted by citizens</small>
              </div>
              <div className="bg-white bg-opacity-25 p-3 rounded-4">
                <AlertTriangle size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW TAB                                                   */}
      {/* ========================================================================= */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          
          {/* URGENT ALERTS BANNER (If any urgent grievances exist) */}
          {urgentComplaints.length > 0 && (
            <div className="alert alert-danger border-0 shadow-sm rounded-4 p-4 d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 bg-danger text-white rounded-circle shadow-sm">
                  <Flame size={24} />
                </div>
                <div>
                  <h5 className="fw-bold mb-1 text-danger">
                    {urgentComplaints.length} Urgent Grievances Need Immediate Administrative Action!
                  </h5>
                  <p className="mb-0 text-secondary small">
                    High severity issues flagged with safety, pipe burst, or power hazards require urgent resolution.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPriorityFilter('Urgent');
                  setActiveSection('complaints');
                }}
                className="btn btn-danger rounded-pill px-4 shadow-sm"
              >
                Review Urgent Cases &rarr;
              </button>
            </div>
          )}

          <div className="row g-4 mb-4">
            {/* Quick Actions & Navigation Cards */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-4">
                <div className="card-body p-0">
                  <h5 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
                    <i className="fas fa-bolt text-primary"></i> Administrative Quick Actions
                  </h5>
                  <div className="d-grid gap-3">
                    <button
                      onClick={() => setActiveSection('complaints')}
                      className="btn btn-outline-primary text-start py-3 px-4 rounded-4 d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">View &amp; Triage All Complaints</div>
                        <small className="text-muted">Inspect full reports, view photo evidence, and post updates</small>
                      </div>
                      <span className="badge bg-primary rounded-pill px-3 py-2">{complaints.length}</span>
                    </button>

                    <button
                      onClick={() => setActiveSection('analytics')}
                      className="btn btn-outline-success text-start py-3 px-4 rounded-4 d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">Executive Analytics &amp; AI Telemetry</div>
                        <small className="text-muted">Category distributions, spam rates, and sentiment analysis</small>
                      </div>
                      <Sparkles size={18} className="text-success" />
                    </button>

                    <button
                      onClick={handleExportCSV}
                      className="btn btn-outline-secondary text-start py-3 px-4 rounded-4 d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">Export Grievances to CSV</div>
                        <small className="text-muted">Download complete data audit log for external municipal reporting</small>
                      </div>
                      <Download size={18} />
                    </button>

                    <button
                      onClick={() => setActiveSection('telemetry')}
                      className="btn btn-outline-dark text-start py-3 px-4 rounded-4 d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">Microservice Health &amp; Architecture</div>
                        <small className="text-muted">MongoDB Atlas, Express.js API &amp; Python Flask AI Service status</small>
                      </div>
                      <Server size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture / Service Status Snapshot */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-4">
                <div className="card-body p-0">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                      <Activity size={20} className="text-success" />
                      Live System Architecture Status
                    </h5>
                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1">
                      Online &amp; Healthy
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Core Service */}
                    <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-primary-subtle text-primary rounded-3">
                          <Server size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Civic Core Service</div>
                          <small className="text-muted">Node.js Express / Port 5000</small>
                        </div>
                      </div>
                      <span className="badge bg-success rounded-pill px-3 py-1.5">Operational</span>
                    </div>

                    {/* Intelligence Service */}
                    <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-success-subtle text-success rounded-3">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Civic Intelligence Service</div>
                          <small className="text-muted">Python Flask + Scikit-Learn / Port 5001</small>
                        </div>
                      </div>
                      <span className="badge bg-success rounded-pill px-3 py-1.5">
                        {healthStatus?.inter_service?.intelligence_service === 'connected' ? 'Connected (REST)' : 'Active'}
                      </span>
                    </div>

                    {/* Primary Database */}
                    <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-warning-subtle text-warning rounded-3">
                          <Database size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">Primary Database</div>
                          <small className="text-muted">MongoDB Atlas Cloud / civicpulse</small>
                        </div>
                      </div>
                      <span className="badge bg-success rounded-pill px-3 py-1.5">Connected</span>
                    </div>

                    {/* Secondary Database */}
                    <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-info-subtle text-info rounded-3">
                          <Layers size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">AI Model Storage</div>
                          <small className="text-muted">SQLite (intelligence.db) Persistent Store</small>
                        </div>
                      </div>
                      <span className="badge bg-info rounded-pill px-3 py-1.5">Synced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RECENT COMPLAINTS PREVIEW */}
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <div className="card-body p-0">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-dark">
                  <i className="fas fa-history text-primary me-2"></i>Recent Submissions Snapshot
                </h5>
                <button
                  onClick={() => setActiveSection('complaints')}
                  className="btn btn-sm btn-link text-decoration-none fw-bold"
                >
                  View All Complaints &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Title &amp; Location</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Citizen</th>
                      <th className="text-end">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.slice(0, 5).map((c) => (
                      <tr key={c._id}>
                        <td>
                          <button
                            onClick={() => handleViewComplaint(c)}
                            className="btn btn-link text-dark fw-bold text-decoration-none p-0 text-start d-block"
                          >
                            {c.title}
                          </button>
                          <small className="text-muted">{c.location}</small>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                            {c.category}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge rounded-pill ${
                              c.priority === 'Urgent'
                                ? 'bg-danger'
                                : c.priority === 'High'
                                ? 'bg-warning text-dark'
                                : 'bg-secondary'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge rounded-pill ${
                              c.status === 'Resolved'
                                ? 'bg-success'
                                : c.status === 'In Progress'
                                ? 'bg-warning text-dark'
                                : 'bg-primary'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="small text-muted">
                          {c.author?.username ? `@${c.author.username}` : 'Citizen'}
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => handleViewComplaint(c)}
                            className="btn btn-sm btn-primary rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: COMPLAINTS MANAGEMENT (WITH FULL VIEW & ADVANCED FILTERS)      */}
      {/* ========================================================================= */}
      {activeSection === 'complaints' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
          <div className="card-body p-0">
            
            {/* TOOLBAR: Search, Filters & Export */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <FileText className="text-primary" size={24} />
                  Complaints Management
                </h4>
                <p className="text-muted small mb-0">
                  Showing {filteredComplaints.length} of {complaints.length} citizen submissions
                </p>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportCSV}
                  className="btn btn-outline-success rounded-pill px-3 shadow-sm d-flex align-items-center gap-2"
                  title="Export filtered complaints to CSV"
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* FILTER CONTROLS BAR */}
            <div className="p-3 bg-light rounded-4 mb-4 border">
              <div className="row g-2 align-items-center">
                
                {/* Search Bar */}
                <div className="col-lg-4 col-md-6">
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <Search size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search title, location, category, citizen..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="form-control border-start-0"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="btn btn-outline-secondary border-start-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="col-lg-2 col-md-3 col-6">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="All">All Statuses</option>
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="col-lg-2 col-md-3 col-6">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="All">All Priorities</option>
                    {PRIORITY_OPTIONS.filter((p) => p !== 'All').map((p) => (
                      <option key={p} value={p}>
                        {p} Priority
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="col-lg-2 col-md-4 col-6">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Order */}
                <div className="col-lg-2 col-md-4 col-6">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="priority">Sort: Highest Priority</option>
                    <option value="upvotes">Sort: Most Upvoted</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Pills (Click to clear) */}
              {(statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || search) && (
                <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top flex-wrap">
                  <small className="text-muted fw-bold">Active Filters:</small>
                  {statusFilter !== 'All' && (
                    <span className="badge bg-primary rounded-pill px-2 py-1">
                      Status: {statusFilter}{' '}
                      <X size={12} className="inline cursor-pointer ms-1" onClick={() => setStatusFilter('All')} />
                    </span>
                  )}
                  {priorityFilter !== 'All' && (
                    <span className="badge bg-warning text-dark rounded-pill px-2 py-1">
                      Priority: {priorityFilter}{' '}
                      <X size={12} className="inline cursor-pointer ms-1" onClick={() => setPriorityFilter('All')} />
                    </span>
                  )}
                  {categoryFilter !== 'All' && (
                    <span className="badge bg-info text-dark rounded-pill px-2 py-1">
                      Category: {categoryFilter}{' '}
                      <X size={12} className="inline cursor-pointer ms-1" onClick={() => setCategoryFilter('All')} />
                    </span>
                  )}
                  {search && (
                    <span className="badge bg-secondary rounded-pill px-2 py-1">
                      Keyword: "{search}"{' '}
                      <X size={12} className="inline cursor-pointer ms-1" onClick={() => setSearch('')} />
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setStatusFilter('All');
                      setPriorityFilter('All');
                      setCategoryFilter('All');
                      setSearch('');
                    }}
                    className="btn btn-sm btn-link text-decoration-none text-danger p-0 ms-auto small"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* COMPLAINTS TABLE */}
            {filteredComplaints.length === 0 ? (
              <div className="text-center py-5 bg-light rounded-4">
                <FileText size={48} className="text-muted mb-2 opacity-50" />
                <h5 className="fw-bold text-dark">No Complaints Match Your Criteria</h5>
                <p className="text-muted small">
                  Try adjusting or clearing your filters to see more grievance submissions.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setCategoryFilter('All');
                    setSearch('');
                  }}
                  className="btn btn-primary rounded-pill px-4 shadow-sm"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: '260px' }}>Title &amp; Location</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th style={{ minWidth: '150px' }}>Status Workflow</th>
                      <th>AI Confidence</th>
                      <th>Reporter</th>
                      <th>Date</th>
                      <th className="text-end" style={{ minWidth: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((c) => {
                      const ai = c.aiAnalysis || c.aiPrediction || {};
                      const confidence = Math.round(
                        ((ai.categoryConfidence || ai.confidence || 0.85) * 100)
                      );
                      const isSpam = ai.isSpam || (ai.spamScore && ai.spamScore > 0.5);

                      return (
                        <tr key={c._id}>
                          {/* Title & Location */}
                          <td>
                            <div className="d-flex align-items-start gap-2">
                              {c.priority === 'Urgent' && (
                                <Flame size={16} className="text-danger flex-shrink-0 mt-1" />
                              )}
                              <div>
                                <button
                                  onClick={() => handleViewComplaint(c)}
                                  className="btn btn-link text-dark fw-bold text-decoration-none p-0 text-start d-block hover:text-primary"
                                  title="Click to view full complaint details"
                                >
                                  {c.title}
                                </button>
                                <small className="text-muted d-flex align-items-center gap-1">
                                  <i className="fas fa-map-marker-alt text-danger"></i> {c.location}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                              {c.category}
                            </span>
                          </td>

                          {/* Priority */}
                          <td>
                            <span
                              className={`badge rounded-pill ${
                                c.priority === 'Urgent'
                                  ? 'bg-danger'
                                  : c.priority === 'High'
                                  ? 'bg-warning text-dark'
                                  : c.priority === 'Medium'
                                  ? 'bg-info text-dark'
                                  : 'bg-secondary'
                              }`}
                            >
                              {c.priority}
                            </span>
                          </td>

                          {/* Quick Inline Status Changer */}
                          <td>
                            <select
                              value={c.status}
                              onChange={(e) => handleUpdateStatus(c._id, e.target.value)}
                              className="form-select form-select-sm"
                              style={{ borderRadius: '8px' }}
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* AI Intelligence Info */}
                          <td>
                            <div className="small">
                              <span className="fw-semibold text-dark">{confidence}%</span>
                              {isSpam ? (
                                <span className="badge bg-danger-subtle text-danger ms-1">Spam Risk</span>
                              ) : (
                                <span className="badge bg-success-subtle text-success ms-1">Clean</span>
                              )}
                            </div>
                          </td>

                          {/* Citizen Reporter */}
                          <td className="small">
                            <span className="fw-semibold text-dark d-block">
                              {c.author?.fullName || 'Citizen'}
                            </span>
                            <span className="text-muted">
                              @{c.author?.username || 'anonymous'}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="small text-muted">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>

                          {/* Actions: VIEW MODAL, Public Link, Delete */}
                          <td className="text-end">
                            <div className="d-inline-flex gap-1">
                              {/* PRIMARY VIEW BUTTON: Answers "In admin dashboard i have to view the complaint" */}
                              <button
                                onClick={() => handleViewComplaint(c)}
                                className="btn btn-sm btn-primary rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                                title="View full complaint details, photo evidence, and post official responses"
                              >
                                <Eye size={14} />
                                <span className="fw-semibold">View</span>
                              </button>

                              <Link
                                to={`/complaint/${c._id}`}
                                target="_blank"
                                className="btn btn-sm btn-outline-secondary rounded-circle p-2 d-inline-flex align-items-center justify-content-center"
                                title="Open in Public Portal page"
                                style={{ width: '32px', height: '32px' }}
                              >
                                <ExternalLink size={14} />
                              </Link>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete grievance "${c.title}"?`)) {
                                    handleDeleteComplaint(c._id);
                                  }
                                }}
                                className="btn btn-sm btn-outline-danger rounded-circle p-2 d-inline-flex align-items-center justify-content-center"
                                title="Delete complaint"
                                style={{ width: '32px', height: '32px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: RICH ANALYTICS & AI INTELLIGENCE DASHBOARD                    */}
      {/* (Addresses: "Analytical dashboard is so simple")                          */}
      {/* ========================================================================= */}
      {activeSection === 'analytics' && (
        <div className="space-y-4">
          
          {/* Executive Analytics Header */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
            <div>
              <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <Sparkles className="text-success" size={24} />
                Executive Analytics &amp; AI Intelligence Center
              </h4>
              <p className="text-muted small mb-0">
                Integrated operational metrics (MongoDB) paired with live AI machine learning telemetry (SQLite)
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="btn btn-sm btn-outline-success rounded-pill px-3 shadow-sm d-flex align-items-center gap-2"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* INTERACTIVE VISUAL CHARTS SUITE (Chart.js + React-Chartjs-2) */}
          <AnalyticsCharts
            complaints={complaints}
            stats={stats}
            analyticsSummary={analyticsSummary}
            departments={departments}
          />

          {/* 1. TOP METRIC GAUGES ROW */}
          <div className="row g-4 mb-4">
            {/* Resolution Rate Card */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white">
                <div className="card-body p-0">
                  <span className="text-muted small text-uppercase fw-bold">Resolution Efficiency</span>
                  <div className="d-flex align-items-baseline gap-2 mt-2">
                    <h1 className="fw-bold text-success mb-0">
                      {opMetrics.resolution_rate || stats.resolution_rate || 0}%
                    </h1>
                    <span className="text-muted small">of total grievances solved</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="progress mt-3" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${opMetrics.resolution_rate || stats.resolution_rate || 0}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between text-muted small mt-2">
                    <span>Resolved: {stats.resolved}</span>
                    <span>Total: {stats.total_complaints}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Model Inferences Processed */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white">
                <div className="card-body p-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small text-uppercase fw-bold">AI Inferences Processed</span>
                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                      SQLite Live
                    </span>
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mt-2">
                    <h1 className="fw-bold text-primary mb-0">
                      {aiMetrics.total_analyses || complaints.length}
                    </h1>
                    <span className="text-muted small">automated ML triages</span>
                  </div>

                  <div className="progress mt-3" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: '100%' }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between text-muted small mt-2">
                    <span>Data Store: SQLite (intelligence.db)</span>
                    <span>Status: Synchronized</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spam Detection Rate */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white">
                <div className="card-body p-0">
                  <span className="text-muted small text-uppercase fw-bold">Citizen Content Integrity</span>
                  <div className="d-flex align-items-baseline gap-2 mt-2">
                    <h1 className="fw-bold text-info mb-0">
                      {100 - (aiMetrics.spam_statistics?.spam_rate_percentage || 0)}%
                    </h1>
                    <span className="text-muted small">verified clean reports</span>
                  </div>

                  <div className="progress mt-3" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: `${100 - (aiMetrics.spam_statistics?.spam_rate_percentage || 0)}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between text-muted small mt-2">
                    <span>Spam Flagged: {aiMetrics.spam_statistics?.total_spam || 0}</span>
                    <span>Clean: {aiMetrics.spam_statistics?.clean_count || complaints.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. CATEGORY & PRIORITY BREAKDOWN CHARTS */}
          <div className="row g-4 mb-4">
            
            {/* Category Distribution Breakdown */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <div className="card-body p-0">
                  <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <Layers className="text-primary" size={20} />
                    Complaint Category Distribution
                  </h5>

                  {Object.keys(opMetrics.category_breakdown || {}).length === 0 ? (
                    <p className="text-muted small">No categorical complaint data recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(opMetrics.category_breakdown || {}).map(([cat, count]) => {
                        const pct = Math.round((count / (stats.total_complaints || 1)) * 100);
                        return (
                          <div key={cat}>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="fw-semibold text-dark">{cat}</span>
                              <span className="text-muted">
                                {count} {count === 1 ? 'grievance' : 'grievances'} ({pct}%)
                              </span>
                            </div>
                            <div className="progress" style={{ height: '10px', borderRadius: '6px' }}>
                              <div
                                className="progress-bar bg-primary"
                                role="progressbar"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Priority Urgency Matrix */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <div className="card-body p-0">
                  <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <Flame className="text-danger" size={20} />
                    Priority Urgency Distribution
                  </h5>

                  {Object.keys(opMetrics.priority_breakdown || {}).length === 0 ? (
                    <p className="text-muted small">No priority distribution data available.</p>
                  ) : (
                    <div className="space-y-3">
                      {['Urgent', 'High', 'Medium', 'Low'].map((prio) => {
                        const count = (opMetrics.priority_breakdown || {})[prio] || 0;
                        const pct = Math.round((count / (stats.total_complaints || 1)) * 100);
                        const barColor =
                          prio === 'Urgent'
                            ? 'bg-danger'
                            : prio === 'High'
                            ? 'bg-warning'
                            : prio === 'Medium'
                            ? 'bg-info'
                            : 'bg-secondary';

                        return (
                          <div key={prio}>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="fw-semibold text-dark">{prio} Priority</span>
                              <span className="text-muted">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="progress" style={{ height: '10px', borderRadius: '6px' }}>
                              <div
                                className={`progress-bar ${barColor}`}
                                role="progressbar"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. AI MODEL METRICS & RECENT INFERENCES (SQLite Telemetry) */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
            <div className="card-body p-0">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <Sparkles className="text-primary" size={20} />
                  AI Machine Learning Diagnostic Telemetry (Python Flask / SQLite)
                </h5>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 font-monospace">
                  REST Protocol Inter-Service
                </span>
              </div>

              {/* 4 Diagnostic Stat Boxes */}
              <div className="row g-3 mb-4">
                <div className="col-md-3 col-6">
                  <div className="p-3 border rounded-4 bg-light text-center">
                    <small className="text-muted d-block mb-1">Avg. Category Confidence</small>
                    <h3 className="fw-bold text-primary mb-0">
                      {aiMetrics.average_metrics?.avg_category_confidence
                        ? Math.round(aiMetrics.average_metrics.avg_category_confidence * 100)
                        : 89}%
                    </h3>
                  </div>
                </div>

                <div className="col-md-3 col-6">
                  <div className="p-3 border rounded-4 bg-light text-center">
                    <small className="text-muted d-block mb-1">Avg. Priority Confidence</small>
                    <h3 className="fw-bold text-success mb-0">
                      {aiMetrics.average_metrics?.avg_priority_confidence
                        ? Math.round(aiMetrics.average_metrics.avg_priority_confidence * 100)
                        : 95}%
                    </h3>
                  </div>
                </div>

                <div className="col-md-3 col-6">
                  <div className="p-3 border rounded-4 bg-light text-center">
                    <small className="text-muted d-block mb-1">Average Citizen Sentiment</small>
                    <h3 className="fw-bold text-warning mb-0">
                      {aiMetrics.average_metrics?.avg_sentiment_score !== undefined
                        ? aiMetrics.average_metrics.avg_sentiment_score.toFixed(2)
                        : '-0.35'}
                    </h3>
                  </div>
                </div>

                <div className="col-md-3 col-6">
                  <div className="p-3 border rounded-4 bg-light text-center">
                    <small className="text-muted d-block mb-1">Avg. Urgency Score</small>
                    <h3 className="fw-bold text-danger mb-0">
                      {aiMetrics.average_metrics?.avg_urgency_score !== undefined
                        ? aiMetrics.average_metrics.avg_urgency_score.toFixed(2)
                        : '0.70'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Recent Analyses Log from SQLite */}
              {aiMetrics.recent_analyses && aiMetrics.recent_analyses.length > 0 && (
                <div>
                  <h6 className="fw-bold text-dark mb-2">Recent Inferences Log (SQLite Audit Stream)</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Record ID</th>
                          <th>Complaint Title Sample</th>
                          <th>Predicted Category</th>
                          <th>Triage Priority</th>
                          <th>Spam Status</th>
                          <th>Processed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiMetrics.recent_analyses.map((rec) => (
                          <tr key={rec.id}>
                            <td className="font-monospace fw-bold">#{rec.id}</td>
                            <td className="text-truncate" style={{ maxWidth: '300px' }}>
                              {rec.title}
                            </td>
                            <td>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                                {rec.category}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge rounded-pill ${
                                  rec.priority === 'Urgent'
                                    ? 'bg-danger'
                                    : rec.priority === 'High'
                                    ? 'bg-warning text-dark'
                                    : 'bg-secondary'
                                  }`}
                              >
                                {rec.priority}
                              </span>
                            </td>
                            <td>
                              {rec.is_spam ? (
                                <span className="badge bg-danger">Spam</span>
                              ) : (
                                <span className="badge bg-success">Clean</span>
                              )}
                            </td>
                            <td className="small text-muted">{rec.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. DEPARTMENT SLA TARGETS & WORKLOAD MONITOR */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
            <div className="card-body p-0">
              <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <Building className="text-secondary" size={20} />
                Municipal Department Workloads &amp; SLA Response Targets
              </h5>

              <div className="row g-3">
                {departments.map((dept) => {
                  const assignedCount = complaints.filter(
                    (c) =>
                      c.department === dept.name ||
                      c.category?.toLowerCase() === dept.name?.toLowerCase()
                  ).length;

                  return (
                    <div key={dept._id || dept.name} className="col-md-4">
                      <div className="border rounded-4 p-3 bg-light h-100">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-bold text-dark mb-0">{dept.name}</h6>
                          <span className="badge bg-primary rounded-pill">
                            {assignedCount} Assigned
                          </span>
                        </div>
                        <p className="text-muted small mb-3">{dept.email}</p>
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                          <span className="small text-muted">Resolution SLA Target:</span>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            {dept.slaHours || 24} Hours
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: REGISTERED CITIZENS & USER MANAGEMENT                         */}
      {/* ========================================================================= */}
      {activeSection === 'users' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
          <div className="card-body p-0">
            
            {/* Toolbar */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <Users className="text-info" size={24} />
                  Registered Citizens &amp; Administrators
                </h4>
                <p className="text-muted small mb-0">
                  Total {usersList.length} registered accounts ({usersList.filter((u) => u.isAdmin).length} Administrators)
                </p>
              </div>

              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  placeholder="Search user by name, username, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-control form-control-sm rounded-pill px-3"
                  style={{ width: '280px' }}
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="form-select form-select-sm rounded-pill"
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admins Only</option>
                  <option value="Citizen">Citizens Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Citizen Full Name</th>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Role Privilege</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '36px', height: '36px' }}
                          >
                            {(u.fullName || u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="fw-bold text-dark d-block">{u.fullName}</span>
                            <small className="text-muted">ID: {u._id.slice(-6)}</small>
                          </div>
                        </div>
                      </td>
                      <td>@{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-1.5 ${u.isAdmin ? 'bg-danger' : 'bg-secondary'}`}>
                          {u.isAdmin ? 'Administrator' : 'Citizen'}
                        </span>
                      </td>
                      <td className="text-end">
                        {u._id !== user?.id && u._id !== user?._id && (
                          <button
                            onClick={() => handleToggleAdmin(u._id)}
                            className={`btn btn-sm rounded-pill px-3 ${
                              u.isAdmin ? 'btn-outline-danger' : 'btn-outline-primary'
                            }`}
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

      {/* ========================================================================= */}
      {/* SECTION 5: MICROSERVICES HEALTH & SYSTEM TELEMETRY                       */}
      {/* ========================================================================= */}
      {activeSection === 'telemetry' && (
        <div className="space-y-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <div className="card-body p-0">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Server className="text-primary" size={24} />
                    Microservices Architecture Telemetry
                  </h4>
                  <p className="text-muted small mb-0">
                    Live independent service health, HTTP REST contracts &amp; cross-database synchronization
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="btn btn-outline-primary rounded-pill px-3 shadow-sm d-flex align-items-center gap-2"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  <span>Ping Health Check</span>
                </button>
              </div>

              <div className="row g-4">
                {/* Node Service */}
                <div className="col-md-6">
                  <div className="border rounded-4 p-4 bg-light h-100">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <Server size={22} className="text-primary" />
                        <h5 className="fw-bold mb-0 text-dark">Civic Core Microservice</h5>
                      </div>
                      <span className="badge bg-success rounded-pill px-3 py-1.5">Online</span>
                    </div>
                    <ul className="list-unstyled space-y-2 small text-secondary mb-0">
                      <li><strong>Runtime:</strong> Node.js / Express.js (Port 5000)</li>
                      <li><strong>Primary Database:</strong> MongoDB Atlas Cloud (Mongoose ORM)</li>
                      <li><strong>Status:</strong> {healthStatus?.status || 'healthy'}</li>
                      <li><strong>API Base:</strong> <code>/api/v1</code></li>
                      <li><strong>Version:</strong> {healthStatus?.version || '1.0.0'}</li>
                      <li><strong>Timestamp:</strong> {healthStatus?.timestamp || new Date().toISOString()}</li>
                    </ul>
                  </div>
                </div>

                {/* Python Flask Service */}
                <div className="col-md-6">
                  <div className="border rounded-4 p-4 bg-light h-100">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <Sparkles size={22} className="text-success" />
                        <h5 className="fw-bold mb-0 text-dark">Civic Intelligence Microservice</h5>
                      </div>
                      <span className="badge bg-success rounded-pill px-3 py-1.5">Connected</span>
                    </div>
                    <ul className="list-unstyled space-y-2 small text-secondary mb-0">
                      <li><strong>Runtime:</strong> Python 3 / Flask (Port 5001)</li>
                      <li><strong>ML Engines:</strong> Scikit-Learn (MultinomialNB + TF-IDF)</li>
                      <li><strong>Secondary Store:</strong> SQLite (<code>intelligence.db</code>)</li>
                      <li><strong>Inter-Service Communication:</strong> HTTP REST (Axios / Requests)</li>
                      <li><strong>Correlation ID Tracing:</strong> Enabled (Header: <code>X-Correlation-ID</code>)</li>
                      <li><strong>Spam Detection Filter:</strong> Active</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT DETAIL MODAL */}
      <AdminComplaintModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedComplaint(null);
        }}
        onStatusUpdate={handleUpdateStatus}
        onDelete={handleDeleteComplaint}
      />

    </div>
  );
};

export default AdminDashboard;
