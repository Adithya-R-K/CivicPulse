import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import CitizenComplaintModal from '../components/CitizenComplaintModal';
import MapView from '../components/MapView';
import AIChatModal from '../components/AIChatModal';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  MapPin,
  ThumbsUp,
  MessageSquare,
  Eye,
  ExternalLink,
  Flame,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  Map,
  TrendingUp,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowUpDown,
  X,
  Building,
} from 'lucide-react';

const STATUS_FILTERS = ['All', 'Submitted', 'In Review', 'In Progress', 'Resolved'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ONLY complaints from this authenticated account ID
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active View Tab: 'complaints' | 'map'
  const [activeTab, setActiveTab] = useState('complaints');

  // Layout View: 'grid' | 'table'
  const [layoutView, setLayoutView] = useState('grid');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modal Inspection
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Upvote handling states
  const [upvoteLoading, setUpvoteLoading] = useState({});

  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    fetchAccountComplaints();
  }, [user]);

  const fetchAccountComplaints = async () => {
    setLoading(true);
    try {
      const activeId = user?.id || user?._id;
      let fetchedGrievances = [];

      // 1. Fetch complaints submitted by the authenticated user ID
      try {
        const myRes = await API.get('/complaints/user/my');
        if (myRes.data?.success && Array.isArray(myRes.data.complaints)) {
          fetchedGrievances = myRes.data.complaints;
        }
      } catch (err) {
        console.warn('Dedicated /user/my endpoint error:', err.message);
      }

      // 2. Secondary fallback querying with author param if /user/my returned empty
      if (fetchedGrievances.length === 0 && activeId) {
        try {
          const authorRes = await API.get(`/complaints?author=${activeId}`);
          if (authorRes.data?.success && Array.isArray(authorRes.data.complaints)) {
            fetchedGrievances = authorRes.data.complaints;
          }
        } catch (err) {
          // ignore
        }
      }

      // 3. STRICT ACCOUNT ID FILTER: Guarantee that only complaints belonging to this user's ID are displayed
      const strictlyAccountComplaints = fetchedGrievances.filter((c) => {
        const authorId = c.author?._id || c.author?.id || c.author;
        return (
          (authorId && String(authorId) === String(activeId)) ||
          (c.author?.username && user?.username && c.author.username === user.username)
        );
      });

      setComplaints(strictlyAccountComplaints);
    } catch (e) {
      console.error('Error fetching account grievances:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAccountComplaints();
  };

  const handleUpvote = async (complaintId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      alert('Please log in to upvote');
      return;
    }

    setUpvoteLoading((prev) => ({ ...prev, [complaintId]: true }));
    try {
      const { data } = await API.post(`/complaints/${complaintId}/upvote`);
      if (data.success) {
        setComplaints((prev) =>
          prev.map((c) => {
            if (c._id === complaintId) {
              const currentUpvotes = c.upvotes || [];
              const uId = user.id || user._id;
              return {
                ...c,
                upvotesCount: data.upvotesCount,
                upvotes: data.upvoted
                  ? [...currentUpvotes, uId]
                  : currentUpvotes.filter((id) => id !== uId),
              };
            }
            return c;
          })
        );

        if (selectedComplaint && selectedComplaint._id === complaintId) {
          setSelectedComplaint((prev) => ({
            ...prev,
            upvotesCount: data.upvotesCount,
          }));
        }
      }
    } catch (err) {
      console.error('Upvote failed:', err);
    } finally {
      setUpvoteLoading((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

  // Categories present in this account's complaints
  const categories = useMemo(() => {
    const set = new Set(complaints.map((c) => c.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [complaints]);

  // Filtered and Sorted list strictly for this account
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((c) => {
        const matchesSearch =
          (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.location || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.category || '').toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
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
  }, [complaints, search, statusFilter, categoryFilter, sortBy]);

  // Metrics computed ONLY for this account
  const totalCount = complaints.length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const submittedCount = complaints.filter((c) => c.status === 'Submitted' || c.status === 'In Review').length;
  const totalUpvotesEarned = complaints.reduce(
    (sum, c) => sum + (c.upvotesCount || (c.upvotes && c.upvotes.length) || 0),
    0
  );
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  return (
    <div className="container py-4">
      
      {/* 1. HERO CITIZEN BANNER (SCOPED TO AUTHENTICATED ACCOUNT ID) */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="card-body p-4 p-md-5 text-white">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            
            {/* User Profile & Account ID Badge */}
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-lg"
                style={{ width: '64px', height: '64px', fontSize: '1.6rem', border: '3px solid rgba(255,255,255,0.2)' }}
              >
                {(user?.fullName || user?.username || 'C')[0].toUpperCase()}
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h3 className="fw-bold mb-0 text-white">
                    {user?.fullName || user?.username || 'Citizen'}
                  </h3>
                  <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 font-monospace small">
                    <ShieldCheck size={14} className="inline me-1" />
                    Verified Citizen
                  </span>
                  {currentUserId && (
                    <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-3 py-1 font-monospace small">
                      Account ID: #{String(currentUserId).slice(-6)}
                    </span>
                  )}
                  {user?.isAdmin && (
                    <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1 small">
                      Admin Access
                    </span>
                  )}
                </div>
                <p className="text-slate-300 small mb-0 mt-1">
                  Showing complaints submitted exclusively by your account. Track your grievance resolutions in real-time.
                </p>
              </div>
            </div>

            {/* Actions: Sync, Report Grievance, Public Feed Link, Logout */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn btn-outline-light rounded-pill px-3 shadow-sm d-flex align-items-center gap-1.5"
                title="Refresh your filed grievances"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>

              <Link
                to="/submit"
                className="btn btn-primary rounded-pill px-4 shadow-sm d-flex align-items-center gap-2 fw-semibold"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none' }}
              >
                <PlusCircle size={18} />
                <span>Report Grievance</span>
              </Link>

              <Link
                to="/"
                className="btn btn-outline-secondary text-white border-secondary rounded-pill px-3 shadow-sm d-flex align-items-center gap-1.5"
                title="Explore public city-wide feed"
              >
                <Layers size={15} />
                <span>Public Feed</span>
              </Link>

              <button
                onClick={logout}
                className="btn btn-outline-danger rounded-pill px-3 shadow-sm"
                title="Sign Out"
              >
                <i className="fas fa-sign-out-alt me-1"></i> Logout
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 2. CITIZEN IMPACT METRICS (ONLY FOR THIS ACCOUNT ID) */}
      <div className="row g-3 mb-4">
        {/* Total Filed */}
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">My Filed Issues</span>
                <h2 className="fw-bold text-primary mb-0 mt-1">{totalCount}</h2>
                <small className="text-muted">By this account</small>
              </div>
              <div className="p-3 bg-primary-subtle text-primary rounded-4">
                <FileText size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Resolved &amp; Addressed</span>
                <h2 className="fw-bold text-success mb-0 mt-1">{resolvedCount}</h2>
                <small className="text-success fw-semibold">
                  {totalCount > 0 ? `${resolutionRate}% resolved` : '0 resolved'}
                </small>
              </div>
              <div className="p-3 bg-success-subtle text-success rounded-4">
                <CheckCircle2 size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">In Field Action</span>
                <h2 className="fw-bold text-warning mb-0 mt-1">{inProgressCount}</h2>
                <small className="text-muted">Assigned to field teams</small>
              </div>
              <div className="p-3 bg-warning-subtle text-warning rounded-4">
                <Clock size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Community Upvotes Received */}
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="card-body p-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Upvotes Earned</span>
                <h2 className="fw-bold text-info mb-0 mt-1">{totalUpvotesEarned}</h2>
                <small className="text-muted">Citizen endorsements</small>
              </div>
              <div className="p-3 bg-info-subtle text-info rounded-4">
                <ThumbsUp size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACCOUNT VIEW NAVIGATION & CONTROLS */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 p-2 bg-white">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                onClick={() => setActiveTab('complaints')}
                className={`nav-link rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 ${
                  activeTab === 'complaints' ? 'active bg-primary text-white shadow-sm' : 'text-secondary'
                }`}
              >
                <User size={16} />
                <span>My Filed Grievances</span>
                <span className="badge bg-light text-dark rounded-pill ms-1">{complaints.length}</span>
              </button>
            </li>

            <li className="nav-item">
              <button
                onClick={() => setActiveTab('map')}
                className={`nav-link rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 ${
                  activeTab === 'map' ? 'active bg-primary text-white shadow-sm' : 'text-secondary'
                }`}
              >
                <Map size={16} />
                <span>My Grievance Map</span>
                <span className="badge bg-light text-dark rounded-pill ms-1">{complaints.length}</span>
              </button>
            </li>
          </ul>

          {/* Grid vs Table Layout Switcher */}
          {activeTab === 'complaints' && (
            <div className="btn-group p-1 bg-light rounded-pill border">
              <button
                onClick={() => setLayoutView('grid')}
                className={`btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1 ${
                  layoutView === 'grid' ? 'btn-white bg-white shadow-sm fw-bold text-primary' : 'text-muted'
                }`}
              >
                <LayoutGrid size={15} />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setLayoutView('table')}
                className={`btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1 ${
                  layoutView === 'table' ? 'btn-white bg-white shadow-sm fw-bold text-primary' : 'text-muted'
                }`}
              >
                <List size={15} />
                <span>Table</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 4. MAP VIEW TAB (ONLY MY COMPLAINTS) */}
      {activeTab === 'map' && (
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <div className="card-body p-0">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <MapPin className="text-danger" size={20} />
                  Your Filed Grievances on Map
                </h5>
                <p className="text-muted small mb-0">
                  Showing geographic coordinates of grievances submitted by this account
                </p>
              </div>
            </div>
            {complaints.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <Map size={48} className="opacity-50 mb-2" />
                <p>No complaints filed from this account to display on the map.</p>
              </div>
            ) : (
              <div style={{ height: '480px', borderRadius: '16px', overflow: 'hidden' }}>
                <MapView complaints={complaints} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ACCOUNT GRIEVANCE FEED (GRID OR TABLE) */}
      {activeTab === 'complaints' && (
        <div>
          
          {/* SEARCH & FILTERS (Active when user has complaints) */}
          {complaints.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
              <div className="row g-2 align-items-center">
                
                {/* Search Bar */}
                <div className="col-lg-5 col-md-6">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Search size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search your complaints by title, location, category..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="form-control bg-light border-start-0"
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
                    className="form-select form-select-sm rounded-3"
                  >
                    {STATUS_FILTERS.map((st) => (
                      <option key={st} value={st}>
                        {st === 'All' ? 'All Statuses' : st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="col-lg-2 col-md-3 col-6">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-select form-select-sm rounded-3"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Selector */}
                <div className="col-lg-3 col-md-12">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="form-select form-select-sm rounded-3"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="priority">Sort: Highest Priority</option>
                    <option value="upvotes">Sort: Most Upvoted</option>
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* LOADING & EMPTY STATES */}
          {loading ? (
            <div className="text-center py-5 bg-white rounded-4 shadow-sm">
              <i className="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i>
              <p className="text-muted mb-0">Loading your account grievances...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-5 bg-white rounded-4 shadow-sm p-4">
              <div className="p-3 bg-light rounded-circle d-inline-block text-muted mb-3">
                <FileText size={48} className="opacity-50 text-primary" />
              </div>
              <h5 className="fw-bold text-dark">No Grievances Registered by this Account</h5>
              <p className="text-muted small" style={{ maxWidth: '460px', margin: '0 auto' }}>
                You have not filed any complaints yet under this account ({user?.username ? `@${user.username}` : 'user'}). When you submit a civic issue, it will be tracked here exclusively.
              </p>
              <div className="mt-4">
                <Link to="/submit" className="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">
                  <PlusCircle size={16} className="inline me-1" />
                  Report Your First Grievance &rarr;
                </Link>
              </div>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-5 bg-white rounded-4 shadow-sm p-4">
              <h6 className="fw-bold text-dark">No matching grievances found</h6>
              <p className="text-muted small">Try adjusting your search query or status filter.</p>
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                  setCategoryFilter('All');
                }}
                className="btn btn-sm btn-outline-primary rounded-pill px-3"
              >
                Reset Filters
              </button>
            </div>
          ) : layoutView === 'grid' ? (
            
            /* ==================== CARD GRID VIEW ==================== */
            <div className="row g-4">
              {filteredComplaints.map((c) => {
                const hasUp = user && (c.upvotes || []).includes(user.id || user._id);
                const upCount = c.upvotesCount || (c.upvotes && c.upvotes.length) || 0;

                // 4-stage pipeline progress percentage
                const stageWeights = { Submitted: 25, 'In Review': 50, 'In Progress': 75, Resolved: 100, Rejected: 100 };
                const progressPct = stageWeights[c.status] || 25;

                return (
                  <div key={c._id} className="col-md-6 col-lg-4">
                    <div
                      onClick={() => {
                        setSelectedComplaint(c);
                        setIsModalOpen(true);
                      }}
                      className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden cursor-pointer transition-all hover:shadow-md bg-white d-flex flex-column"
                      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      
                      {/* Photo Thumbnail (if attached) */}
                      {c.imageUrl && (
                        <div style={{ height: '170px', overflow: 'hidden', position: 'relative' }}>
                          <img
                            src={c.imageUrl}
                            alt={c.title}
                            className="w-100 h-100 object-cover"
                            style={{ objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.parentElement.style.display = 'none';
                            }}
                          />
                          <div
                            className="position-absolute bottom-0 start-0 end-0 p-2 text-white small"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
                          >
                            <i className="fas fa-camera me-1"></i> Attached Evidence
                          </div>
                        </div>
                      )}

                      <div className="card-body p-4 d-flex flex-column flex-grow-1">
                        
                        {/* Top Badges */}
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1">
                            {c.category}
                          </span>

                          <span
                            className={`badge rounded-pill px-2.5 py-1 ${
                              c.priority === 'Urgent'
                                ? 'bg-danger'
                                : c.priority === 'High'
                                ? 'bg-warning text-dark'
                                : 'bg-secondary'
                            }`}
                          >
                            {c.priority === 'Urgent' && <Flame size={12} className="inline me-1" />}
                            {c.priority} Priority
                          </span>
                        </div>

                        {/* Title */}
                        <h6 className="fw-bold text-dark mb-2 line-clamp-2" style={{ lineHeight: '1.4' }}>
                          {c.title}
                        </h6>

                        {/* Description Preview */}
                        <p className="text-secondary small mb-3 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.description}
                        </p>

                        {/* Location & Department */}
                        <div className="small text-muted mb-3">
                          <div className="d-flex align-items-center gap-1 mb-1 text-truncate">
                            <MapPin size={14} className="text-danger flex-shrink-0" />
                            <span className="text-truncate">{c.location}</span>
                          </div>
                          <div className="d-flex align-items-center gap-1 text-truncate">
                            <Building size={14} className="text-primary flex-shrink-0" />
                            <span className="text-truncate">{c.department || 'Municipal Dept'}</span>
                          </div>
                        </div>

                        {/* Lifecycle Progress Bar */}
                        <div className="mb-3 pt-2 border-top">
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Lifecycle Status</span>
                            <span
                              className={`fw-bold ${
                                c.status === 'Resolved'
                                  ? 'text-success'
                                  : c.status === 'In Progress'
                                  ? 'text-warning'
                                  : 'text-primary'
                              }`}
                              style={{ fontSize: '0.75rem' }}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div className="progress" style={{ height: '6px', borderRadius: '4px' }}>
                            <div
                              className={`progress-bar ${
                                c.status === 'Resolved'
                                  ? 'bg-success'
                                  : c.status === 'In Progress'
                                  ? 'bg-warning'
                                  : 'bg-primary'
                              }`}
                              role="progressbar"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Bottom Actions: Upvote & Quick View */}
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                          <button
                            onClick={(e) => handleUpvote(c._id, e)}
                            disabled={upvoteLoading[c._id]}
                            className={`btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1.5 ${
                              hasUp ? 'btn-primary' : 'btn-outline-primary'
                            }`}
                          >
                            <ThumbsUp size={14} />
                            <span>{upCount}</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setIsModalOpen(true);
                            }}
                            className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
                          >
                            <Eye size={14} />
                            <span>Inspect</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            
            /* ==================== LIST / TABLE VIEW ==================== */
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: '240px' }}>Title &amp; Location</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Resolution Status</th>
                      <th>Upvotes</th>
                      <th>Date</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setIsModalOpen(true);
                            }}
                            className="btn btn-link text-dark fw-bold text-decoration-none p-0 text-start d-block"
                          >
                            {c.title}
                          </button>
                          <small className="text-muted d-flex align-items-center gap-1">
                            <MapPin size={12} className="text-danger" /> {c.location}
                          </small>
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
                        <td>
                          <button
                            onClick={(e) => handleUpvote(c._id, e)}
                            className="btn btn-sm btn-light border rounded-pill px-2 py-0.5 small d-inline-flex align-items-center gap-1"
                          >
                            <ThumbsUp size={12} className="text-primary" />
                            <span>{c.upvotesCount || 0}</span>
                          </button>
                        </td>
                        <td className="small text-muted">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setIsModalOpen(true);
                            }}
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
          )}

        </div>
      )}

      {/* 6. CITIZEN COMPLAINT INSPECTION MODAL */}
      <CitizenComplaintModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedComplaint(null);
        }}
        onUpdate={fetchAccountComplaints}
      />

      {/* 7. FLOATING AI CIVIC ASSISTANT BOT */}
      <AIChatModal />

    </div>
  );
};

export default Dashboard;
