import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';

const Home = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, navigate]);

  const [stats, setStats] = useState({
    total_complaints: 0,
    resolved: 0,
    in_progress: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [complaintsRes, statsRes] = await Promise.all([
          API.get('/complaints'),
          API.get('/analytics/stats'),
        ]);

        if (complaintsRes.data.success) {
          setComplaints(complaintsRes.data.complaints);
        }
        if (statsRes.data.success) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container py-4">
      {/* Hero Section */}
      <div className="hero-section text-center py-5 bg-white shadow-sm rounded-4 mb-5 border">
        <h1 className="display-4 fw-bold text-primary">
          <i className="fas fa-heartbeat me-2"></i>Welcome to CivicPulse
        </h1>
        <p className="lead text-dark mt-2">
          AI-Powered Community Complaint &amp; Governance Analytics Platform
        </p>
        <p className="text-muted">
          Making civic engagement smarter, faster, and more effective.
        </p>

        {!user ? (
          <div className="mt-4">
            <Link to="/register" className="btn btn-primary btn-lg px-4 me-3 rounded-pill shadow-sm">
              <i className="fas fa-user-plus me-1"></i> Join Now
            </Link>
            <Link to="/login" className="btn btn-outline-primary btn-lg px-4 rounded-pill">
              <i className="fas fa-sign-in-alt me-1"></i> Login
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <Link to="/submit" className="btn btn-primary btn-lg px-4 rounded-pill shadow-sm">
              <i className="fas fa-plus-circle me-1"></i> Submit New Complaint
            </Link>
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm text-center p-4">
            <div
              className="bg-primary bg-gradient text-white rounded-circle p-3 mb-3 mx-auto d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '70px', height: '70px' }}
            >
              <i className="fas fa-robot fa-2x"></i>
            </div>
            <h3 className="card-title fw-bold">AI-Powered</h3>
            <p className="card-text text-muted">
              Smart categorization, priority prediction, and spam detection using advanced machine learning algorithms.
            </p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm text-center p-4">
            <div
              className="bg-success bg-gradient text-white rounded-circle p-3 mb-3 mx-auto d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '70px', height: '70px' }}
            >
              <i className="fas fa-map-marked-alt fa-2x"></i>
            </div>
            <h3 className="card-title fw-bold">Geospatial Tracking</h3>
            <p className="card-text text-muted">
              Pinpoint complaint locations on interactive maps. View high-density problem areas in real-time.
            </p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm text-center p-4">
            <div
              className="bg-info bg-gradient text-white rounded-circle p-3 mb-3 mx-auto d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '70px', height: '70px' }}
            >
              <i className="fas fa-chart-line fa-2x"></i>
            </div>
            <h3 className="card-title fw-bold">Advanced Analytics</h3>
            <p className="card-text text-muted">
              Comprehensive dashboards with real-time insights, performance metrics, and SLA tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="row g-4 mb-5">
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h2 className="display-6 fw-bold text-primary">{stats.total_complaints}</h2>
              <p className="text-muted mb-0">Total Complaints</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h2 className="display-6 fw-bold text-success">{stats.resolved}</h2>
              <p className="text-muted mb-0">Resolved</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h2 className="display-6 fw-bold text-warning">{stats.in_progress}</h2>
              <p className="text-muted mb-0">In Progress</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-center border-0 shadow-sm p-3">
            <div className="card-body">
              <h2 className="display-6 fw-bold text-danger">{stats.pending}</h2>
              <p className="text-muted mb-0">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="card border-0 shadow-sm p-4 mb-5">
        <div className="card-body">
          <h3 className="card-title fw-bold mb-3">
            <i className="fas fa-map-pin text-primary me-2"></i>Complaint Map
          </h3>
          <div style={{ height: '400px' }} className="rounded-3 overflow-hidden border">
            <MapView complaints={complaints} />
          </div>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="card border-0 shadow-sm p-4">
        <div className="card-body">
          <h3 className="card-title fw-bold mb-4">
            <i className="fas fa-list text-primary me-2"></i>Recent Complaints
          </h3>

          {loading ? (
            <p className="text-muted text-center py-4">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p className="text-muted text-center py-4">No complaints recorded yet.</p>
          ) : (
            <div className="row g-4">
              {complaints.map((c) => (
                <div key={c._id} className="col-md-6 col-lg-4">
                  <div className="card h-100 border shadow-sm">
                    <div className="card-body d-flex flex-col justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-primary">{c.category}</span>
                          <span className={`badge ${c.status === 'Resolved' ? 'bg-success' : c.status === 'In Progress' ? 'bg-warning' : 'bg-secondary'}`}>
                            {c.status}
                          </span>
                        </div>
                        <h5 className="card-title fw-bold">{c.title}</h5>
                        <p className="card-text text-muted small line-clamp-2">
                          {c.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center small text-muted">
                        <span><i className="fas fa-map-marker-alt me-1"></i> {c.location}</span>
                        <Link to={`/complaint/${c._id}`} className="btn btn-sm btn-outline-primary rounded-pill">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
