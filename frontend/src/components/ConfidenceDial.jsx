import React from 'react';

export function ConfidenceDial({ score = 0, size = 150, isLoading = false, label = "Confidence" }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Color bands: <60 red, 60-84 amber, >=85 emerald
  let strokeColor = '#10B981'; // green
  let glowColor = 'rgba(16, 185, 129, 0.25)';
  let bandLabel = 'AUTO-ACT (≥85%)';
  let bandColorClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';

  if (score < 60) {
    strokeColor = '#EF4444'; // red
    glowColor = 'rgba(239, 68, 68, 0.25)';
    bandLabel = 'UNSAFE (<60%)';
    bandColorClass = 'text-rose-400 bg-rose-950/60 border-rose-800/60';
  } else if (score < 85) {
    strokeColor = '#F59E0B'; // amber
    glowColor = 'rgba(245, 158, 11, 0.25)';
    bandLabel = 'ESCALATE (60-84%)';
    bandColorClass = 'text-amber-400 bg-amber-950/60 border-amber-800/60';
  }

  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative py-2 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl transition-all duration-700" 
          style={{ backgroundColor: isLoading ? 'rgba(139, 92, 246, 0.3)' : glowColor }}
        />

        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isLoading ? '#8B5CF6' : strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={isLoading ? circumference * 0.25 : offset}
            strokeLinecap="round"
            fill="transparent"
            className={`transition-all duration-1000 ease-out ${isLoading ? 'animate-spin origin-center' : ''}`}
          />
        </svg>

        {/* Center label & score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center animate-pulse">
              <span className="text-2xl font-black text-purple-400">...</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evaluating</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline">
                <span className="text-3xl font-black tracking-tight text-white">{score}</span>
                <span className="text-sm font-semibold text-slate-400 ml-0.5">%</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">{label}</span>
            </>
          )}
        </div>
      </div>

      {/* Band pill */}
      <div className={`mt-3 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bandColorClass}`}>
        {isLoading ? 'ANALYZING DOM...' : bandLabel}
      </div>
    </div>
  );
}
