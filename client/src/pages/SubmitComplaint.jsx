import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

// Custom Pin Marker
const pinIcon = L.divIcon({
  className: 'custom-pin',
  html: `
    <div style="background-color: #0d6efd; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <div style="background-color: white; width: 8px; height: 8px; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Component to handle clicks on the map to set coordinates
function LocationMarker({ position, setPosition, setLocation }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
    },
  });

  return position === null ? null : <Marker position={position} icon={pinIcon} />;
}

const CATEGORIES = [
  { value: 'Roads', label: 'Roads & Transportation' },
  { value: 'Water', label: 'Water & Sewage' },
  { value: 'Electricity', label: 'Electricity' },
  { value: 'Waste', label: 'Waste Management' },
  { value: 'Parks', label: 'Parks & Recreation' },
  { value: 'Safety', label: 'Public Safety' },
  { value: 'Construction', label: 'Building & Construction' },
  { value: 'Other', label: 'Other' },
];

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads');
  const [location, setLocation] = useState('Coimbatore');
  const [coordinates, setCoordinates] = useState([11.0168, 76.9558]); // Default: Coimbatore
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Handle local photo upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Detect GPS location from browser
  const handleDetectGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          setCoordinates([lat, lng]);
          setLocation((prev) => prev || `GPS: ${lat}, ${lng}`);
        },
        () => {
          alert('GPS detection unavailable or denied. Please click on the map to pin your location.');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title,
        description,
        category,
        location,
        latitude: coordinates[0],
        longitude: coordinates[1],
        imageUrl: imagePreview || '',
      };

      const { data } = await API.post('/complaints', payload);
      if (data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
            <div className="card-body p-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                >
                  <i className="fas fa-arrow-left me-1"></i> Back
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-outline-danger btn-sm rounded-pill px-3"
                >
                  <i className="fas fa-sign-out-alt me-1"></i> Logout
                </button>
              </div>

              {/* HEADER matching templates/submit_complaint.html */}
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary">
                  <i className="fas fa-file-alt me-2"></i>Submit New Complaint
                </h2>
                <p className="text-muted">
                  Raise civic issues transparently. Our AI ensures faster resolution.
                </p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Complaint Title */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Complaint Title *</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title of your complaint"
                    required
                  />
                  <small className="text-muted">e.g., Pothole on Main Street</small>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Category *</label>
                  <select
                    className="form-select form-select-lg"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Input & Map */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold mb-0">
                      <i className="fas fa-map-marker-alt text-primary me-1"></i>Location / Address *
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      className="btn btn-sm btn-outline-primary py-0 px-2"
                    >
                      <i className="fas fa-location-arrow me-1"></i>Detect GPS
                    </button>
                  </div>

                  <input
                    type="text"
                    className="form-control form-control-lg mb-2"
                    name="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter specific location or address..."
                    required
                  />

                  {/* Interactive Leaflet Map Picker */}
                  <div className="border rounded-3 overflow-hidden shadow-sm" style={{ height: '300px' }}>
                    <MapContainer
                      center={coordinates}
                      zoom={13}
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker
                        position={coordinates}
                        setPosition={setCoordinates}
                        setLocation={setLocation}
                      />
                    </MapContainer>
                  </div>
                  <small className="text-muted d-block mt-1">
                    <i className="fas fa-info-circle me-1"></i>
                    Click anywhere on the map to pin the exact GPS coordinates ({coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)})
                  </small>
                </div>

                {/* Coordinates Row */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm"
                      value={coordinates[0]}
                      onChange={(e) => setCoordinates([Number(e.target.value), coordinates[1]])}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm"
                      value={coordinates[1]}
                      onChange={(e) => setCoordinates([coordinates[0], Number(e.target.value)])}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Description *</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="5"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    required
                  ></textarea>
                  <small className="text-muted">
                    Clear details help authorities act faster
                  </small>
                </div>

                {/* Photo Upload with Preview */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <i className="fas fa-camera text-primary me-1"></i>Upload Photo / Evidence
                  </label>
                  <input
                    type="file"
                    className="form-control form-control-lg"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <small className="text-muted">JPG, PNG, GIF • Max 5MB</small>

                  {/* Thumbnail Preview */}
                  {imagePreview && (
                    <div className="mt-3 position-relative d-inline-block">
                      <img
                        src={imagePreview}
                        alt="Complaint Preview"
                        className="rounded-3 shadow-sm border"
                        style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle"
                        title="Remove Photo"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Checkboxes */}
                <div className="card bg-light border-0 p-3 mb-4 rounded-3">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="urgentCheck"
                    />
                    <label className="form-check-label fw-semibold text-danger small" htmlFor="urgentCheck">
                      <i className="fas fa-exclamation-circle me-1"></i>Mark as Urgent / Safety Hazard
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="verifyAccuracy"
                      defaultChecked
                      required
                    />
                    <label className="form-check-label text-muted small" htmlFor="verifyAccuracy">
                      I confirm that the location pin and uploaded evidence are authentic.
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mb-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-lg w-100 py-3 rounded-pill shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #0d6efd, #4dabf7)',
                      border: 'none',
                    }}
                  >
                    <i className="fas fa-paper-plane me-2"></i>
                    {submitting ? 'Submitting Complaint...' : 'Submit Complaint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
