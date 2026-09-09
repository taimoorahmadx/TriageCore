import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Globe, GitPullRequest, ArrowLeft, Terminal, Database, ShieldCheck } from 'lucide-react';

const TRIAGE_AUDIT_LOG = [
  {
    id: 'run-108',
    time: '2 mins ago',
    source: 'QA',
    target: 'tests/dummy/page_safe_heal.html',
    incident: "Button renamed from '#submit-btn' to '#order-btn-primary'. Zero console errors.",
    score: 95,
    diagnosis: 'stale_selector',
    action: 'Auto-Heal Approved',
    actionType: 'heal',
    trace: 'DOM semantics match purchase intent. Post-click verification confirmed successful submission with 0 console errors. Auto-heal patch applied.',
    evidenceJson: {
      evidence_type: 'dom_mutation',
      source: 'qa',
      raw_signals: {
        original_selector: '#submit-btn',
        resolved_selector: '#order-btn-primary',
        semantic_similarity: 0.98,
        console_error_count: 0
      },
      context: { page: 'tests/dummy/page_safe_heal.html', headless: true }
    }
  },
  {
    id: 'run-107',
    time: '18 mins ago',
    source: 'QA',
    target: 'tests/dummy/page_regression_trap.html',
    incident: "Button renamed, but click triggered uncaught 'ReferenceError: processPayment is not defined'.",
    score: 15,
    diagnosis: 'likely_regression',
    action: 'Blocked & Escalated',
    actionType: 'escalate',
    trace: 'Console reveals runtime ReferenceError upon clicking the relocated selector. Auto-heal blocked to avoid deploying broken payment flow.',
    evidenceJson: {
      evidence_type: 'dom_mutation_with_console_error',
      source: 'qa',
      raw_signals: {
        original_selector: '#submit-btn',
        resolved_selector: '#order-btn-primary',
        semantic_similarity: 0.96,
        console_error_count: 1,
        uncaught_exception: 'ReferenceError: processPayment is not defined'
      },
      context: { page: 'tests/dummy/page_regression_trap.html', headless: true }
    }
  },
  {
    id: 'run-106',
    time: '1 hour ago',
    source: 'CI',
    target: 'taimoorahmadx/TriageCore (ci.yml #1043)',
    incident: 'Commit 4a8f9b introduced missing comma in database migrations, breaking pytest.',
    score: 96,
    diagnosis: 'bug',
    action: 'Auto-Fix PR Opened',
    actionType: 'heal',
    trace: 'Clean stack trace matching commit 4a8f9b. Single author regression. Draft PR #142 opened; autonomous merge prohibited.',
    evidenceJson: {
      evidence_type: 'ci_pytest_failure',
      source: 'ci',
      raw_signals: {
        failing_step: 'pytest tests/test_db.py',
        commit_sha: '4a8f9b',
        author: 'alice@triagecore.internal',
        syntax_error_file: 'src/db/migrations/004.sql:42',
        repro_rate: 1.0
      },
      context: { ambiguous_commit: false, truncated: false }
    }
  },
  {
    id: 'run-105',
    time: '3 hours ago',
    source: 'CI',
    target: 'taimoorahmadx/TriageCore (ci.yml #1042)',
    incident: 'Redis socket timeout in integration suite. Same commit passed 9/10 previous runs.',
    score: 92,
    diagnosis: 'flaky',
    action: 'Rerun Job',
    actionType: 'rerun',
    trace: 'Intermittent infrastructure connection failure. Historical pass rate 90% with zero application code changes.',
    evidenceJson: {
      evidence_type: 'ci_network_timeout',
      source: 'ci',
      raw_signals: {
        failing_step: 'pytest tests/test_cache.py',
        error_type: 'redis.exceptions.ConnectionError',
        historical_pass_rate: 0.90,
        app_code_changes: 0
      },
      context: { ambiguous_commit: false, truncated: false }
    }
  },
  {
    id: 'run-104',
    time: '5 hours ago',
    source: 'CI',
    target: 'taimoorahmadx/TriageCore (ci.yml #1044)',
    incident: 'Two developers modified core/tenant_context.py simultaneously in PR #108.',
    score: 15,
    diagnosis: 'bug',
    action: 'Escalated to Human',
    actionType: 'escalate',
    trace: 'ambiguous_commit=true flagged. Score 15% is below the 85% safety threshold required for automated PRs. Escalated with unified diff.',
    evidenceJson: {
      evidence_type: 'ci_merge_conflict_regression',
      source: 'ci',
      raw_signals: {
        failing_step: 'pytest tests/test_auth.py',
        error_type: 'AttributeError',
        authors: ['alice@triagecore.internal', 'bob@triagecore.internal'],
        conflicting_commits: ['7c1a2e', '9b4f02']
      },
      context: { ambiguous_commit: true, truncated: false }
    }
  },
  {
    id: 'run-103',
    time: 'Yesterday',
    source: 'QA',
    target: 'tests/dummy/page_safe_heal.html',
    incident: "Profile dropdown button selector changed from '#user-nav' to '#account-menu-trigger'.",
    score: 91,
    diagnosis: 'stale_selector',
    action: 'Auto-Heal Approved',
    actionType: 'heal',
    trace: 'Aria-role and accessibility label confirmed exact match. Click successfully revealed user menu without errors.',
    evidenceJson: {
      evidence_type: 'dom_mutation',
      source: 'qa',
      raw_signals: {
        original_selector: '#user-nav',
        resolved_selector: '#account-menu-trigger',
        semantic_similarity: 0.94,
        console_error_count: 0
      },
      context: { page: 'tests/dummy/page_safe_heal.html', headless: true }
    }
  }
];

