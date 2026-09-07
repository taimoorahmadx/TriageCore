import React from 'react';
import { ConfidenceDial } from './ConfidenceDial';
import { AgentBadge } from './AgentBadge';
import { StatusPill } from './StatusPill';
import { ArrowLeft, GitCommit, AlertCircle, CheckCircle2, Terminal, Layers, Package, GitBranch } from 'lucide-react';

export function CIDetailScreen({ onNavigate, onOpenDrawer }) {
  const confidenceScore = 91;

  const commits = [
    { sha: 'a3f21c9', msg: 'Bump stripe-js to v4.2.0', author: 'dependabot[bot]', isSuspect: true },
    { sha: '7b18e42', msg: 'Update checkout styling for mobile viewports', author: 'sarah.dev', isSuspect: false },
    { sha: '3d91c10', msg: 'Fix typo in email confirmation template', author: 'taimoor', isSuspect: false },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">
      
      {/* Back Button & Agent Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reliability Feed</span>
        </button>

        <div className="flex items-center gap-2">
          <AgentBadge type="CI" />
          <StatusPill status="Auto-Fix Proposed" />
        </div>
      </div>

      {/* Title & Pipeline Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Build #482 failed</h1>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-semibold">
              PIPELINE FAILED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>Workflow: main-ci.yml</span>
            <span>·</span>
            <span>Branch: main</span>
            <span>·</span>
            <span>Provider: GitHub Actions</span>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-500">Diagnosis:</span>
          <span className="font-bold text-cyan-400 uppercase tracking-wider">Dependency Break</span>
        </div>
      </div>

      {/* Main Grid: Left Logs & Commit Trace, Right Confidence Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Condensed Logs & Root-cause Commit Trace */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Condensed Log Excerpt */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Truncated GitHub Actions Error Stream</span>
            </h2>

            <div className="bg-[#0A0E17] border border-slate-800/80 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-1 overflow-x-auto">
              <div className="text-slate-600">$ npm run test:ci</div>
              <div className="text-slate-400">Running Playwright test suite against production build...</div>
              <div className="bg-rose-950/40 text-rose-300 p-2 rounded border-l-2 border-rose-500 my-1">
                TypeError: loadStripe(...).createPaymentMethod is not a function<br/>
                &nbsp;&nbsp;at CheckoutModal.tsx:42:18<br/>
                &nbsp;&nbsp;Caused by: @stripe/stripe-js@4.2.0 breaking API signature
              </div>
              <div className="text-slate-500">Tests completed: 41 passed, 1 failed (exit code 1)</div>
            </div>
          </div>

          {/* Root-cause Commit Trace */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                <span>Root-Cause Commit Tracing</span>
              </h2>
              <span className="text-xs text-cyan-400 font-mono">Searched 10 PR Commits</span>
            </div>

            <div className="space-y-2">
              {commits.map((c) => (
                <div 
                  key={c.sha} 
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                    c.isSuspect
                      ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {c.sha}
                    </span>
                    <span className={c.isSuspect ? 'font-semibold text-white' : ''}>{c.msg}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] text-slate-500">{c.author}</span>
                    {c.isSuspect && (
                      <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-rose-500/40">
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-between space-y-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Shared Confidence Dial</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">ConfidenceEngine Decision Threshold</p>
          </div>

          {/* Same circular gauge component */}
          <ConfidenceDial
            score={confidenceScore}
            size={160}
            label="Confidence"
          />

          {/* Evidence Drawer Button */}
          <button
            onClick={() => onOpenDrawer('CI')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>View evidence breakdown →</span>
          </button>

          <div className="text-[11px] text-slate-500 text-center leading-relaxed">
            Confidence score of <span className="font-semibold text-emerald-400">91%</span> exceeds the 85% threshold. Safe auto-fix PR is generated for human review.
          </div>
        </div>

      </div>

      {/* Decision Banner reflecting high confidence */}
      <div className="p-5 rounded-xl border bg-emerald-950/40 border-emerald-800/80 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">Confidence above threshold — auto-fix proposed.</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Isolated package regression in commit a3f21c9. Proposed fix pins @stripe/stripe-js back to 4.1.0.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('pr-review', { type: 'CI', score: confidenceScore })}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors shadow-lg shadow-emerald-900/30"
        >
          Review Proposed Fix →
        </button>
      </div>

    </div>
  );
}
