import React from 'react';

export function ConfidenceDial({ score = 0, size = 160, isLoading = false, label = "Confidence" }) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  
  // High-precision status bands
  let strokeColor = '#10B981'; // emerald
  let bandLabel = 'AUTO-ACT (≥85%)';
  let bandColorClass = 'text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20';

  if (score < 60) {
    strokeColor = '#F43F5E'; // rose
    bandLabel = 'UNSAFE (<60%)';
    bandColorClass = 'text-rose-400 bg-rose-500/[0.08] border-rose-500/20';
  } else if (score < 85) {
    strokeColor = '#F59E0B'; // amber
    bandLabel = 'ESCALATE (60-84%)';
    bandColorClass = 'text-amber-400 bg-amber-500/[0.08] border-amber-500/20';
  }

  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative py-1 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        
        {/* Subtle radial glow */}
        <div 
          className="absolute inset-2 rounded-full blur-2xl transition-all duration-700 opacity-20 pointer-events-none" 
          style={{ backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.4)' : strokeColor }}
        />

        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isLoading ? 'rgba(255, 255, 255, 0.5)' : strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={isLoading ? circumference * 0.3 : offset}
            strokeLinecap="round"
            fill="transparent"
            className={`transition-all duration-700 ease-out ${isLoading ? 'animate-spin origin-center' : ''}`}
          />
        </svg>

        {/* Center label & score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <span className="text-xl font-mono font-bold text-white animate-pulse">...</span>
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">Evaluating</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline font-mono">
                <span className="text-3xl font-semibold tracking-tight text-white">{score}</span>
                <span className="text-sm font-normal text-neutral-400 ml-0.5">%</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase mt-0.5">{label}</span>
            </>
          )}
        </div>
      </div>

      {/* Band pill */}
      <div className={`mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${bandColorClass}`}>
        {isLoading ? 'ANALYZING TELEMETRY...' : bandLabel}
      </div>
    </div>
  );
}
