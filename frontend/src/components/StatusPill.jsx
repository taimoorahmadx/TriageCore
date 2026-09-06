import React from 'react';
import { CheckCircle2, AlertTriangle, GitPullRequest, Check, XCircle } from 'lucide-react';

export function StatusPill({ status }) {
  let bg = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let Icon = AlertTriangle;

  switch (status) {
    case 'Auto-Healed':
      bg = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
      Icon = CheckCircle2;
      break;
    case 'Auto-Fix Proposed':
      bg = 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80';
      Icon = GitPullRequest;
      break;
    case 'Escalated — Needs Review':
    case 'Escalated':
      bg = 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      Icon = AlertTriangle;
      break;
    case 'Merged':
      bg = 'bg-purple-950/70 text-purple-300 border-purple-800/80';
      Icon = Check;
      break;
    case 'Flagged for manual fix':
    case 'Rejected':
      bg = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
      Icon = XCircle;
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg}`}>
      <Icon className="w-3 h-3" />
      <span>{status}</span>
    </span>
  );
}
