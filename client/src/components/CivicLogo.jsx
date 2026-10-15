import React from 'react';

const CivicLogo = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Golden Civic Crest Emblem */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Outer concentric rings */}
        <circle cx="32" cy="32" r="30" stroke="#E2B755" strokeWidth="1.8" />
        <circle cx="32" cy="32" r="27" fill="#0845A0" stroke="#F5D076" strokeWidth="1" />
        <circle cx="32" cy="32" r="23" stroke="#E2B755" strokeWidth="0.8" strokeDasharray="1.5 1.5" />

        {/* Civic Temple / Governance Dome Silhouette */}
        <path
          d="M32 14L34.5 18H29.5L32 14Z"
          fill="#F5D076"
        />
        <path
          d="M27 19H37L38 23H26L27 19Z"
          fill="#E2B755"
        />
        <path
          d="M24 24H40L41 29H23L24 24Z"
          fill="#F5D076"
        />
        {/* Pillars */}
        <rect x="25" y="30" width="2.5" height="11" fill="#E2B755" rx="0.5" />
        <rect x="29" y="30" width="2" height="11" fill="#F5D076" rx="0.5" />
        <rect x="33" y="30" width="2" height="11" fill="#F5D076" rx="0.5" />
        <rect x="36.5" y="30" width="2.5" height="11" fill="#E2B755" rx="0.5" />
        {/* Pedestal */}
        <rect x="21" y="42" width="22" height="3" fill="#E2B755" rx="1" />
        <rect x="18" y="46" width="28" height="2.5" fill="#F5D076" rx="1" />

        {/* Wreath foliage arcs */}
        <path
          d="M13 36C13 44 20 50 32 50C44 50 51 44 51 36"
          stroke="#F5D076"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default CivicLogo;
