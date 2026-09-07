import React from 'react';
import { ShieldCheck, GitBranch } from 'lucide-react';

export function AgentBadge({ type, size = "md" }) {
  const isQA = type === 'qa' || type === 'QA';
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium tracking-wide border ${
        isQA
          ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
          : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
      } ${sizeClasses}`}
    >
      {isQA ? (
        <ShieldCheck className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      ) : (
        <GitBranch className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      )}
      <span>{isQA ? 'QA AGENT' : 'CI AGENT'}</span>
    </span>
  );
}
