import React from 'react';

export function TriageCoreLogo({ size = 28, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
    >
      {/* Obsidian Container Frame */}
      <rect 
        width="32" 
        height="32" 
        rx="8" 
        fill="#0D0D11" 
        stroke="rgba(255, 255, 255, 0.16)" 
        strokeWidth="1.2"
      />
      {/* Outer Hexagonal Core Geometry */}
      <path 
        d="M16 6L24.5 11V21L16 26L7.5 21V11L16 6Z" 
        stroke="rgba(255, 255, 255, 0.85)" 
        strokeWidth="1.3" 
        strokeLinejoin="round"
      />
      {/* Converging Tri-Axis Decision Stream */}
      <path 
        d="M16 6V16M16 16L24.5 21M16 16L7.5 21" 
        stroke="rgba(255, 255, 255, 0.28)" 
        strokeWidth="1" 
        strokeLinejoin="round"
      />
      {/* Telemetry Orbit Ring */}
      <circle 
        cx="16" 
        cy="16" 
        r="5" 
        stroke="#F59E0B" 
        strokeOpacity="0.4" 
        strokeWidth="0.9" 
        strokeDasharray="2 2"
      />
      {/* Center Radiant Decision Nexus */}
      <circle cx="16" cy="16" r="2.5" fill="#F59E0B" />
      <circle cx="16" cy="16" r="0.9" fill="#FFFFFF" />
    </svg>
  );
}