export function ReliabilityDashboard({ onNavigate }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'qa' | 'ci'
  const [expandedId, setExpandedId] = useState(null);

  const filteredRuns = TRIAGE_AUDIT_LOG.filter(item => {
    if (filter === 'qa') return item.source === 'QA';
    if (filter === 'ci') return item.source === 'CI';
    return true;
  });

  const toggleRow = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Triage Decision History</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 font-mono font-medium border border-white/[0.1] flex items-center gap-1.5">
              <Database className="w-3 h-3 text-neutral-400" />
              <span>Postgres Audit Log</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Immutable audit record of every decision evaluated by ConfidenceEngine across QA browser runs and GitHub CI builds.
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

      {/* 4 Grounded Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-neutral-400 uppercase">Total Decisions</span>
          <div className="text-2xl font-bold font-mono text-white">6 Runs</div>
          <p className="text-[10px] text-neutral-500 font-mono">triage_decisions table</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 uppercase">Autonomous Heals</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">3 Approved</div>
          <p className="text-[10px] text-neutral-500 font-mono">Score &ge; 85% threshold</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-rose-400 uppercase">Escalations Blocked</span>
          <div className="text-2xl font-bold font-mono text-rose-400">2 Blocked</div>
          <p className="text-[10px] text-neutral-500 font-mono">Regressions &amp; conflicts</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-blue-400 uppercase">Automated Reruns</span>
          <div className="text-2xl font-bold font-mono text-blue-400">1 Rerun</div>
          <p className="text-[10px] text-neutral-500 font-mono">Transient network flakes</p>
        </div>

      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
              filter === 'all' 
                ? 'bg-white text-black font-semibold shadow-sm' 
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            All Decisions ({TRIAGE_AUDIT_LOG.length})
          </button>
          <button
            onClick={() => setFilter('qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
              filter === 'qa' 
                ? 'bg-white text-black font-semibold shadow-sm' 
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            QA Browser Runs (3)
          </button>
          <button
            onClick={() => setFilter('ci')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all ${
              filter === 'ci' 
                ? 'bg-white text-black font-semibold shadow-sm' 
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            CI Build Triage (3)
          </button>
        </div>
        <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
          Click row to inspect Postgres JSON record
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-neutral-950 border border-white/[0.1] rounded-xl overflow-hidden divide-y divide-white/[0.06]">
        {filteredRuns.map((run) => {
          const isExpanded = expandedId === run.id;
          const isApproved = run.score >= 85;

          return (
            <div key={run.id} className="transition-colors">
              <div
                onClick={() => toggleRow(run.id)}
                className="p-4 hover:bg-white/[0.03] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                      {run.id}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      run.source === 'QA' 
                        ? 'bg-blue-950/60 border border-blue-500/30 text-blue-400' 
                        : 'bg-purple-950/60 border border-purple-500/30 text-purple-400'
                    }`}>
                      {run.source} Agent
                    </span>
                    <span className="text-xs font-mono text-neutral-300 font-semibold">{run.target}</span>
                    <span className="text-[11px] text-neutral-500">&middot; {run.time}</span>
                  </div>
                  <div className="text-xs text-neutral-300 font-mono line-clamp-1">
                    {run.incident}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                  <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${isApproved ? 'text-emerald-400' : 'text-rose-500'}`}>
                      Score: {run.score}%
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">{run.diagnosis}</div>
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

                  <div className="text-neutral-500 group-hover:text-white transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Inline Postgres Record Expansion */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 bg-black/60 border-t border-white/[0.04] space-y-3 font-mono text-xs animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                        <span>LLM Reasoning Trace</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-white/[0.08]">
                        "{run.trace}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Postgres Record (`triage_decisions.evidence_json`)</span>
                      </div>
                      <pre className="text-[11px] text-neutral-300 bg-neutral-950 p-3 rounded-lg border border-white/[0.08] overflow-x-auto whitespace-pre">
                        {JSON.stringify(run.evidenceJson, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
