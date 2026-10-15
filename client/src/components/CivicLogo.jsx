import React from 'react';

const CivicLogo = ({ className = 'w-10 h-10', badge = true }) => {
  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 ${
        badge ? 'bg-white rounded-full p-1 shadow-sm' : ''
      } ${className}`}
    >
      <img
        src="/logo_icon.png"
        alt="CivicPulse Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default CivicLogo;

