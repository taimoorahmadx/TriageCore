import React from 'react';
import { ConfidenceDial } from './ConfidenceDial';
import { AgentBadge } from './AgentBadge';
import { StatusPill } from './StatusPill';
import { ArrowLeft, GitCommit, CheckCircle2, Terminal, Layers } from 'lucide-react';

export function CIDetailScreen({ onNavigate, onOpenDrawer }) {
  const confidenceScore = 91;

  const commits = [
    { sha: 'a3f21c9', msg: 'Bump stripe-js to v4.2.0', author: 'dependabot[bot]', isSuspect: true },
    { sha: '7b18e42', msg: 'Update checkout styling for mobile viewports', author: 'sarah.dev', isSuspect: false },
    { sha: '3d91c10', msg: 'Fix typo in email confirmation template', author: 'taimoor', isSuspect: false },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      
      {/* Back Button & Agent Metadata */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>&larr; Back to Reliability Feed</span>
        </button>

        <div className="flex items-center gap-2.5">
          <AgentBadge type="CI" size="sm" />
          <StatusPill status="Auto-Fix Proposed" />
        </div>
      </div>

      {/* Hero Header & Pipeline Metadata */}
      <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">PIPELINE RUN #482</span>
            <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/25 px-2 py-0.5 rounded font-mono">
              CI FAILED
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Build #482 failed &middot; <span className="font-serif italic font-normal text-amber-200/90">Dependency break</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono flex items-center gap-2">
            <span>Workflow: main-ci.yml</span>
            <span>&middot;</span>
            <span>Branch: main</span>
            <span>&middot;</span>
            <span>Provider: GitHub Actions</span>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.03] px-3.5 py-2 rounded-lg border border-white/[0.08] text-xs font-mono">
          <span className="text-neutral-500">Diagnosis:</span>
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">Dependency Break</span>
        </div>
      </div>

      {/* Main Grid: Left Logs & Commit Trace, Right Confidence Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Condensed Logs & Root-cause Commit Trace */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Condensed Log Excerpt */}
          <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-neutral-300" />
                <span>Truncated GitHub Actions Error Stream</span>
              </h2>
              <span className="text-[10px] font-mono text-neutral-500">HEAD &amp; TAIL PRESERVED</span>
            </div>

            <div className="bg-black border border-white/[0.08] rounded-lg p-3.5 font-mono text-xs text-neutral-400 space-y-1.5 overflow-x-auto">
              <div className="text-neutral-600">$ npm run test:ci</div>
              <div className="text-neutral-400">Running Playwright test suite against production build...</div>
              <div className="bg-rose-500/[0.08] text-rose-200 p-2.5 rounded border-l-2 border-rose-500/70 my-1">
                TypeError: loadStripe(...).createPaymentMethod is not a function<br/>
                &nbsp;&nbsp;at CheckoutModal.tsx:42:18<br/>
                &nbsp;&nbsp;Caused by: @stripe/stripe-js@4.2.0 breaking API signature
              </div>
              <div className="text-neutral-500">Tests completed: 41 passed, 1 failed (exit code 1)</div>
            </div>
          </div>

          {/* Root-cause Commit Trace */}
          <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-neutral-300" />
                <span>Root-Cause Commit Tracing</span>
              </h2>
              <span className="text-[11px] text-neutral-400 font-mono">10 Commits Evaluated</span>
            </div>

            <div className="space-y-2">
              {commits.map((c) => (
                <div 
                  key={c.sha} 
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors font-mono ${
                    c.isSuspect
                      ? 'bg-rose-500/[0.08] border-rose-500/25 text-rose-200'
                      : 'bg-white/[0.02] border-white/[0.06] text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-neutral-300">
                      {c.sha}
                    </span>
                    <span className={c.isSuspect ? 'font-medium text-white' : ''}>{c.msg}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] text-neutral-500">{c.author}</span>
                    {c.isSuspect && (
                      <span className="bg-rose-500/20 text-rose-300 text-[10px] font-semibold uppercase px-2 py-0.5 rounded border border-rose-500/30">
                        Suspect Commit
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Shared Confidence Dial & Evidence Trigger */}
        <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-6 flex flex-col items-center justify-between space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">ENGINE METRIC</span>
            <h2 className="text-sm font-semibold text-white tracking-tight">Confidence Score</h2>
            <p className="text-[11px] text-neutral-400 font-mono">Decision Threshold</p>
          </div>

          <ConfidenceDial
            score={confidenceScore}
            size={160}
            label="Confidence"
          />

          <button
            onClick={() => onOpenDrawer('CI')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white rounded-lg text-xs font-mono font-medium border border-white/[0.1] transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>View Evidence Telemetry &rarr;</span>
          </button>

          <div className="text-[11px] text-neutral-500 font-mono text-center leading-relaxed border-t border-white/[0.06] pt-3 w-full">
            Confidence score of <span className="font-semibold text-emerald-400">91%</span> exceeds the 85% threshold. Safe auto-fix PR is generated for human review.
          </div>
        </div>

      </div>

      {/* Decision Banner reflecting high confidence */}
      <div className="p-5 rounded-xl border bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">
              Confidence above threshold — auto-fix proposed.
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Isolated package regression in commit a3f21c9. Proposed fix pins @stripe/stripe-js back to 4.1.0.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('pr-review', { type: 'CI', score: confidenceScore })}
          className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-all self-start sm:self-auto"
        >
          Review Proposed Fix &rarr;
        </button>
      </div>

    </div>
  );
}
