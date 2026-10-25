import React from 'react';

export function StatusPill({ status }) {
  let dotColor = 'bg-neutral-400';
  let badgeStyle = 'bg-white/[0.05] text-neutral-300 border-white/[0.1]';

  switch (status) {
    case 'Auto-Healed':
      dotColor = 'bg-[#30d158]';
      badgeStyle = 'bg-[#30d158]/12 text-[#30d158] border-[#30d158]/30';
      break;
    case 'Auto-Fix Proposed':
      dotColor = 'bg-[#0a84ff]';
      badgeStyle = 'bg-[#0a84ff]/12 text-[#0a84ff] border-[#0a84ff]/30';
      break;
    case 'Escalated — Needs Review':
    case 'Escalated':
      dotColor = 'bg-[#ff453a]';
      badgeStyle = 'bg-[#ff453a]/12 text-[#ff453a] border-[#ff453a]/30';
      break;
    case 'Merged':
      dotColor = 'bg-neutral-400';
      badgeStyle = 'bg-white/[0.06] text-neutral-300 border-white/[0.12]';
      break;
    case 'Flagged for manual fix':
    case 'Rejected':
      dotColor = 'bg-[#ff9f0a]';
      badgeStyle = 'bg-[#ff9f0a]/12 text-[#ff9f0a] border-[#ff9f0a]/30';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border tracking-tight ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
}
