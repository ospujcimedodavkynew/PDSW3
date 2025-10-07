import React from 'react';

const Logo: React.FC<{ width?: number | string; height?: number | string }> = ({ width = "100%", height = "auto" }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 400 100" 
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
    >
      {/* Van Icon - derived from favicon.svg, slightly cleaned up */}
      <g transform="translate(10, 15) scale(1.5)">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 18H9" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.34a1 1 0 0 0-.17-.53L18.83 11H15V6a2 2 0 0 0-2-2h-1" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="17" cy="18" r="2" fill="none" stroke="#1E40AF" strokeWidth="2"/>
        <circle cx="7" cy="18" r="2" fill="none" stroke="#1E40AF" strokeWidth="2"/>
      </g>
      
      {/* Text: pujcimedodavky.cz */}
      <text 
        x="60" 
        y="65" 
        fontSize="36" 
        fontWeight="bold" 
        fill="#111827" 
        textAnchor="start"
      >
        pujcimedodavky
        <tspan fill="#FBBF24">.cz</tspan>
      </text>
    </svg>
  );
};

export default Logo;