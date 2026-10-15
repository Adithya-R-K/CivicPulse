import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        <i className="fas fa-spinner fa-spin fa-2x me-2"></i>Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Root route handler: deployed link directly lands on login page (or user dashboard if already signed in)
const RootLanding = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        <i className="fas fa-spinner fa-spin fa-2x me-2"></i>Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <Navigate to="/login" replace />;
};

const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const isDashboardView =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/dashboard');

  if (isDashboardView) {
    return <main className="w-100 min-vh-100 p-0 m-0">{children}</main>;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">{children}</main>
      {/* Original CivicPulse Footer */}
      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6 mb-3 mb-md-0">
              <h5>
                <i className="fas fa-heartbeat me-2"></i>CivicPulse
              </h5>
              <p className="mb-1">
                AI-Powered Community Complaint &amp; Governance Analytics Platform
              </p>
              <p className="text-secondary small">
                Making civic engagement smarter and more efficient.
              </p>
            </div>
            <div className="col-md-3 mb-3 mb-md-0">
              <h5>Quick Links</h5>
              <ul className="list-unstyled">
                <li>
                  <Link to="/" className="text-white text-decoration-none">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-white text-decoration-none">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/submit" className="text-white text-decoration-none">
                    Submit Complaint
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-md-3">
              <h5>Contact</h5>
              <ul className="list-unstyled text-white-50">
                <li>
                  <i className="fas fa-envelope me-2"></i>support@civicpulse.gov
                </li>
                <li>
                  <i className="fas fa-phone me-2"></i>1-800-8098-15
                </li>
              </ul>
            </div>
          </div>
          <hr className="bg-secondary" />
          <div className="text-center text-white-50 small">
            &copy; 2026 CivicPulse. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LayoutWrapper>
          <Routes>
            {/* Deployed link lands on login page */}
            <Route path="/" element={<RootLanding />} />
            <Route path="/home" element={<Home />} />
            <Route path="/feed" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submit"
              element={
                <ProtectedRoute>
                  <SubmitComplaint />
                </ProtectedRoute>
              }
            />
            <Route path="/complaint/:id" element={<ComplaintDetail />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LayoutWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
