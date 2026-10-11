import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Custom SVG pin marker for Leaflet
const createPinIcon = (category) => {
  const colorMap = {
    Roads: '#f59e0b',
    Water: '#0ea5e9',
    Electricity: '#eab308',
    Waste: '#10b981',
    Parks: '#22c55e',
    Safety: '#ef4444',
    Construction: '#8b5cf6',
  };
  const color = colorMap[category] || '#3b82f6';

  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const MapView = ({ complaints = [] }) => {
  // Default coordinates centered on Coimbatore
  const defaultCenter = [11.0168, 76.9558];

  const validComplaints = complaints.filter(
    (c) =>
      c.coordinates &&
      typeof c.coordinates.latitude === 'number' &&
      typeof c.coordinates.longitude === 'number'
  );

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full min-h-[350px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validComplaints.map((c) => (
          <Marker
            key={c._id}
            position={[c.coordinates.latitude, c.coordinates.longitude]}
            icon={createPinIcon(c.category)}
          >
            <Popup className="custom-popup">
              <div className="p-1 max-w-[200px]">
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                    {c.category}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {c.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                  {c.title}
                </h4>
                <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">
                  {c.description}
                </p>
                <Link
                  to={`/complaint/${c._id}`}
                  className="text-xs font-semibold text-blue-600 hover:underline block"
                >
                  View Details &rarr;
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
