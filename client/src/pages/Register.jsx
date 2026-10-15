import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Username or email might already exist.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-3 py-sm-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
            <div className="card-body p-3.5 p-sm-4 p-md-5">
              <div className="d-flex justify-content-start mb-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm"
                  title="Go Back"
                >
                  <i className="fas fa-arrow-left me-1"></i> Back
                </button>
              </div>

              <div className="text-center mb-4">
                <img
                  src="/logo_icon.png"
                  alt="CivicPulse"
                  className="mx-auto mb-2.5 drop-shadow-sm"
                  style={{ width: '68px', height: '68px', objectFit: 'contain' }}
                />
                <h2 className="fw-bold text-primary">
                  <i className="fas fa-user-plus me-2"></i>Join CivicPulse
                </h2>
                <p className="text-muted">Create your account and start reporting</p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="fullName" className="form-label fw-bold">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="username" className="form-label fw-bold">
                    Username
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-bold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label fw-bold">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="address" className="form-label fw-bold">
                    Address
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main St, City"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label fw-bold">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter a strong password"
                    required
                  />
                  <small className="text-muted">Password must be at least 6 characters</small>
                </div>

                <div className="form-check mb-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="agreeTerms"
                    defaultChecked
                    required
                  />
                  <label className="form-check-label text-muted small" htmlFor="agreeTerms">
                    I agree to the CivicPulse Terms of Service and Privacy Policy
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg w-100 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #0d6efd, #4dabf7)',
                    border: 'none',
                    borderRadius: '40px',
                  }}
                >
                  <i className="fas fa-user-check me-2"></i>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <hr />

              <div className="text-center">
                <p className="text-muted mb-0">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary fw-bold text-decoration-none"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
