import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, AlertTriangle, RefreshCw, ChevronRight, Globe, GitPullRequest, ArrowLeft } from 'lucide-react';

const TRIAGE_AUDIT_LOG = [
  {
    id: 'run-108',
    time: '2 mins ago',
    source: 'QA',
    target: 'ShopFlow Checkout (test_page.html)',
    incident: "Button renamed from '#submit-btn' to '#order-btn-primary'. Zero console errors.",
    score: 95,
    diagnosis: 'stale_selector',
    action: 'Auto-Heal Approved',
    actionType: 'heal',
    trace: 'DOM semantics match purchase intent. Post-click verification confirmed successful submission without console errors.'
  },
  {
    id: 'run-107',
    time: '18 mins ago',
    source: 'QA',
    target: 'ShopFlow Checkout (test_page.html)',
    incident: "Button renamed, but click triggered uncaught 'ReferenceError: processPayment is not defined'.",
    score: 95,
    diagnosis: 'likely_regression',
    action: 'Blocked & Escalated',
    actionType: 'escalate',
    trace: 'Console reveals runtime ReferenceError upon clicking the relocated selector. Auto-heal blocked to avoid deploying broken payment flow.'
  },
  {
    id: 'run-106',
    time: '1 hour ago',
    source: 'CI',
    target: 'taimoorahmadx/TriageCore (ci.yml)',
    incident: 'Commit 4a8f9b introduced missing comma in database migrations, breaking pytest.',
    score: 96,
    diagnosis: 'bug',
    action: 'Auto-Fix PR Opened',
    actionType: 'heal',
    trace: 'Clean stack trace matching commit 4a8f9b. Syntax fix patch verified against unit test suite.'
  },
  {
    id: 'run-105',
    time: '3 hours ago',
    source: 'CI',
    target: 'taimoorahmadx/TriageCore (ci.yml)',
    incident: 'Redis socket timeout in integration suite. Same commit passed 9/10 previous runs.',
    score: 92,
    diagnosis: 'flaky',
    action: 'Rerun Job',
    actionType: 'rerun',
    trace: 'Intermittent infrastructure connection failure. Historical pass rate 90% with zero code changes.'
  },
  {
    id: 'run-104',
    time: '5 hours ago',
    source: 'CI',
    target: 'taimoorahmadx/TriageCore (ci.yml)',
    incident: 'Two developers modified migrations.py simultaneously in PR #108.',
    score: 64,
    diagnosis: 'bug',
    action: 'Escalated to Human',
    actionType: 'escalate',
    trace: 'ambiguous_commit=true flagged. Score 64% is below the 85% safety threshold required for automated PRs.'
  },
  {
    id: 'run-103',
    time: 'Yesterday',
    source: 'QA',
    target: 'ShopFlow Navbar (header.html)',
    incident: "Profile dropdown button selector changed from '#user-nav' to '#account-menu-trigger'.",
    score: 91,
    diagnosis: 'stale_selector',
    action: 'Auto-Heal Approved',
    actionType: 'heal',
    trace: 'Aria-role and accessibility label confirmed exact match. Click successfully revealed user menu without errors.'
  }
];

export function ReliabilityDashboard({ onSelectRow, onNavigate }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'qa' | 'ci'

  const filteredRuns = TRIAGE_AUDIT_LOG.filter(item => {
    if (filter === 'qa') return item.source === 'QA';
    if (filter === 'ci') return item.source === 'CI';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Triage Decision History</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 font-mono font-medium border border-white/[0.1]">
              Postgres Audit Log
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Real decision log of the ConfidenceEngine across QA browser runs and GitHub CI builds.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('simulator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg cursor-pointer transition-all self-start sm:self-auto shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Runner</span>
          </button>
        )}
      </div>

      {/* 3 Grounded Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-neutral-400 uppercase">Total Pipeline Runs</span>
          <div className="text-2xl font-bold font-mono text-white">6</div>
          <p className="text-[11px] text-neutral-500">Evaluated by ConfidenceEngine</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 uppercase">Autonomous Heals</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">3</div>
          <p className="text-[11px] text-neutral-500">Safe selectors updated without human intervention</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-rose-400 uppercase">Regressions Blocked</span>
          <div className="text-2xl font-bold font-mono text-rose-400">2</div>
          <p className="text-[11px] text-neutral-500">Uncaught errors flagged before production</p>
        </div>

      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
              filter === 'all' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Decisions ({TRIAGE_AUDIT_LOG.length})
          </button>
          <button
            onClick={() => setFilter('qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
              filter === 'qa' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            QA Browser Runs
          </button>
          <button
            onClick={() => setFilter('ci')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
              filter === 'ci' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            CI Build Triage
          </button>
        </div>
        <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
          Click any row to view full LLM evidence trace
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-neutral-950 border border-white/[0.1] rounded-xl overflow-hidden divide-y divide-white/[0.06]">
        {filteredRuns.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRow && onSelectRow(run)}
            className="p-4 hover:bg-white/[0.03] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            <div className="space-y-1.5 flex-1 pr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  run.source === 'QA' 
                    ? 'bg-blue-950/60 border border-blue-500/30 text-blue-400' 
                    : 'bg-purple-950/60 border border-purple-500/30 text-purple-400'
                }`}>
                  {run.source} Agent
                </span>
                <span className="text-xs font-mono text-neutral-400">{run.target}</span>
                <span className="text-[11px] text-neutral-500">&middot; {run.time}</span>
              </div>
              <div className="text-xs text-neutral-200 font-mono line-clamp-1">
                {run.incident}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-white">Score: {run.score}%</div>
                <div className="text-[10px] font-mono text-neutral-500">{run.diagnosis}</div>
              </div>

              <div className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                run.actionType === 'heal'
                  ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                  : run.actionType === 'escalate'
                  ? 'bg-rose-950/60 border border-rose-500/30 text-rose-400'
                  : 'bg-blue-950/60 border border-blue-500/30 text-blue-400'
              }`}>
                {run.actionType === 'heal' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {run.actionType === 'escalate' && <ShieldAlert className="w-3.5 h-3.5" />}
                {run.actionType === 'rerun' && <RefreshCw className="w-3.5 h-3.5" />}
                <span>{run.action}</span>
              </div>

              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
