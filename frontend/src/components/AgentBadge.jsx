import React from 'react';

export function AgentBadge({ type, size = "md" }) {
  const isQA = type === 'qa' || type === 'QA';
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]";
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium tracking-tight bg-white/[0.04] border border-white/[0.08] text-neutral-300 ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isQA ? 'bg-amber-400' : 'bg-neutral-400'}`} />
      <span>{isQA ? 'QA AGENT' : 'CI AGENT'}</span>
    </span>
  );
}
