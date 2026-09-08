import React from 'react';

export function StatusPill({ status }) {
  let dotColor = 'bg-neutral-400';
  let badgeStyle = 'bg-white/[0.04] text-neutral-300 border-white/[0.08]';

  switch (status) {
    case 'Auto-Healed':
      dotColor = 'bg-emerald-400';
      badgeStyle = 'bg-emerald-500/[0.08] text-emerald-300 border-emerald-500/20';
      break;
    case 'Auto-Fix Proposed':
      dotColor = 'bg-neutral-300';
      badgeStyle = 'bg-white/[0.06] text-neutral-200 border-white/[0.12]';
      break;
    case 'Escalated — Needs Review':
    case 'Escalated':
      dotColor = 'bg-rose-400';
      badgeStyle = 'bg-rose-500/[0.08] text-rose-300 border-rose-500/20';
      break;
    case 'Merged':
      dotColor = 'bg-neutral-400';
      badgeStyle = 'bg-white/[0.05] text-neutral-300 border-white/[0.1]';
      break;
    case 'Flagged for manual fix':
    case 'Rejected':
      dotColor = 'bg-amber-400';
      badgeStyle = 'bg-amber-500/[0.08] text-amber-300 border-amber-500/20';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
}
