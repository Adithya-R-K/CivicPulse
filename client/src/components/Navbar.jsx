import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    logout();
    navigate('/login');
  };

  const isHomePage = location.pathname === '/' || location.pathname === '';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm sticky-top">
      <div className="container">
        {/* Back Button in Navbar when on subpages */}
        {!isHomePage && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-outline-light btn-sm me-2 rounded-pill px-3 py-1 shadow-sm"
            title="Go Back"
          >
            <i className="fas fa-arrow-left me-1"></i> Back
          </button>
        )}

        <Link
          className="navbar-brand fw-bold d-flex align-items-center gap-2"
          to={user ? (isAdmin ? "/admin" : "/dashboard") : "/login"}
        >
          <img
            src="/logo_icon.png"
            alt="CivicPulse"
            className="bg-white rounded-circle p-0.5 shadow-sm"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <span>CivicPulse</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${collapsed ? '' : 'show'}`}>
          <ul className="navbar-nav me-auto">
            {user && (
              <li className="nav-item">
                <Link className="nav-link" to="/home" onClick={() => setCollapsed(true)}>
                  Public Feed
                </Link>
              </li>
            )}

            {user && (
              <>
                {isAdmin ? (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin" onClick={() => setCollapsed(true)}>
                        Admin Dashboard
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin?tab=complaints" onClick={() => setCollapsed(true)}>
                        Manage Complaints
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/dashboard" onClick={() => setCollapsed(true)}>
                        Dashboard
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/submit" onClick={() => setCollapsed(true)}>
                        Submit Complaint
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>

          <ul className="navbar-nav align-items-center">
            {user ? (
              <>
                <li className="nav-item me-2 text-white small d-none d-lg-inline-block">
                  <i className="fas fa-user-circle me-1"></i>
                  <strong>{user.username}</strong>
                  {isAdmin && (
                    <span className="badge bg-danger ms-1.5 small">Admin</span>
                  )}
                </li>

                {/* Prominent Direct Logout Button in Navbar */}
                <li className="nav-item">
                  <button
                    onClick={handleLogout}
                    className="btn btn-danger btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center"
                    title="Sign Out of CivicPulse"
                  >
                    <i className="fas fa-sign-out-alt me-1.5"></i> Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/login"
                    onClick={() => setCollapsed(true)}
                  >
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/register"
                    onClick={() => setCollapsed(true)}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
